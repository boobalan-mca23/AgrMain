/*
  Warnings:

  - Added the required column `actualPure` to the `purchase_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wastagePure` to the `purchase_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wastageType` to the `purchase_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actualPure` to the `purchase_stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wastagePure` to the `purchase_stock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wastageType` to the `purchase_stock` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `purchase_entries` ADD COLUMN `actualPure` DOUBLE NOT NULL,
    ADD COLUMN `wastagePure` DOUBLE NOT NULL,
    ADD COLUMN `wastageType` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `purchase_stock` ADD COLUMN `actualPure` DOUBLE NOT NULL,
    ADD COLUMN `wastagePure` DOUBLE NOT NULL,
    ADD COLUMN `wastageType` VARCHAR(191) NOT NULL;
