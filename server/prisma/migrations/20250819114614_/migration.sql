/*
  Warnings:

  - Made the column `jobcardId` on table `receivedsection` required. This step will fail if there are existing NULL values in that column.
  - Made the column `goldsmithId` on table `receivedsection` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `receivedsection` DROP FOREIGN KEY `Receivedsection_goldsmithId_fkey`;

-- DropForeignKey
ALTER TABLE `receivedsection` DROP FOREIGN KEY `Receivedsection_jobcardId_fkey`;

-- DropIndex
DROP INDEX `Receivedsection_goldsmithId_fkey` ON `receivedsection`;

-- DropIndex
DROP INDEX `Receivedsection_jobcardId_fkey` ON `receivedsection`;

-- AlterTable
ALTER TABLE `receivedsection` MODIFY `jobcardId` INTEGER NOT NULL,
    MODIFY `goldsmithId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Receivedsection` ADD CONSTRAINT `Receivedsection_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receivedsection` ADD CONSTRAINT `Receivedsection_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `Goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
