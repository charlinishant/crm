const prisma = require("../lib/prisma");

const createTableSql = `
CREATE TABLE IF NOT EXISTS \`McubeAgent\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`userId\` INTEGER NOT NULL,
  \`mcubeAgentId\` VARCHAR(191) NULL,
  \`mcubeEmail\` VARCHAR(191) NOT NULL,
  \`extension\` VARCHAR(191) NULL,
  \`agentPhone\` VARCHAR(191) NULL,
  \`callingMode\` VARCHAR(191) NOT NULL DEFAULT 'softphone',
  \`isActive\` BOOLEAN NOT NULL DEFAULT true,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`McubeAgent_userId_key\`(\`userId\`),
  UNIQUE INDEX \`McubeAgent_mcubeEmail_key\`(\`mcubeEmail\`),
  UNIQUE INDEX \`McubeAgent_mcubeAgentId_key\`(\`mcubeAgentId\`),
  UNIQUE INDEX \`McubeAgent_extension_key\`(\`extension\`),
  INDEX \`McubeAgent_userId_idx\`(\`userId\`),
  INDEX \`McubeAgent_mcubeEmail_idx\`(\`mcubeEmail\`),
  INDEX \`McubeAgent_mcubeAgentId_idx\`(\`mcubeAgentId\`),
  INDEX \`McubeAgent_extension_idx\`(\`extension\`),
  PRIMARY KEY (\`id\`),
  CONSTRAINT \`McubeAgent_userId_fkey\`
    FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

async function syncMcubeSchema() {
  console.log("Checking and syncing McubeAgent table...");
  await prisma.$executeRawUnsafe(createTableSql);
  console.log("McubeAgent table verified/created successfully.");
}

if (require.main === module) {
  syncMcubeSchema()
    .catch((err) => {
      console.error("Failed to sync McubeAgent schema:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { syncMcubeSchema };
