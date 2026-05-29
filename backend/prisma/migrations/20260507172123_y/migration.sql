/*
  Warnings:

  - You are about to drop the column `budejetMax` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `budejetMin` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `fundingSouurce` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `professionMax` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `professionMin` on the `lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `lead` DROP COLUMN `budejetMax`,
    DROP COLUMN `budejetMin`,
    DROP COLUMN `fundingSouurce`,
    DROP COLUMN `professionMax`,
    DROP COLUMN `professionMin`,
    ADD COLUMN `budgetMax` INTEGER NULL DEFAULT 0,
    ADD COLUMN `budgetMin` INTEGER NULL DEFAULT 0,
    ADD COLUMN `fundingSource` VARCHAR(191) NULL,
    ADD COLUMN `possessionMax` VARCHAR(191) NULL,
    ADD COLUMN `possessionMin` VARCHAR(191) NULL,
    ADD COLUMN `transactionType` VARCHAR(191) NULL DEFAULT '';
