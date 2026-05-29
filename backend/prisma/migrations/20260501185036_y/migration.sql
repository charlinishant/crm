/*
  Warnings:

  - You are about to drop the column `reraProjecrId` on the `project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `project` DROP COLUMN `reraProjecrId`,
    ADD COLUMN `reraProjectId` INTEGER NULL,
    MODIFY `description` TEXT NULL,
    MODIFY `sales` VARCHAR(191) NULL,
    MODIFY `preSales` VARCHAR(191) NULL,
    MODIFY `address` TEXT NULL,
    MODIFY `street` VARCHAR(191) NULL,
    MODIFY `locality` VARCHAR(191) NULL,
    MODIFY `city` VARCHAR(191) NULL,
    MODIFY `state` VARCHAR(191) NULL,
    MODIFY `country` VARCHAR(191) NULL,
    MODIFY `zip` VARCHAR(191) NULL,
    MODIFY `longitude` VARCHAR(191) NULL,
    MODIFY `latitude` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'SALESPERSON') NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salutation` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `emailType` ENUM('OFFICE', 'PERSONAL') NULL,
    `email` VARCHAR(191) NULL,
    `phoneType` ENUM('OFFICE', 'PERSONAL') NOT NULL,
    `phone` VARCHAR(191) NULL,
    `timeZone` VARCHAR(191) NULL,
    `tags` VARCHAR(191) NULL,
    `interestedProjects` VARCHAR(191) NULL,
    `team` VARCHAR(191) NULL,
    `channelPartner` VARCHAR(191) NULL,
    `conductSiteVisit` VARCHAR(191) NULL,
    `conductSiteDate` DATETIME(3) NULL,
    `leadAddress` VARCHAR(191) NULL,
    `street` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `zip` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `type` ENUM('MEETINGROOMS', 'DESKS', 'PRIVATEOFFICES', 'CABINS') NULL,
    `carpetArea` VARCHAR(191) NULL,
    `seats` INTEGER NOT NULL,
    `tenure` DOUBLE NOT NULL,
    `gender` ENUM('MALE', 'FEMALE') NULL,
    `occupations` VARCHAR(191) NULL,
    `age` INTEGER NULL,
    `birthday` DATETIME(3) NULL,
    `maritalStatus` BOOLEAN NULL,
    `aniversary` DATETIME(3) NOT NULL,
    `industry` VARCHAR(191) NOT NULL,
    `addressType` ENUM('HOME', 'OFFICE') NULL,
    `address` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
