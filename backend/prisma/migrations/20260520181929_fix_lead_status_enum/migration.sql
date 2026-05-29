-- AlterTable
ALTER TABLE `lead` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `is_delete` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `status` ENUM('Fresh_Lead', 'Booked', 'Lost', 'NP', 'Prospect', 'Registered', 'Unqualified') NULL;

-- CreateTable
CREATE TABLE `Task` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `remark` TEXT NULL,
    `type` VARCHAR(191) NULL DEFAULT 'Folllow up',
    `status` VARCHAR(191) NULL DEFAULT 'Open',
    `priority` VARCHAR(191) NULL DEFAULT 'Medium',
    `dueDate` DATETIME(3) NULL,
    `dueTime` VARCHAR(191) NULL,
    `assigneeId` INTEGER NULL,
    `assigneeName` VARCHAR(191) NULL,
    `assignedById` INTEGER NULL,
    `assignedByName` VARCHAR(191) NULL,
    `attachments` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
