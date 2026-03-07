import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function GET() {
    try {
        const player = await prisma.player.findFirst({
            where: { name: { contains: 'Alejandro Molina', mode: 'insensitive' } }
        });

        if (!player) {
            return NextResponse.json({ error: "No players available" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash("password123", 10);

        await prisma.user.upsert({
            where: { email: "player@loadtrack.com" },
            update: { role: "PLAYER", playerId: player.id, password: hashedPassword },
            create: {
                email: "player@loadtrack.com",
                name: "Test Player",
                role: "PLAYER",
                playerId: player.id,
                password: hashedPassword
            }
        });

        return NextResponse.json({ success: true, email: "player@loadtrack.com", password: "password123" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
