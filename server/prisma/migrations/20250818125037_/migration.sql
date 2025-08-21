/*
  Warnings:

  - You are about to drop the column `purity` on the `jobcard` table. All the data in the column will be lost.
  - You are about to drop the column `touch` on the `jobcard` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `jobcard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `jobcard` DROP COLUMN `purity`,
    DROP COLUMN `touch`,
    DROP COLUMN `weight`;

-- CreateTable
CREATE TABLE `givenGold` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goldsmithId` INTEGER NULL,
    `jobcardId` INTEGER NULL,
    `weight` DOUBLE NOT NULL,
    `touch` DOUBLE NOT NULL,
    `purity` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `givenGold` ADD CONSTRAINT `givenGold_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `Goldsmith`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `givenGold` ADD CONSTRAINT `givenGold_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
