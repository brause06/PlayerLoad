import prisma from './src/lib/prisma';

async function main() {
  const sessions = await prisma.session.findMany({
    include: {
      drills: {
        include: {
          data: true
        }
      }
    }
  });
  
  for (const s of sessions) {
    console.log(`Session: ${s.date.toISOString()} | Drills: ${s.drills.length}`);
    for (const d of s.drills) {
        console.log(`  Drill: ${d.name} | Data points: ${d.data.length}`);
    }
  }
}
main();
