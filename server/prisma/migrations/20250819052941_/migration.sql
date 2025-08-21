/*
  Warnings:

  - Added the required column `sealwt` to the `itemDelivery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `touch` to the `itemDelivery` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `itemdelivery` ADD COLUMN `sealwt` DOUBLE NOT NULL,
    ADD COLUMN `touch` DOUBLE NOT NULL;
