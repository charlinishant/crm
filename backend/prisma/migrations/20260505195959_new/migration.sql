-- AlterTable
ALTER TABLE `floorplan` MODIFY `basePrice` DOUBLE NULL;

-- CreateTable
CREATE TABLE `UnitModel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `floor` INTEGER NULL,
    `unitIndex` INTEGER NULL,
    `baseRate` DOUBLE NULL,
    `basePrice` DOUBLE NULL,
    `propertyPurpose` VARCHAR(191) NULL,
    `unitId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Unit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NULL,
    `towerId` INTEGER NULL,
    `floorId` INTEGER NULL,
    `type` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `bedrooms` INTEGER NULL,
    `bathrooms` INTEGER NULL,
    `measure` VARCHAR(191) NULL,
    `carpet` DOUBLE NULL,
    `saleable` DOUBLE NULL,
    `loading` DOUBLE NULL,
    `description` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UnitModel` ADD CONSTRAINT `UnitModel_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Unit` ADD CONSTRAINT `Unit_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Unit` ADD CONSTRAINT `Unit_towerId_fkey` FOREIGN KEY (`towerId`) REFERENCES `Tower`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Unit` ADD CONSTRAINT `Unit_floorId_fkey` FOREIGN KEY (`floorId`) REFERENCES `FloorPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
