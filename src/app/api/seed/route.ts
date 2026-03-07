import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function GET() {
    try {
        const existingAdmin = await prisma.user.findUnique({
            where: { email: "admin@loadtrack.com" }
        });

        if (existingAdmin) {
            return NextResponse.json({ message: "Admin user already exists" });
        }

        const hashedPassword = await bcrypt.hash("admin123", 10);

        const user = await prisma.user.create({
            data: {
                email: "admin@loadtrack.com",
                name: "Admin User",
                password: hashedPassword,
                role: "ADMIN"
            }
        });

        return NextResponse.json({ message: "Admin user seeded successfully", userId: user.id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to seed user" }, { status: 500 });
    }
}
