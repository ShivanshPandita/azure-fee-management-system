const { app } = require('@azure/functions');
const { getDbPool, sql } = require('../db');
const { sendFeeReminderEmail } = require('../services/emailService');

app.http('sendFeeReminders', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'notifications/send-reminders',
    handler: async (request, context) => {
        context.log('[AUTOMATION] Executing overdue fee reminders workflow...');

        try {
            const pool = await getDbPool();

            // 1. Fetch overdue students who haven't received a reminder today
            const queryResult = await pool.request().query(`
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
                WHERE DueDate < CAST(SYSUTCDATETIME() AS DATE)
                  AND PaidAmount < TotalFee
                  AND (LastReminderSentUtc IS NULL OR DATEDIFF(day, LastReminderSentUtc, SYSUTCDATETIME()) >= 1)
            `);

            const overdueStudents = queryResult.recordset;
            context.log(`[AUTOMATION] Found ${overdueStudents.length} overdue students requiring notification.`);

            if (overdueStudents.length === 0) {
                return {
                    status: 200,
                    jsonBody: {
                        message: 'No overdue students require reminders at this time.',
                        remindersSent: 0
                    }
                };
            }

            const results = [];
            const notifiedStudentIds = [];

            // 2. Dispatch reminder emails
            for (const student of overdueStudents) {
                const sendResult = await sendFeeReminderEmail(student);
                results.push({
                    studentId: student.StudentID,
                    name: student.Name,
                    email: student.Email,
                    outstandingBalance: Number(student.TotalFee) - Number(student.PaidAmount),
                    dueDate: new Date(student.DueDate).toISOString().slice(0, 10),
                    dispatched: sendResult.success,
                    provider: sendResult.provider
                });

                if (sendResult.success) {
                    notifiedStudentIds.push(student.StudentID);
                }
            }

            // 3. Update LastReminderSentUtc in Azure SQL for all notified students
            if (notifiedStudentIds.length > 0) {
                // Parameterized list update
                const idList = notifiedStudentIds.map(id => `'${id}'`).join(',');
                await pool.request().query(`
                    UPDATE dbo.Students
                    SET LastReminderSentUtc = SYSUTCDATETIME()
                    WHERE StudentID IN (${idList})
                `);
            }

            return {
                status: 200,
                jsonBody: {
                    message: `Overdue reminders workflow completed successfully.`,
                    totalEvaluated: overdueStudents.length,
                    remindersSent: notifiedStudentIds.length,
                    details: results
                }
            };
        } catch (error) {
            context.error('[AUTOMATION ERROR] Failed to execute fee reminders:', error);
            return {
                status: 500,
                jsonBody: { error: 'Internal Server Error during reminder execution.' }
            };
        }
    }
});
