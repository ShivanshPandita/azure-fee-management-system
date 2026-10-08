const { app } = require('@azure/functions');
const { getDbPool, sql } = require('../db');

app.http('getFeeStatus', {
    methods: ['GET'],
    authLevel: 'anonymous', // We will secure this with APIM (Subscription keys & rate limiting) in Task 3.2
    route: 'students/{studentId}/fee-status',
    handler: async (request, context) => {
        const studentId = request.params.studentId;
        context.log(`[HTTP GET] Fetching fee status for StudentID: ${studentId}`);

        if (!studentId) {
            return {
                status: 400,
                jsonBody: { error: 'StudentID is required in the path.' }
            };
        }

        try {
            const pool = await getDbPool();
            const result = await pool.request()
                .input('StudentID', sql.VarChar(20), studentId)
                .query(`
                    SELECT 
                        StudentID,
                        Name,
                        Email,
                        Course,
                        TotalFee,
                        PaidAmount,
                        DueDate,
                        LastReminderSentUtc
                    FROM dbo.Students
                    WHERE StudentID = @StudentID
                `);

            if (result.recordset.length === 0) {
                return {
                    status: 404,
                    jsonBody: { error: `Student with ID '${studentId}' was not found.` }
                };
            }

            const student = result.recordset[0];
            const totalFee = Number(student.TotalFee);
            const paidAmount = Number(student.PaidAmount);
            const remainingBalance = Math.max(0, totalFee - paidAmount);

            // Compute payment status logic
            const today = new Date().toISOString().slice(0, 10);
            const dueDateStr = new Date(student.DueDate).toISOString().slice(0, 10);

            let paymentStatus = 'Unpaid';
            if (paidAmount >= totalFee) {
                paymentStatus = 'Paid';
            } else if (dueDateStr < today) {
                paymentStatus = 'Overdue';
            } else if (paidAmount > 0) {
                paymentStatus = 'Partially Paid';
            }

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    studentId: student.StudentID,
                    name: student.Name,
                    email: student.Email,
                    course: student.Course,
                    totalFee: totalFee,
                    paidAmount: paidAmount,
                    remainingBalance: remainingBalance,
                    dueDate: dueDateStr,
                    paymentStatus: paymentStatus,
                    lastReminderSentUtc: student.LastReminderSentUtc
                }
            };
        } catch (error) {
            context.error(`Error querying database for student ${studentId}:`, error);
            return {
                status: 500,
                jsonBody: { error: 'Internal Server Error while querying fee status.' }
            };
        }
    }
});
