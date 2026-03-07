import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    const player = await prisma.player.findFirst({
        where: { top_speed_max: { gt: 0 } },
        orderBy: { top_speed_max: 'desc' }
    });

    if (!player) return;

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

    console.log("Created/Updated player@loadtrack.com with password 'password123'");
}

main().finally(() => prisma.$disconnect());
