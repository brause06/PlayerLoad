import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);

export async function POST(request: Request, context: any) {
    const { id } = await context.params;

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${id}-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const uploadDir = path.join(process.cwd(), "public/uploads/players");

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        const imageUrl = `/uploads/players/${filename}`;

        const updatedPlayer = await prisma.player.update({
            where: { id },
            data: {
                imageUrl: imageUrl,
            },
        });

        return NextResponse.json(updatedPlayer);
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
}
