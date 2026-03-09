import prisma from "@/lib/prisma";

/**
 * Calculates a weighted Readiness score (1-10) for a wellness record.
 * Uses weights from system settings if available.
 */
export async function calculateWeightedReadiness(wellness: any) {
    const settings = await prisma.systemSettings.findMany();

    const wSleep = parseInt(settings.find((s: any) => s.key === "weight_sleep")?.value || "3", 10);
    const wEnergy = parseInt(settings.find((s: any) => s.key === "weight_energy")?.value || "2", 10);
    const wFatigue = parseInt(settings.find((s: any) => s.key === "weight_fatigue")?.value || "2", 10);
    const wSoreness = parseInt(settings.find((s: any) => s.key === "weight_soreness")?.value || "3", 10);
    const wStress = parseInt(settings.find((s: any) => s.key === "weight_stress")?.value || "2", 10);

    const totalWeight = wSleep + wEnergy + wFatigue + wSoreness + wStress;

    // Wellness metrics are 1-10 
    // Normalize: 10 is always "Perfect"
    const sleepScore = wellness.sleep; // 10 is Good
    const energyScore = wellness.energy || 5; // 10 is Good
    const fatigueScore = 11 - wellness.fatigue; // 1 is Good -> 10 is Good
    const sorenessScore = 11 - wellness.muscleSoreness; // 1 is Good -> 10 is Good
    const stressScore = 11 - wellness.stress; // 1 is Good -> 10 is Good

    const weightedSum =
        (sleepScore * wSleep) +
        (energyScore * wEnergy) +
        (fatigueScore * wFatigue) +
        (sorenessScore * wSoreness) +
        (stressScore * wStress);

    const readiness = weightedSum / totalWeight;

    return Math.round(readiness * 10) / 10;
}
