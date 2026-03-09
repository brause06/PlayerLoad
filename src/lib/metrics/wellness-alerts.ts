import prisma from "@/lib/prisma";

/**
 * Checks for wellness-based streaks and creates alerts.
 * - LOW_SLEEP_STREAK: Sleep quality < 3 for 3 consecutive days.
 * - HIGH_FATIGUE_STREAK: Fatigue > 7 for 3 consecutive days.
 */
export async function checkWellnessAlerts(playerId: string) {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return;

    // Fetch last 3 wellness records
    const lastWellness = await prisma.wellness.findMany({
        where: { playerId },
        orderBy: { date: 'desc' },
        take: 3
    });

    if (lastWellness.length < 3) return;

    const { createAlert } = await import("@/lib/notifications/alerts");

    // 1. Sleep Streak Check (Scale 1-10, where 1 is Bad)
    const lowSleepStreak = lastWellness.every((w: any) => w.sleep < 4); // Threshold < 4 (e.g., 1, 2, 3)

    if (lowSleepStreak) {
        await createAlert(playerId, "LOW_SLEEP_STREAK",
            `${player.name} has reported poor sleep quality for 3 consecutive days. Monitoring suggested.`);
    }

    // 2. Fatigue Streak Check (Scale 1-10, where 10 is Bad/Very fatigued)
    const highFatigueStreak = lastWellness.every((w: any) => w.fatigue >= 8); // Threshold >= 8

    if (highFatigueStreak) {
        await createAlert(playerId, "HIGH_FATIGUE_STREAK",
            `${player.name} has reported high fatigue levels for 3 consecutive days. Risk of overtraining detected.`);
    }
}
