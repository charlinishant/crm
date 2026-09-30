require("dotenv").config();
const prisma = require("../lib/prisma");

async function main() {
  console.log("Checking and migrating UserSession table in database...");

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS \`UserSession\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`sessionToken\` VARCHAR(255) NOT NULL,
      \`sessionStatus\` VARCHAR(191) NOT NULL DEFAULT 'active',
      \`loginAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`logoutAt\` DATETIME(3) NULL,
      \`lastActivityAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`expiresAt\` DATETIME(3) NULL,
      \`ipAddress\` VARCHAR(100) NULL,
      \`userAgent\` TEXT NULL,
      \`deviceType\` VARCHAR(100) NULL,
      \`browser\` VARCHAR(100) NULL,
      \`operatingSystem\` VARCHAR(100) NULL,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE INDEX \`UserSession_sessionToken_key\`(\`sessionToken\`),
      INDEX \`UserSession_userId_idx\`(\`userId\`),
      INDEX \`UserSession_sessionStatus_idx\`(\`sessionStatus\`),
      INDEX \`UserSession_loginAt_idx\`(\`loginAt\`),
      INDEX \`UserSession_logoutAt_idx\`(\`logoutAt\`),
      INDEX \`UserSession_lastActivityAt_idx\`(\`lastActivityAt\`),
      INDEX \`UserSession_userId_loginAt_idx\`(\`userId\`, \`loginAt\`),
      INDEX \`UserSession_userId_sessionStatus_idx\`(\`userId\`, \`sessionStatus\`),
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`UserSession_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `;

  await prisma.$executeRawUnsafe(createTableQuery);
  console.log("UserSession table ensured successfully!");

  const count = await prisma.userSession.count();
  console.log("Current user sessions count:", count);
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
