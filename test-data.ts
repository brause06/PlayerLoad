import prisma from './src/lib/prisma';

async function main() {
  const sessions = await prisma.session.findMany({
    include: {
      data: true,
      drills: true
    }
  });
  
  for (const s of sessions) {
    console.log(`Session: ${s.date.toISOString()} | Players: ${s.data.length} | Drills: ${s.drills.length}`);
  }
}
main();
