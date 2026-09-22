const prisma = require('../lib/prisma');

async function main() {
  const activeCalls = await prisma.callLog.findMany({
    where: {
      status: { in: ["initiating", "initiated", "queued", "calling", "ringing", "connected", "in-progress"] }
    },
    select: {
      id: true,
      direction: true,
      status: true,
      agentId: true,
      phone: true,
      startedAt: true,
      createdAt: true
    }
  });
  console.log('All active calls in DB:', JSON.stringify(activeCalls, null, 2));
}

main().finally(() => prisma.$disconnect());
