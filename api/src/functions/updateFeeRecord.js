const { app } = require('@azure/functions');
const { getDbPool, sql } = require('../db');
const { authorizeAdmin } = require('../auth');

app.http('updateFeeRecord', {
    methods: ['PATCH', 'POST'],
    authLevel: 'anonymous',
    route: 'manage/students/{studentId}/fee',
    handler: async (request, context) => {
        const studentId = request.params.studentId;
        context.log(`[ADMIN] Update request for StudentID: ${studentId}`);

        // 1. RBAC Check (Task 4 requirement)
        const authResult = await authorizeAdmin(request, ['FinanceAdmin', 'SuperAdmin']);
        if (!authResult.isAuthorized) {
            return {
                status: authResult.status,
                jsonBody: { error: authResult.error }
            };
        }

        const admin = authResult.admin;
        context.log(`[ADMIN] Authorized: ${admin.Name} (${admin.Role})`);

        // 2. Parse request body
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return {
                status: 400,
                jsonBody: { error: 'Invalid JSON request body.' }
            };
        }

        const { paymentAmount, totalFee, dueDate } = body;

        if (paymentAmount === undefined && totalFee === undefined && dueDate === undefined) {
            return {
                status: 400,
                jsonBody: { error: 'At least one field (paymentAmount, totalFee, or dueDate) must be provided.' }
            };
        }

        try {
            const pool = await getDbPool();

            // Fetch current student record
            const currentResult = await pool.request()
                .input('StudentID', sql.VarChar(20), studentId)
                .query(`SELECT StudentID, Name, TotalFee, PaidAmount, DueDate FROM dbo.Students WHERE StudentID = @StudentID`);

            if (currentResult.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: `Student '${studentId}' was not found.` }
                };
            }

            const current = currentResult.recordset[0];
            let newPaidAmount = Number(current.PaidAmount);
            let newTotalFee = totalFee !== undefined ? Number(totalFee) : Number(current.TotalFee);
            let newDueDate = dueDate !== undefined ? dueDate : new Date(current.DueDate).toISOString().slice(0, 10);

            if (paymentAmount !== undefined) {
                const addAmount = Number(paymentAmount);
                if (isNaN(addAmount) || addAmount <= 0) {
                    return { status: 400, jsonBody: { error: 'paymentAmount must be a positive number.' } };
                }
                newPaidAmount += addAmount;
                if (newPaidAmount > newTotalFee) {
                    return {
                        status: 400,
                        jsonBody: { error: `Payment amount exceeds total fee. Max payable: ${newTotalFee - Number(current.PaidAmount)}` }
                    };
                }
            }

            // Update record in Azure SQL
            await pool.request()
                .input('StudentID', sql.VarChar(20), studentId)
                .input('TotalFee', sql.Decimal(10, 2), newTotalFee)
                .input('PaidAmount', sql.Decimal(10, 2), newPaidAmount)
                .input('DueDate', sql.Date, newDueDate)
                .query(`
                    UPDATE dbo.Students
                    SET TotalFee = @TotalFee,
                        PaidAmount = @PaidAmount,
                        DueDate = @DueDate,
                        UpdatedAtUtc = SYSUTCDATETIME()
                    WHERE StudentID = @StudentID
                `);

            // Compute updated payment status
            const today = new Date().toISOString().slice(0, 10);
            let paymentStatus = 'Unpaid';
            if (newPaidAmount >= newTotalFee) {
                paymentStatus = 'Paid';
            } else if (newDueDate < today) {
                paymentStatus = 'Overdue';
            } else if (newPaidAmount > 0) {
                paymentStatus = 'Partially Paid';
            }

            return {
                status: 200,
                jsonBody: {
                    message: 'Fee record successfully updated by admin.',
                    updatedBy: {
                        adminId: admin.AdminID,
                        adminName: admin.Name,
                        role: admin.Role
                    },
                    student: {
                        studentId: studentId,
                        name: current.Name,
                        totalFee: newTotalFee,
                        paidAmount: newPaidAmount,
                        remainingBalance: Math.max(0, newTotalFee - newPaidAmount),
                        dueDate: newDueDate,
                        paymentStatus: paymentStatus
                    }
                }
            };
        } catch (error) {
            context.error('Database error updating fee record:', error);
            return {
                status: 500,
                jsonBody: { error: 'Internal Server Error while updating fee record.' }
            };
        }
    }
});
