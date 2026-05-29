/*
  Warnings:

  - You are about to drop the column `address` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `addressType` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `leadAddress` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `street` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `zip` on the `lead` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `basiComment` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requirementComment` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `lead` DROP COLUMN `address`,
    DROP COLUMN `addressType`,
    DROP COLUMN `city`,
    DROP COLUMN `country`,
    DROP COLUMN `leadAddress`,
    DROP COLUMN `state`,
    DROP COLUMN `street`,
    DROP COLUMN `zip`,
    ADD COLUMN `area` VARCHAR(191) NULL,
    ADD COLUMN `basiComment` TEXT NOT NULL,
    ADD COLUMN `bathroomPreferences` VARCHAR(191) NULL,
    ADD COLUMN `budejetMax` INTEGER NULL DEFAULT 0,
    ADD COLUMN `budejetMin` INTEGER NULL DEFAULT 0,
    ADD COLUMN `budget` VARCHAR(191) NULL,
    ADD COLUMN `companyTitle` JSON NULL,
    ADD COLUMN `configration` VARCHAR(191) NULL,
    ADD COLUMN `education` JSON NULL,
    ADD COLUMN `facing` VARCHAR(191) NULL,
    ADD COLUMN `fundingSouurce` VARCHAR(191) NULL,
    ADD COLUMN `furnishing` VARCHAR(191) NULL,
    ADD COLUMN `income` JSON NULL,
    ADD COLUMN `locationPreferences` VARCHAR(191) NULL,
    ADD COLUMN `nri` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `professionMax` VARCHAR(191) NULL,
    ADD COLUMN `professionMin` VARCHAR(191) NULL,
    ADD COLUMN `propertyType` VARCHAR(191) NULL,
    ADD COLUMN `purpose` JSON NULL,
    ADD COLUMN `requirementComment` TEXT NOT NULL,
    ADD COLUMN `url` JSON NULL,
    MODIFY `aniversary` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `username` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `LeadAddress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `address` VARCHAR(191) NULL,
    `street` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `zip` VARCHAR(191) NULL,
    `leadId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonalAddress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('HOME', 'OFFICE') NULL,
    `address` VARCHAR(191) NULL,
    `street` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `zip` VARCHAR(191) NULL,
    `leadId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadNote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `leadId` INTEGER NOT NULL,
    `note` TEXT NOT NULL,
    `owner` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);

-- AddForeignKey
ALTER TABLE `LeadAddress` ADD CONSTRAINT `LeadAddress_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonalAddress` ADD CONSTRAINT `PersonalAddress_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
