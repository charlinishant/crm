const prisma = require("../lib/prisma");

async function main() {
  try {
    try {
      await prisma.$executeRawUnsafe(
        "ALTER TABLE LeadNote ADD COLUMN updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
      );
      console.log("Column updatedAt added successfully");
    } catch (e) {
      if (e.message.includes("Duplicate column name")) {
        console.log("Column updatedAt already exists.");
      } else {
        console.error("Error adding updatedAt:", e.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
