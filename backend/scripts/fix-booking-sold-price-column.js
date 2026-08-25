require("dotenv").config();

const prisma = require("../lib/prisma");

async function main() {
  const columns = await prisma.$queryRawUnsafe(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Booking' AND COLUMN_NAME = 'soldPrice'"
  );

  if (columns.length) {
    console.log("soldPrice column already exists");
    return;
  }

  await prisma.$executeRawUnsafe("ALTER TABLE Booking ADD COLUMN soldPrice DOUBLE NULL");
  await prisma.$executeRawUnsafe("UPDATE Booking SET soldPrice = totalPrice WHERE soldPrice IS NULL AND totalPrice IS NOT NULL");
  console.log("soldPrice column added");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
