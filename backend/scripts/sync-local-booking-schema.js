const prisma = require("../lib/prisma");

const columnDefinitions = {
  FloorPlan: [
    ["floorRiseEnabled", "BOOLEAN NOT NULL DEFAULT false"],
  ],
  User: [
    ["reraNumber", "VARCHAR(191) NULL"],
  ],
  Booking: [
    ["floorRiseEnabled", "BOOLEAN NOT NULL DEFAULT false"],
    ["floorRisePerSqft", "DOUBLE NULL"],
    ["baseFloorForFloorRise", "INTEGER NULL"],
    ["floorNumber", "INTEGER NULL"],
    ["riseSteps", "INTEGER NULL"],
    ["floorRiseCalculatedAmount", "DOUBLE NULL"],
    ["calculatedUnitPrice", "DOUBLE NULL"],
    ["priceSnapshot", "JSON NULL"],
    ["parkingRequired", "BOOLEAN NOT NULL DEFAULT false"],
    ["carParkingSlots", "INTEGER NULL"],
    ["parkingType", "VARCHAR(191) NULL"],
    ["parkingSlotNumber", "VARCHAR(191) NULL"],
    ["twoWheelerSlots", "INTEGER NULL"],
    ["basementStoreroomArea", "DOUBLE NULL"],
    ["parkingCharges", "DOUBLE NULL DEFAULT 0"],
    ["gstPercent", "DOUBLE NULL"],
    ["stampDutyPercent", "DOUBLE NULL"],
    ["registrationAmount", "DOUBLE NULL"],
    ["legalDocumentationCharges", "DOUBLE NULL"],
    ["infrastructureDevelopmentCharges", "DOUBLE NULL"],
    ["societyFormationCharges", "DOUBLE NULL"],
    ["clubMembershipCharges", "DOUBLE NULL"],
    ["maintenanceAdvanceMonths", "INTEGER NULL"],
    ["maintenanceRatePerSqftPerMonth", "DOUBLE NULL"],
    ["sinkingFundCorpus", "DOUBLE NULL"],
    ["customOtherCharges", "JSON NULL"],
    ["bookingName", "VARCHAR(191) NULL"],
    ["projectId", "INTEGER NULL"],
    ["towerId", "INTEGER NULL"],
    ["floorPlanId", "INTEGER NULL"],
    ["bookingDate", "DATETIME(3) NULL"],
    ["closingRate", "DOUBLE NULL"],
    ["totalFlatPrice", "DOUBLE NULL"],
    ["parkingAmount", "DOUBLE NULL DEFAULT 0"],
    ["gstAmount", "DOUBLE NULL"],
    ["stampDutyAmount", "DOUBLE NULL"],
    ["registrationCharges", "DOUBLE NULL"],
    ["legalCharges", "DOUBLE NULL"],
    ["otherExpenseTotal", "DOUBLE NULL DEFAULT 0"],
    ["totalTaxes", "DOUBLE NULL DEFAULT 0"],
    ["totalAllInclusiveCost", "DOUBLE NULL DEFAULT 0"],
    ["channelPartnerName", "VARCHAR(191) NULL"],
    ["channelPartnerReraId", "VARCHAR(191) NULL"],
  ],
  CostSheet: [
    ["sortOrder", "INTEGER NULL"],
  ],
  PaymentSchedule: [
    ["sortOrder", "INTEGER NULL"],
  ],
};

const tableDefinitions = [
  [
    "BookingCharge",
    `CREATE TABLE \`BookingCharge\` (
      \`id\` INTEGER NOT NULL AUTO_INCREMENT,
      \`bookingId\` INTEGER NOT NULL,
      \`code\` VARCHAR(191) NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`chargeType\` VARCHAR(191) NOT NULL,
      \`rate\` DOUBLE NULL,
      \`amount\` DOUBLE NOT NULL,
      \`taxable\` BOOLEAN NOT NULL DEFAULT false,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX \`BookingCharge_bookingId_idx\`(\`bookingId\`),
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`BookingCharge_bookingId_fkey\`
        FOREIGN KEY (\`bookingId\`) REFERENCES \`Booking\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  ],
  [
    "BookingExpense",
    `CREATE TABLE \`BookingExpense\` (
      \`id\` INTEGER NOT NULL AUTO_INCREMENT,
      \`bookingId\` INTEGER NOT NULL,
      \`name\` VARCHAR(191) NOT NULL,
      \`amount\` DOUBLE NOT NULL,
      \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      INDEX \`BookingExpense_bookingId_idx\`(\`bookingId\`),
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`BookingExpense_bookingId_fkey\`
        FOREIGN KEY (\`bookingId\`) REFERENCES \`Booking\`(\`id\`)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  ],
];

const hasColumn = async (tableName, columnName) => {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    tableName,
    columnName
  );
  return Number(rows[0]?.count || 0) > 0;
};

const hasTable = async (tableName) => {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    tableName
  );
  return Number(rows[0]?.count || 0) > 0;
};

const main = async () => {
  const changes = [];

  for (const [tableName, createSql] of tableDefinitions) {
    if (await hasTable(tableName)) continue;
    await prisma.$executeRawUnsafe(createSql);
    changes.push(`created table ${tableName}`);
  }

  for (const [tableName, columns] of Object.entries(columnDefinitions)) {
    for (const [columnName, definition] of columns) {
      if (await hasColumn(tableName, columnName)) continue;
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
      changes.push(`added ${tableName}.${columnName}`);
    }
  }

  if (changes.includes("added FloorPlan.floorRiseEnabled")) {
    await prisma.$executeRawUnsafe(`
      UPDATE \`FloorPlan\`
      SET \`floorRiseEnabled\` = true
      WHERE \`floorRisePerSqft\` IS NOT NULL
        AND \`floorRisePerSqft\` >= 0
        AND \`baseFloorForFloorRise\` IS NOT NULL
        AND \`baseFloorForFloorRise\` >= 1
    `);
    changes.push("backfilled FloorPlan.floorRiseEnabled");
  }

  console.log(changes.length ? changes.join("\n") : "schema already in sync");
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
