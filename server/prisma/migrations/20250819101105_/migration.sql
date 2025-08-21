/*
  Warnings:

  - You are about to alter the column `wastageType` on the `itemdelivery` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `itemdelivery` MODIFY `wastageType` VARCHAR(191) NULL;
