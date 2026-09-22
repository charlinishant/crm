const prisma = require('../lib/prisma');

async function main() {
  // Expire stale ringing inbound calls
  const ringingRes = await prisma.callLog.updateMany({
    where: {
      direction: 'inbound',
      status: { in: ['initiating', 'initiated', 'queued', 'calling', 'ringing'] }
    },
    data: {
      status: 'missed',
      endedAt: new Date(),
      notes: 'Cleaned up stale inbound ringing call'
    }
  });
  console.log('Cleaned stale inbound calls:', ringingRes.count);

  // Expire stale initiated outbound calls older than 5 minutes
  const staleOutboundRes = await prisma.callLog.updateMany({
    where: {
      status: { in: ['initiating', 'initiated', 'queued', 'calling', 'ringing'] },
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }
    },
    data: {
      status: 'canceled',
      endedAt: new Date(),
      notes: 'Cleaned up stale outbound call'
    }
  });
  console.log('Cleaned stale outbound calls:', staleOutboundRes.count);

  // Expire ancient connected calls
  const ancientConnectedRes = await prisma.callLog.updateMany({
    where: {
      status: { in: ['connected', 'in-progress'] },
      createdAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
    },
    data: {
      status: 'completed',
      endedAt: new Date()
    }
  });
  console.log('Cleaned ancient connected calls:', ancientConnectedRes.count);
}

main().finally(() => prisma.$disconnect());
