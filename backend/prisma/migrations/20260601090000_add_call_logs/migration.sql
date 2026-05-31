CREATE TABLE `CallLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `leadId` INTEGER NOT NULL,
  `agentId` INTEGER NULL,
  `phone` VARCHAR(191) NOT NULL,
  `agentPhone` VARCHAR(191) NULL,
  `provider` VARCHAR(191) NOT NULL,
  `callId` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL,
  `duration` INTEGER NULL,
  `recordingUrl` VARCHAR(191) NULL,
  `disposition` VARCHAR(191) NULL,
  `startedAt` DATETIME(3) NULL,
  `endedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `CallLog_callId_key`(`callId`),
  INDEX `CallLog_leadId_idx`(`leadId`),
  INDEX `CallLog_agentId_idx`(`agentId`),
  INDEX `CallLog_status_idx`(`status`),
  INDEX `CallLog_disposition_idx`(`disposition`),
  INDEX `CallLog_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `CallLog` ADD CONSTRAINT `CallLog_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
