import prisma from "./src/lib/prisma";
import bcrypt from "bcrypt";
async function main() {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const user = await prisma.user.upsert({
        where: { email: "admin@loadtrack.com" },
        update: { password: hashedPassword },
        create: {
            email: "admin@loadtrack.com",
            name: "Admin User",
            password: hashedPassword,
            role: "ADMIN"
        }
    });
    console.log("Created user: " + user.email);
}
main().catch(console.error).finally(() => prisma.$disconnect());
