/*
  Warnings:

  - You are about to drop the column `stoneWeight` on the `itemdelivery` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `itemdelivery` table. All the data in the column will be lost.
  - You are about to drop the column `totalBalance` on the `total` table. All the data in the column will be lost.
  - You are about to drop the column `totalPurity` on the `total` table. All the data in the column will be lost.
  - Added the required column `deliveryTotal` to the `Total` table without a default value. This is not possible if the table is not empty.
  - Added the required column `givenTotal` to the `Total` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jobCardBalance` to the `Total` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receivedTotal` to the `Total` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stoneTotalWt` to the `Total` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `itemdelivery` DROP COLUMN `stoneWeight`,
    DROP COLUMN `type`;

-- AlterTable
ALTER TABLE `total` DROP COLUMN `totalBalance`,
    DROP COLUMN `totalPurity`,
    ADD COLUMN `deliveryTotal` DOUBLE NOT NULL,
    ADD COLUMN `givenTotal` DOUBLE NOT NULL,
    ADD COLUMN `jobCardBalance` DOUBLE NOT NULL,
    ADD COLUMN `jobcardId` INTEGER NULL,
    ADD COLUMN `receivedTotal` DOUBLE NOT NULL,
    ADD COLUMN `stoneTotalWt` DOUBLE NOT NULL;

-- CreateTable
CREATE TABLE `deduction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `deliveryId` INTEGER NOT NULL,
    `weight` DOUBLE NOT NULL,
    `stoneWt` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `deduction` ADD CONSTRAINT `deduction_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `itemDelivery`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Total` ADD CONSTRAINT `Total_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
