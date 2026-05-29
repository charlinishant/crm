-- AlterTable
ALTER TABLE `lead` ADD COLUMN `assigneeId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
