import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSession } from "@/lib/api-protection";

export async function GET() {
    const { error } = await checkSession();
    if (error) return error;

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
    const { error } = await checkSession(["ADMIN", "STAFF"]);
    if (error) return error;

    try {
        const data = await req.json();

        // Validate required fields
        if (!data.name || !data.gps_id || !data.position) {
            return NextResponse.json({ error: "name, gps_id, and position are required" }, { status: 400 });
        }

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
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: "A player with this GPS ID already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: "Failed to create player" }, { status: 500 });
    }
}
