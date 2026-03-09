import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST() {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Unlink users from players
            await tx.user.updateMany({
                data: { playerId: null }
            });

            // 2. Delete data that depends on players/sessions
            await tx.alert.deleteMany({});
            await tx.wellness.deleteMany({});

            // 3. Delete sessions (cascades to SessionData and Drill/DrillData)
            await tx.session.deleteMany({});

            // 4. Delete players
            await tx.player.deleteMany({});
        });

        return NextResponse.json({ message: "All data has been successfully deleted" });
    } catch (error: any) {
        console.error("Reset API Error:", error.message || error);
        return NextResponse.json(
            { error: error.message || "Failed to reset data" },
            { status: 500 }
        );
    }
}
