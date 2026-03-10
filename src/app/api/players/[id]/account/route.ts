import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSession } from "@/lib/api-protection";
import bcrypt from "bcrypt";

export async function POST(request: Request, context: any) {
    const { id: playerId } = await context.params;

    const { error, session } = await checkSession(["ADMIN", "STAFF"]);
    if (error) return error;

    try {
        const { email } = await request.json();

        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "Vaild email is required" }, { status: 400 });
        }

        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: { user: true }
        });

        if (!player) {
            return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        // Check if email is already taken by another user
        const existingUserWithEmail = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUserWithEmail && existingUserWithEmail.playerId !== playerId) {
            return NextResponse.json({ error: "Email is already in use by another account" }, { status: 400 });
        }

        const defaultPassword = "rugby2026";
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        if (player.user) {
            // Update existing user email
            const updatedUser = await prisma.user.update({
                where: { id: player.user.id },
                data: {
                    email,
                    name: player.name // Keep name synced
                }
            });
            return NextResponse.json({ message: "Account email updated", user: updatedUser });
        } else {
            // Create new user record
            const newUser = await prisma.user.create({
                data: {
                    email,
                    name: player.name,
                    password: hashedPassword,
                    role: "PLAYER",
                    playerId: player.id
                }
            });
            return NextResponse.json({ message: "Player account created successfully", user: newUser });
        }
    } catch (error: any) {
        console.error("Account management error:", error);
        return NextResponse.json({ error: error.message || "Failed to manage player account" }, { status: 500 });
    }
}

// GET player account status
export async function GET(request: Request, context: any) {
    const { id: playerId } = await context.params;

    const { error } = await checkSession(["ADMIN", "STAFF"]);
    if (error) return error;

    try {
        const user = await prisma.user.findUnique({
            where: { playerId }
        });

        return NextResponse.json({
            hasAccount: !!user,
            email: user?.email || null,
            role: user?.role || null
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch account status" }, { status: 500 });
    }
}
