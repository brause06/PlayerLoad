import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting bulk user creation for all unlinked players...");

    // Find all players that don't have a linked user account yet
    const unlinkedPlayers = await prisma.player.findMany({
        where: {
            user: null
        }
    });

    if (unlinkedPlayers.length === 0) {
        console.log("✅ All players already have linked User accounts.");
        return;
    }

    console.log(`Found ${unlinkedPlayers.length} players needing accounts. Generating...`);

    const defaultPassword = "password123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    let successCount = 0;
    const credentialsList = [];

    for (const player of unlinkedPlayers) {
        // Generate a simple email based on their name: "Alejandro Molina" -> "alejandro.molina@loadtrack.com"
        const cleanName = player.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let email = `${cleanName}@loadtrack.com`;

        // Handle duplicate names just in case
        let emailExists = await prisma.user.findUnique({ where: { email } });
        let counter = 1;
        while (emailExists) {
            email = `${cleanName}${counter}@loadtrack.com`;
            emailExists = await prisma.user.findUnique({ where: { email } });
            counter++;
        }

        try {
            await prisma.user.create({
                data: {
                    name: player.name,
                    email: email,
                    password: hashedPassword,
                    role: "PLAYER",
                    playerId: player.id // Link the accounts
                }
            });
            credentialsList.push(`Email: ${email} | Pass: ${defaultPassword} | Name: ${player.name}`);
            successCount++;
        } catch (error) {
            console.error(`Failed to create user for ${player.name}:`, error);
        }
    }

    // Find the generic player@loadtrack.com and see who it is linked to
    const genericPlayer = await prisma.user.findUnique({
        where: { email: "player@loadtrack.com" },
        include: { player: true }
    });

    if (genericPlayer && !genericPlayer.playerId) {
        // Find Alejandro specifically to link to player@loadtrack.com so the user's current login works as Alejandro
        const alejandro = await prisma.player.findFirst({
            where: { name: { contains: "Molina" } } // "Alejandro Molina"
        });

        if (alejandro) {
            // Unlink Alejandro's newly generated account if he just got one, and give him player@loadtrack.com instead
            await prisma.user.deleteMany({
                where: { playerId: alejandro.id }
            });

            await prisma.user.update({
                where: { email: "player@loadtrack.com" },
                data: {
                    playerId: alejandro.id,
                    name: "Alejandro Molina"
                }
            });
            console.log(`\n✅ Linked generic 'player@loadtrack.com' to Alejandro Molina.`);
        }
    } else if (genericPlayer && genericPlayer.player) {
        console.log(`\nℹ️ 'player@loadtrack.com' is already linked to: ${genericPlayer.player.name}`);
    }

    console.log(`\n🎉 Successfully created ${successCount} new player accounts!`);
    console.log(`\n--- Player Credentials ---`);
    credentialsList.forEach(c => console.log(c));
    console.log(`--------------------------`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
