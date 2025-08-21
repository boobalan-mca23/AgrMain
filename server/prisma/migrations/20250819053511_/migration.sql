-- AlterTable
ALTER TABLE `deduction` MODIFY `type` VARCHAR(191) NULL,
    MODIFY `weight` DOUBLE NULL,
    MODIFY `stoneWt` DOUBLE NULL;

-- AlterTable
ALTER TABLE `givengold` MODIFY `weight` DOUBLE NULL,
    MODIFY `touch` DOUBLE NULL,
    MODIFY `purity` DOUBLE NULL;

-- AlterTable
ALTER TABLE `itemdelivery` MODIFY `itemName` VARCHAR(191) NULL,
    MODIFY `itemWeight` DOUBLE NULL,
    MODIFY `netWeight` DOUBLE NULL,
    MODIFY `wastageType` ENUM('%', '+', 'Touch') NULL,
    MODIFY `wastageValue` DOUBLE NULL,
    MODIFY `finalPurity` DOUBLE NULL,
    MODIFY `sealwt` DOUBLE NULL,
    MODIFY `touch` DOUBLE NULL;

-- AlterTable
ALTER TABLE `jobcard` MODIFY `description` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `receivedsection` MODIFY `weight` DOUBLE NULL,
    MODIFY `touch` DOUBLE NULL,
    MODIFY `purity` DOUBLE NULL;

-- AlterTable
ALTER TABLE `total` ADD COLUMN `isFinished` VARCHAR(191) NULL,
    MODIFY `openingBalance` DOUBLE NULL,
    MODIFY `deliveryTotal` DOUBLE NULL,
    MODIFY `givenTotal` DOUBLE NULL,
    MODIFY `jobCardBalance` DOUBLE NULL,
    MODIFY `receivedTotal` DOUBLE NULL,
    MODIFY `stoneTotalWt` DOUBLE NULL;
