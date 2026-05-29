/*
  Warnings:

  - You are about to drop the column `unit` on the `booking` table. All the data in the column will be lost.
  - You are about to drop the column `assigneeId` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `basiComment` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `requirementComment` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `team` on the `lead` table. All the data in the column will be lost.
  - You are about to alter the column `type` on the `lead` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(3))` to `VarChar(191)`.

*/
-- DropForeignKey
ALTER TABLE `lead` DROP FOREIGN KEY `Lead_assigneeId_fkey`;

-- DropIndex
DROP INDEX `Lead_assigneeId_fkey` ON `lead`;

-- AlterTable
ALTER TABLE `booking` DROP COLUMN `unit`,
    ADD COLUMN `unitCount` INTEGER NULL,
    ADD COLUMN `unitId` INTEGER NULL;

-- AlterTable
ALTER TABLE `lead` DROP COLUMN `assigneeId`,
    DROP COLUMN `basiComment`,
    DROP COLUMN `requirementComment`,
    DROP COLUMN `team`,
    ADD COLUMN `leadReassigned` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `teamId` INTEGER NULL,
    MODIFY `type` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `CostSheet` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fieldName` VARCHAR(191) NOT NULL,
    `orignalValue` DOUBLE NULL,
    `costType` VARCHAR(191) NOT NULL DEFAULT 'Discount',
    `inputField` DOUBLE NULL,
    `newValue` DOUBLE NOT NULL,
    `bookingId` INTEGER NOT NULL,

    UNIQUE INDEX `CostSheet_bookingId_key`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `towerMilestone` VARCHAR(191) NOT NULL,
    `value` DOUBLE NULL,
    `amount` DOUBLE NULL,
    `taxes` DOUBLE NULL,
    `tds` DOUBLE NULL,
    `grandTotal` DOUBLE NOT NULL,
    `bookingId` INTEGER NOT NULL,

    UNIQUE INDEX `PaymentSchedule_bookingId_key`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostSheet` ADD CONSTRAINT `CostSheet_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentSchedule` ADD CONSTRAINT `PaymentSchedule_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
