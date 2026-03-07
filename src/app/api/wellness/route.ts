import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { startOfDay } from "date-fns";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only actual players have a playerId assigned to their user
        const sessionUser = session.user as any;
        if (sessionUser.role !== "PLAYER" || !sessionUser.playerId) {
            return NextResponse.json(
                { error: "Only players can submit wellness data" },
                { status: 403 }
            );
        }

        const {
            sleep,
            sleepHours,
            stress,
            fatigue,
            muscleSoreness,
            statusScore,
            jointPain,
        } = await req.json();

        // Basic Validation
        if (
            sleep < 1 || sleep > 10 ||
            stress < 1 || stress > 10 ||
            fatigue < 1 || fatigue > 10 ||
            muscleSoreness < 1 || muscleSoreness > 10 ||
            statusScore < 1 || statusScore > 10 ||
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
                stress,
                fatigue,
                muscleSoreness,
                statusScore,
                jointPain,
            },
            create: {
                playerId: sessionUser.playerId,
                date: today,
                sleep,
                sleepHours,
                stress,
                fatigue,
                muscleSoreness,
                statusScore,
                jointPain,
            },
        });

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
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionUser = session.user as any;
        if (sessionUser.role !== "PLAYER" || !sessionUser.playerId) {
            return NextResponse.json(
                { error: "Only players can fetch wellness data" },
                { status: 403 }
            );
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
