/*
  Warnings:

  - The values [BOOKED,FRESH_LEAD,LOST,PROSPECT,REGISTERED,UNQUALIFIED] on the enum `Lead_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `preSales` on the `project` table. All the data in the column will be lost.
  - You are about to drop the column `sales` on the `project` table. All the data in the column will be lost.
  - You are about to alter the column `role` on the `user` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phone` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `lead` MODIFY `status` ENUM('Booked', 'Fresh_Lead', 'Lost', 'NP', 'Prospect', 'Registered', 'Unqualified') NULL;

-- AlterTable
ALTER TABLE `project` DROP COLUMN `preSales`,
    DROP COLUMN `sales`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `autoRoster` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `defaultRouting` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `defaultRoutingRule` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `department` ENUM('PRE_SALES', 'SALES', 'POST_SALES') NULL,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `gpsTracking` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `linkedUrl` VARCHAR(191) NULL,
    ADD COLUMN `phone` CHAR(10) NOT NULL,
    ADD COLUMN `pushNotification` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `secondaryPhone` CHAR(10) NULL,
    ADD COLUMN `teamId` INTEGER NULL,
    ADD COLUMN `timeZone` VARCHAR(191) NULL,
    MODIFY `password` VARCHAR(191) NULL,
    MODIFY `role` ENUM('PRE_SALES', 'SALES', 'POST_SALES', 'MANAGER', 'ADMIN', 'AGENCY_USER', 'AGENT') NULL,
    MODIFY `username` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Tower` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `projectId` INTEGER NOT NULL,
    `totalFloor` INTEGER NULL DEFAULT 0,
    `reraTowerId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FloorPlan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `projectId` INTEGER NULL,
    `towerId` INTEGER NULL,
    `type` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `bedrooms` INTEGER NULL,
    `bathrooms` INTEGER NULL,
    `measure` VARCHAR(191) NULL,
    `carpet` DOUBLE NULL,
    `saleable` DOUBLE NULL,
    `loading` DOUBLE NULL,
    `coverArea` DOUBLE NULL,
    `terraceArea` DOUBLE NULL,
    `baseRate` DOUBLE NULL,
    `basePrice` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `parentId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_phone_key` ON `User`(`phone`);

-- AddForeignKey
ALTER TABLE `Tower` ADD CONSTRAINT `Tower_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FloorPlan` ADD CONSTRAINT `FloorPlan_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FloorPlan` ADD CONSTRAINT `FloorPlan_towerId_fkey` FOREIGN KEY (`towerId`) REFERENCES `Tower`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
