ALTER TABLE `CallLog`
  ADD COLUMN `leadPhone` VARCHAR(191) NULL,
  ADD COLUMN `providerCallId` VARCHAR(191) NULL,
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `connectedAt` DATETIME(3) NULL,
  ADD COLUMN `nextFollowUpAt` DATETIME(3) NULL,
  ADD COLUMN `interestedProject` VARCHAR(191) NULL,
  ADD COLUMN `budget` VARCHAR(191) NULL,
  ADD COLUMN `visitDateTime` DATETIME(3) NULL;

UPDATE `CallLog`
SET `leadPhone` = `phone`,
    `providerCallId` = `callId`
WHERE `leadPhone` IS NULL OR `providerCallId` IS NULL;

CREATE UNIQUE INDEX `CallLog_providerCallId_key` ON `CallLog`(`providerCallId`);
