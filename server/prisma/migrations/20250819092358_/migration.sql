/*
  Warnings:

  - You are about to drop the column `sealwt` on the `itemdelivery` table. All the data in the column will be lost.
  - You are about to alter the column `wastageType` on the `itemdelivery` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `itemdelivery` DROP COLUMN `sealwt`,
    ADD COLUMN `sealName` VARCHAR(191) NULL,
    MODIFY `wastageType` ENUM('%', '+', 'Touch') NULL;
