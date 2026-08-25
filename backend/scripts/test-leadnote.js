const prisma = require("../lib/prisma");

async function main() {
  try {
    const note = await prisma.leadNote.create({
      data: {
        leadId: 19,
        note: "Smoke test verification note"
      }
    });
    console.log("SUCCESS creating LeadNote:", note);
  } catch (err) {
    console.error("ERROR creating LeadNote:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
