require("dotenv").config();

const prisma = require("../lib/prisma");

async function main() {
  const columns = await prisma.$queryRawUnsafe(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User' AND COLUMN_NAME = 'profilePhoto'"
  );

  if (columns.length) {
    console.log("profilePhoto column already exists");
    return;
  }

  await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN profilePhoto LONGTEXT NULL");
  console.log("profilePhoto column added");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
