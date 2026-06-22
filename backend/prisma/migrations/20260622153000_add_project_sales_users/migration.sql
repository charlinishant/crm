CREATE TABLE `ProjectSalesUser` (
  `projectId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `ProjectSalesUser_userId_idx`(`userId`),
  PRIMARY KEY (`projectId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `ProjectSalesUser` (`projectId`, `userId`)
SELECT `Project`.`id`, `User`.`id`
FROM `Project`
INNER JOIN `User` ON `User`.`id` = `Project`.`salesId`
WHERE `Project`.`salesId` IS NOT NULL;

ALTER TABLE `ProjectSalesUser`
  ADD CONSTRAINT `ProjectSalesUser_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `ProjectSalesUser_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
