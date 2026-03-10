import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ Error: DATABASE_URL no encontrada en el archivo .env");
        process.exit(1);
    }

    // Usar el mismo adaptador que en la app para evitar errores de inicialización
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
