import prisma from "@/lib/prisma";
import { subDays, startOfDay, endOfDay } from "date-fns";

/**
 * Calculates the Acute to Chronic Workload Ratio (ACWR) for a specific player on a given date.
 * Acute = Rolling 7 days load average
 * Chronic = Rolling 28 days load average
 */
export async function calculateACWR(playerId: string, targetDate: Date) {
    const tDate = startOfDay(targetDate);
    const acuteStart = subDays(tDate, 6); // Last 7 days including target
    const chronicStart = subDays(tDate, 27); // Last 28 days including target

    // Fetch all sessions for chronic window
    const sessions = await prisma.sessionData.findMany({
        where: {
            playerId,
            session: {
                date: {
                    gte: chronicStart,
                    lte: endOfDay(tDate),
                }
            }
        },
        include: {
            session: true
        }
    });

    if (sessions.length === 0) return { acuteLoad: 0, chronicLoad: 0, acwr: 0 };

    // Calculate Loads
    let acuteTotal = 0;
    let chronicTotal = 0;

    for (const s of sessions) {
        const sDate = startOfDay(s.session.date);
        const load = s.player_load || 0;

        // Sum for chronic (all 28 days)
        chronicTotal += load;

        // Sum for acute (only last 7 days)
        if (sDate >= acuteStart) {
            acuteTotal += load;
        }
    }

    // Daily averages
    const acuteLoadAvg = acuteTotal / 7;
    const chronicLoadAvg = chronicTotal / 28;

    // ACWR Ratio
    const acwr = chronicLoadAvg > 0 ? (acuteLoadAvg / chronicLoadAvg) : 0;

    return {
        acuteLoadAvg: Math.round(acuteLoadAvg * 100) / 100,
        chronicLoadAvg: Math.round(chronicLoadAvg * 100) / 100,
        acwr: Math.round(acwr * 100) / 100,
        risk: acwr > 1.5 ? "HIGH" : acwr < 0.8 ? "LOW" : "OPTIMAL"
    };
}

/**
 * Recalculates ACWR and updates the Player's status field in the DB.
 */
export async function updatePlayerStatus(playerId: string, date: Date = new Date()) {
    const metrics = await calculateACWR(playerId, date);

    const player = await prisma.player.update({
        where: { id: playerId },
        data: {
            status: metrics.risk // Updates status to HIGH, OPTIMAL, or LOW
        }
    });

    // Check for alerts
    if (metrics.risk === "HIGH") {
        const { createAlert } = await import("@/lib/notifications/alerts");
        await createAlert(playerId, "ACWR_HIGH",
            `${player.name} has entered HIGH risk zone (ACWR: ${metrics.acwr}). Immediate workload reduction advised.`);
    }

    return metrics;
}
