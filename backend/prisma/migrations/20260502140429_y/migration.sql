/*
  Warnings:

  - You are about to drop the column `aniversary` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `emailType` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `lead` table. All the data in the column will be lost.
  - You are about to drop the column `phoneType` on the `lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `lead` DROP COLUMN `aniversary`,
    DROP COLUMN `email`,
    DROP COLUMN `emailType`,
    DROP COLUMN `phone`,
    DROP COLUMN `phoneType`,
    ADD COLUMN `anniversary` DATETIME(3) NULL,
    ADD COLUMN `emails` JSON NULL,
    ADD COLUMN `phones` JSON NULL,
    ADD COLUMN `status` ENUM('BOOKED', 'FRESH_LEAD', 'LOST', 'NP', 'PROSPECT', 'REGISTERED', 'UNQUALIFIED') NULL;
