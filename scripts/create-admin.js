const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

dotenv.config();

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ Error: DATABASE_URL no encontrada en el archivo .env");
        process.exit(1);
    }

    console.log("⏳ Conectando a Supabase...");
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const email = 'staff@rugby.com';
        const password = 'rugby2026';
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                role: 'ADMIN',
                name: 'Administrador'
            },
            create: {
                email,
                password: hashedPassword,
                role: 'ADMIN',
                name: 'Administrador'
            }
        });

        console.log('\n✅ ¡Usuario Administrador creado/actualizado con éxito!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}\n`);

    } catch (error) {
        console.error('\n❌ Error fatal al crear el usuario:', error);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
