-- CreateTable
CREATE TABLE `Project` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `reraProjecrId` INTEGER NOT NULL,
    `sales` VARCHAR(191) NOT NULL,
    `preSales` VARCHAR(191) NOT NULL,
    `projectType` VARCHAR(191) NOT NULL,
    `possession` BOOLEAN NOT NULL DEFAULT false,
    `address` TEXT NOT NULL,
    `street` VARCHAR(191) NOT NULL,
    `locality` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `zip` VARCHAR(191) NOT NULL,
    `longitude` VARCHAR(191) NOT NULL,
    `latitude` VARCHAR(191) NOT NULL,
    `inventory` BOOLEAN NOT NULL DEFAULT false,
    `noOfTowers` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `integratedPortals` VARCHAR(191) NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
