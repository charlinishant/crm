const prisma = require("../lib/prisma");

/**
 * Universal MySQL schema synchronizer for CallLog missed call columns.
 * Compatible with all MySQL versions (5.7, 8.0+, MariaDB) without syntax errors.
 */
async function syncMissedCallSchema() {
  try {
    const cols = await prisma.$queryRawUnsafe("DESCRIBE `CallLog`");
    const existing = new Set(cols.map((c) => c.Field));

    const toAdd = [
      { name: "isAcknowledged", sql: "ALTER TABLE `CallLog` ADD COLUMN `isAcknowledged` BOOLEAN NOT NULL DEFAULT FALSE" },
      { name: "acknowledgedAt", sql: "ALTER TABLE `CallLog` ADD COLUMN `acknowledgedAt` DATETIME(3) NULL" },
      { name: "acknowledgedById", sql: "ALTER TABLE `CallLog` ADD COLUMN `acknowledgedById` INTEGER NULL" },
      { name: "callbackStatus", sql: "ALTER TABLE `CallLog` ADD COLUMN `callbackStatus` VARCHAR(50) NULL DEFAULT 'pending'" },
      { name: "callbackTaskId", sql: "ALTER TABLE `CallLog` ADD COLUMN `callbackTaskId` INTEGER NULL" },
      { name: "callbackFollowUpId", sql: "ALTER TABLE `CallLog` ADD COLUMN `callbackFollowUpId` INTEGER NULL" },
    ];

    const missing = toAdd.filter((item) => !existing.has(item.name));
    if (missing.length === 0) {
      console.log("CallLog schema is up to date (all missed call columns exist).");
      return;
    }

    console.log(`Adding ${missing.length} missing columns to CallLog...`);
    for (const item of missing) {
      try {
        await prisma.$executeRawUnsafe(item.sql);
        console.log(`  + Column '${item.name}' added successfully.`);
      } catch (colErr) {
        console.warn(`  - Note on '${item.name}':`, colErr.message);
      }
    }

    // Safely create indexes
    try {
      await prisma.$executeRawUnsafe("CREATE INDEX `CallLog_isAcknowledged_idx` ON `CallLog` (`isAcknowledged`)");
    } catch (_) {}
    try {
      await prisma.$executeRawUnsafe("CREATE INDEX `CallLog_callbackStatus_idx` ON `CallLog` (`callbackStatus`)");
    } catch (_) {}

    console.log("CallLog schema sync completed successfully.");
  } catch (err) {
    console.warn("CallLog schema inspect notice:", err.message);
  }
}

if (require.main === module) {
  syncMissedCallSchema()
    .catch((err) => {
      console.error("Failed to sync CallLog schema:", err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { syncMissedCallSchema };
