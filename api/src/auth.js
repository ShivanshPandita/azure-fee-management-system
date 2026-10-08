const { getDbPool, sql } = require('./db');

/**
 * Extracts caller identity and verifies RBAC against dbo.Administrators.
 * Supports:
 *   1. Bearer JWT tokens (parses standard 'upn' or 'email' or 'preferred_username' claim)
 *   2. Azure EasyAuth header: 'x-ms-client-principal-name'
 *   3. Custom dev header: 'x-admin-email' (for quick local CLI testing)
 */
async function authorizeAdmin(request, requiredRoles = ['FinanceAdmin', 'SuperAdmin']) {
    let callerEmail = null;

    const authHeader = request.headers.get('authorization');
    const easyAuthHeader = request.headers.get('x-ms-client-principal-name');
    const devEmailHeader = request.headers.get('x-admin-email');

    if (easyAuthHeader) {
        callerEmail = easyAuthHeader;
    } else if (devEmailHeader) {
        callerEmail = devEmailHeader;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        try {
            // Decode the payload of the JWT (without external library dependencies)
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                callerEmail = payload.email || payload.upn || payload.preferred_username || payload.sub;
            }
        } catch (e) {
            return { isAuthorized: false, status: 401, error: 'Invalid Bearer token format.' };
        }
    }

    if (!callerEmail) {
        return {
            isAuthorized: false,
            status: 401,
            error: 'Authentication required. Missing Authorization Bearer token or client identity.'
        };
    }

    // RBAC verification against dbo.Administrators in Azure SQL
    const pool = await getDbPool();
    const result = await pool.request()
        .input('Email', sql.NVarChar(100), callerEmail)
        .query(`
            SELECT AdminID, Name, Email, Role, IsActive 
            FROM dbo.Administrators 
            WHERE Email = @Email AND IsActive = 1
        `);

    if (result.recordset.length === 0) {
        return {
            isAuthorized: false,
            status: 403,
            error: `Access denied. The identity '${callerEmail}' is not a registered or active administrator.`
        };
    }

    const admin = result.recordset[0];
    if (requiredRoles.length > 0 && !requiredRoles.includes(admin.Role)) {
        return {
            isAuthorized: false,
            status: 403,
            error: `Access denied. Role '${admin.Role}' does not have sufficient privileges.`
        };
    }

    return {
        isAuthorized: true,
        admin: admin
    };
}

module.exports = {
    authorizeAdmin
};
