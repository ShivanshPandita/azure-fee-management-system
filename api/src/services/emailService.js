/**
 * Email Notification Service for Fee Reminders
 * Supports SendGrid if configured, otherwise falls back to structured logging.
 */
async function sendFeeReminderEmail(student) {
    const balance = (Number(student.TotalFee) - Number(student.PaidAmount)).toFixed(2);
    const dueDateFormatted = new Date(student.DueDate).toISOString().slice(0, 10);

    const emailSubject = `URGENT: Outstanding Fee Reminder for ${student.Course}`;
    const emailBody = `
Dear ${student.Name},

This is an automated reminder that your tuition fee payment for ${student.Course} is currently OVERDUE.

Fee Summary:
------------------------------------------
Student ID:        ${student.StudentID}
Course:            ${student.Course}
Total Fee:         $${Number(student.TotalFee).toFixed(2)}
Amount Paid:       $${Number(student.PaidAmount).toFixed(2)}
Outstanding Dues:  $${balance}
Due Date:          ${dueDateFormatted}
------------------------------------------

Please make the payment as soon as possible to avoid administrative penalties.

Best regards,
University Finance Office
`;

    const sendGridKey = process.env.SENDGRID_API_KEY;

    if (sendGridKey && sendGridKey !== '') {
        // SendGrid API integration
        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sendGridKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: student.Email }] }],
                    from: { email: process.env.NOTIFICATION_FROM_EMAIL || 'fees@university.edu', name: 'University Finance' },
                    subject: emailSubject,
                    content: [{ type: 'text/plain', value: emailBody }]
                })
            });

            return { success: response.ok, provider: 'SendGrid' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    } else {
        // Local simulation / structured logging (ready for demo!)
        console.log(`\n================== [OUTGOING EMAIL DISPATCH] ==================`);
        console.log(`TO:      ${student.Email} (${student.Name})`);
        console.log(`SUBJECT: ${emailSubject}`);
        console.log(`BODY:\n${emailBody}`);
        console.log(`================================================================\n`);

        return { success: true, provider: 'MockEmailLogger' };
    }
}

module.exports = {
    sendFeeReminderEmail
};
