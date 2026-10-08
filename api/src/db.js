const sql = require('mssql');

let pool = null;

async function getDbPool() {
    if (pool) {
        return pool;
    }

    const connectionString = process.env.SqlConnectionString;
    if (!connectionString) {
        throw new Error('SqlConnectionString is not configured in environment variables.');
    }

    pool = await sql.connect(connectionString);
    return pool;
}

module.exports = {
    getDbPool,
    sql
};
