-- AlterTable
ALTER TABLE `purchase_entries` ADD COLUMN `advanceGold` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `goldBalance` DOUBLE NOT NULL DEFAULT 0;
