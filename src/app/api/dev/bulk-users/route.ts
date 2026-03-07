import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    const users = await prisma.user.findMany({
        where: { role: "PLAYER" },
        include: { player: true }
    });

    const rosterAuth = users.map(u => {
        if (u.player) {
            return `${u.player.name} -> Email: ${u.email}`;
        }
        return `Unlinked User -> Email: ${u.email}`;
    });

    return NextResponse.json({ rosterAuth });
}
