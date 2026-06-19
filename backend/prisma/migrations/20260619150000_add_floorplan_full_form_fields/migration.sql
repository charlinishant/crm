ALTER TABLE `FloorPlan`
  ADD COLUMN `reraNumber` VARCHAR(191) NULL,
  ADD COLUMN `reraDate` DATETIME(3) NULL,
  ADD COLUMN `possessionDate` DATETIME(3) NULL,
  ADD COLUMN `unitPosition` VARCHAR(191) NULL,
  ADD COLUMN `skippedFloors` VARCHAR(191) NULL,
  ADD COLUMN `parkingRequired` VARCHAR(191) NULL,
  ADD COLUMN `registrationAmount` DOUBLE NULL,
  ADD COLUMN `parkingCharges` DOUBLE NULL;
