const prisma = require("../lib/prisma");

async function check() {
  try {
    const lead = await prisma.lead.findFirst();
    console.log("Lead columns in DB:", Object.keys(lead || {}));
    const cps = await prisma.user.findMany({
      where: { role: "CHANNEL_PARTNER" },
      select: { id: true, firstName: true, lastName: true, username: true, reraNumber: true, phone: true }
    });
    console.log("Channel partners in DB:", cps.length, cps.slice(0, 3));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
