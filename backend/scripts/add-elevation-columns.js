require("dotenv").config();
const prisma = require("../lib/prisma");

async function main() {
  try {
    console.log("Adding elevationPhoto and image columns if not existing...");
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE `Project` ADD COLUMN `elevationPhoto` TEXT NULL");
      console.log("Added elevationPhoto to Project");
    } catch (e) {
      console.log("elevationPhoto on Project:", e.message);
    }

    try {
      await prisma.$executeRawUnsafe("ALTER TABLE `Project` ADD COLUMN `image` TEXT NULL");
      console.log("Added image to Project");
    } catch (e) {
      console.log("image on Project:", e.message);
    }

    try {
      await prisma.$executeRawUnsafe("ALTER TABLE `Tower` ADD COLUMN `elevationPhoto` TEXT NULL");
      console.log("Added elevationPhoto to Tower");
    } catch (e) {
      console.log("elevationPhoto on Tower:", e.message);
    }

    try {
      await prisma.$executeRawUnsafe("ALTER TABLE `Tower` ADD COLUMN `image` TEXT NULL");
      console.log("Added image to Tower");
    } catch (e) {
      console.log("image on Tower:", e.message);
    }

    console.log("Columns verified/added successfully.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
