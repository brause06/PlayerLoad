import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const players = await prisma.player.findMany({
            orderBy: { name: "asc" }
        });
        return NextResponse.json(players);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const player = await prisma.player.create({
            data: {
                name: data.name,
                gps_id: data.gps_id,
                position: data.position,
                age: data.age ? parseInt(data.age) : null,
                weight: data.weight ? parseFloat(data.weight) : null,
                team: data.team,
                top_speed_max: data.top_speed_max ? parseFloat(data.top_speed_max) : null,
            }
        });
        return NextResponse.json(player);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create player" }, { status: 500 });
    }
}
