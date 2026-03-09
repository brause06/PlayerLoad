import prisma from "@/lib/prisma";
import { sendEmailNotification } from "./email";

/**
 * Creates an alert in the database and dispatches an email if necessary.
 * Prevents duplicates by checking for unread alerts of the same type for the player.
 */
export async function createAlert(playerId: string, type: string, message: string) {
    try {
        const player = await prisma.player.findUnique({ where: { id: playerId } });
        if (!player) return;

        // Check if an unread alert already exists to prevent spam
        const existingAlert = await prisma.alert.findFirst({
            where: {
                playerId,
                type,
                read: false
            }
        });

        if (existingAlert) {
            console.log(`[ALERT-SKIP] Unread alert of type ${type} already exists for ${player.name}`);
            return;
        }

        // Create the alert in DB
        const alert = await prisma.alert.create({
            data: {
                playerId,
                type,
                message
            }
        });

        console.log(`[ALERT-CREATED] ${type} for ${player.name}: ${message}`);

        // Dispatch email notification
        await sendEmailNotification(
            `[LOADTRACK] ${type} Alert: ${player.name}`,
            message
        );

        return alert;
    } catch (err) {
        console.error("Error creating alert:", err);
    }
}
