import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

/**
 * Service to handle dispatching emails using Gmail SMTP.
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD environment variables.
 */
export async function sendEmailNotification(subject: string, message: string) {
    try {
        const settings = await prisma.systemSettings.findMany();
        const emailAlertsEnabled = settings.find(s => s.key === "email_alerts_enabled")?.value === "true";
        const targetEmail = settings.find(s => s.key === "notification_email")?.value;

        if (!emailAlertsEnabled || !targetEmail) {
            console.log(`[EMAIL-SKIP] Notifications disabled or no target email set. Target: ${targetEmail}`);
            return;
        }

        const gmailUser = process.env.GMAIL_USER;
        const gmailPass = process.env.GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailPass) {
            console.warn("[EMAIL-ERROR] GMAIL_USER or GMAIL_APP_PASSWORD not set in environment.");
            return;
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        // Send mail
        const info = await transporter.sendMail({
            from: `"LoadTrack Rugby" <${gmailUser}>`,
            to: targetEmail,
            subject: subject,
            text: message,
        });

        console.log(`[EMAIL-SENT] Message sent: ${info.messageId} | Target: ${targetEmail}`);
        return true;
    } catch (err) {
        console.error("Failed to send email notification:", err);
        return false;
    }
}
