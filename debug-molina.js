const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const player = await prisma.player.findFirst({
        where: { name: { contains: 'Molina' } }
    });

    if (!player) {
        console.log("Player not found");
        return;
    }

    const wellness = await prisma.wellness.findMany({
        where: { playerId: player.id },
        orderBy: { date: 'desc' }
    });

    console.log("Player:", player.name);
    console.log("Wellness Records:", JSON.stringify(wellness, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
