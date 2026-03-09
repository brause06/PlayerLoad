import prisma from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

/**
 * Checks if a player has maintained their hamstring health by reaching 90%+ of their max speed 
 * at least once in the last 10 days.
 */
export async function checkSpeedMaintenanceAlert(playerId: string) {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || !player.top_speed_max || player.top_speed_max === 0) return;

    const thresholdPercent = 90; // Default 90%
    const targetSpeed = player.top_speed_max * (thresholdPercent / 100);
    const tenDaysAgo = startOfDay(subDays(new Date(), 9));

    // Check sessions in the last 10 days
    const recentHighSpeedSessions = await prisma.sessionData.findMany({
        where: {
            playerId,
            top_speed: { gte: targetSpeed },
            session: {
                date: { gte: tenDaysAgo }
            }
        },
        take: 1
    });

    if (recentHighSpeedSessions.length === 0) {
        const { createAlert } = await import("@/lib/notifications/alerts");
        await createAlert(playerId, "TOP_SPEED_MAINTENANCE",
            `${player.name} has not reached 90% of max speed in the last 10 days. Hamstring priming session recommended.`);
    }
}
