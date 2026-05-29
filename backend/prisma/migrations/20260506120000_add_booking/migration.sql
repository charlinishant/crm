-- CreateTable
CREATE TABLE `Booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `leadId` INTEGER NULL,
    `unit` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `stage` VARCHAR(191) NULL DEFAULT 'Tentative',
    `projectDetails` VARCHAR(191) NULL,
    `bookedOn` DATETIME(3) NULL,
    `saleableArea` DOUBLE NULL,
    `basePrice` DOUBLE NULL,
    `baseRate` DOUBLE NULL,
    `source` VARCHAR(191) NULL,
    `bookedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
