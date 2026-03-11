import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

/**
 * Service to handle dispatching emails using Gmail SMTP (or similar).
 * Uses validated environment variables.
 */
export async function sendEmailNotification(subject: string, message: string) {
    try {
        const settings = await prisma.systemSettings.findMany();
        const emailAlertsEnabled = settings.find((s: any) => s.key === "email_alerts_enabled")?.value === "true";
        const targetEmail = settings.find((s: any) => s.key === "notification_email")?.value;

        if (!emailAlertsEnabled || !targetEmail) {
            logger.info({ targetEmail }, "[EMAIL-SKIP] Notifications disabled or no target email set.");
            return;
        }

        const gmailUser = env.GMAIL_USER;
        const gmailPass = env.GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailPass) {
            logger.warn("[EMAIL-ERROR] GMAIL_USER or GMAIL_APP_PASSWORD not set in environment.");
            return;
        }

        // Create or reuse transporter
        if (!cachedTransporter) {
            cachedTransporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: gmailUser,
                    pass: gmailPass,
                },
            });
        }

        // Send mail
        const info = await cachedTransporter.sendMail({
            from: `"LoadTrack Rugby" <${gmailUser}>`,
            to: targetEmail,
            subject: subject,
            text: message,
        });

        logger.info({ messageId: info.messageId, targetEmail }, "[EMAIL-SENT] notification sent successfully.");
        return true;
    } catch (err) {
        logger.error({ err }, "Failed to send email notification");
        return false;
    }
}
