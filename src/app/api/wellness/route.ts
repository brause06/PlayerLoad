import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startOfDay } from "date-fns";
import { checkSession } from "@/lib/api-protection";

export async function POST(req: Request) {
    try {
        const { error, session } = await checkSession(["PLAYER"]);
        if (error) return error;

        const sessionUser = session!.user as any;
        if (!sessionUser.playerId) {
            return NextResponse.json({ error: "User is not linked to a player profile" }, { status: 400 });
        }

        const {
            sleep,
            sleepHours,
            energy,
            stress,
            fatigue,
            muscleSoreness,
            statusScore,
            comments,
            jointPainMap,
            musclePainMap
        } = await req.json();

        // Basic Validation
        if (
            sleep < 1 || sleep > 10 ||
            stress < 1 || stress > 10 ||
            fatigue < 1 || fatigue > 10 ||
            muscleSoreness < 1 || muscleSoreness > 10 ||
            energy < 1 || energy > 10 ||
            sleepHours < 0 || sleepHours > 24
        ) {
            return NextResponse.json(
                { error: "Metrics must be between 1 and 10 (sleepHours 0-24)" },
                { status: 400 }
            );
        }

        const today = startOfDay(new Date());

        // Upsert the wellness record so players can correct a mistake made today
        const wellnessRecord = await prisma.wellness.upsert({
            where: {
                playerId_date: {
                    playerId: sessionUser.playerId,
                    date: today,
                },
            },
            update: {
                sleep,
                sleepHours,
                energy,
                stress,
                fatigue,
                muscleSoreness,
                statusScore,
                comments,
                jointPainMap,
                musclePainMap
            },
            create: {
                playerId: sessionUser.playerId,
                date: today,
                sleep,
                sleepHours,
                energy,
                stress,
                fatigue,
                muscleSoreness,
                statusScore,
                comments,
                jointPainMap,
                musclePainMap
            },
        });

        // --- Automate Status/Alert Updates ---
        const { checkWellnessAlerts } = await import("@/lib/metrics/wellness-alerts");
        await checkWellnessAlerts(sessionUser.playerId);

        return NextResponse.json({ success: true, record: wellnessRecord }, { status: 200 });
    } catch (error) {
        console.error("Error saving wellness:", error);
        return NextResponse.json(
            { error: "Failed to save wellness data" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const { error, session } = await checkSession(["PLAYER"]);
        if (error) return error;

        const sessionUser = session!.user as any;
        if (!sessionUser.playerId) {
            return NextResponse.json({ error: "User is not linked to a player profile" }, { status: 400 });
        }

        const today = startOfDay(new Date());

        const wellnessRecord = await prisma.wellness.findUnique({
            where: {
                playerId_date: {
                    playerId: sessionUser.playerId,
                    date: today,
                },
            },
        });

        if (wellnessRecord) {
            return NextResponse.json({ hasSubmitted: true, record: wellnessRecord }, { status: 200 });
        } else {
            return NextResponse.json({ hasSubmitted: false }, { status: 200 });
        }

    } catch (error) {
        console.error("Error fetching wellness:", error);
        return NextResponse.json(
            { error: "Failed to fetch wellness data" },
            { status: 500 }
        );
    }
}
