-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterTouch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `touch` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JewelStock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jewelName` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `stoneWeight` DOUBLE NOT NULL,
    `finalWeight` DOUBLE NOT NULL,
    `touch` DOUBLE NOT NULL,
    `purityValue` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `goldRate` DOUBLE NULL,
    `purity` DOUBLE NOT NULL,
    `touch` DOUBLE NULL,
    `customerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Entry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `cashAmount` DOUBLE NULL,
    `goldValue` DOUBLE NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `goldRate` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `order_group_id` INTEGER NOT NULL,
    `item_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `image` VARCHAR(191) NULL,
    `due_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `worker_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_multiple_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_order_id` INTEGER NOT NULL,
    `filename` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterBullion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BullionPurchase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bullionId` INTEGER NOT NULL,
    `grams` DOUBLE NOT NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `rate` DOUBLE NOT NULL,
    `amount` DOUBLE NOT NULL,
    `balance` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GivenDetail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NOT NULL,
    `grams` DOUBLE NOT NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `purchaseId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Goldsmith` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Jobcard` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goldsmithId` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `touch` DOUBLE NOT NULL,
    `purity` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Total` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goldsmithId` INTEGER NOT NULL,
    `totalPurity` DOUBLE NOT NULL,
    `openingBalance` DOUBLE NOT NULL,
    `totalBalance` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itemDelivery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemName` VARCHAR(191) NOT NULL,
    `itemWeight` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `stoneWeight` DOUBLE NOT NULL,
    `netWeight` DOUBLE NOT NULL,
    `wastageType` ENUM('%', '+', 'Touch') NOT NULL,
    `wastageValue` DOUBLE NOT NULL,
    `finalPurity` DOUBLE NOT NULL,
    `goldsmithId` INTEGER NULL,
    `jobcardId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Receivedsection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weight` DOUBLE NOT NULL,
    `touch` DOUBLE NOT NULL,
    `purity` DOUBLE NOT NULL,
    `jobcardId` INTEGER NULL,
    `goldsmithId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Balances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goldsmithId` INTEGER NOT NULL,
    `totalDeliveries` INTEGER NOT NULL,
    `totalItemWeight` DOUBLE NOT NULL,
    `totalNetWeight` DOUBLE NOT NULL,
    `totalPurity` DOUBLE NOT NULL,
    `totalReceivedWeight` DOUBLE NOT NULL,
    `totalReceivedTouch` DOUBLE NOT NULL,
    `totalReceivedPurity` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repair` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goldsmithId` INTEGER NOT NULL,
    `givenWeights` JSON NOT NULL,
    `totalGiven` DOUBLE NOT NULL,
    `itemWeights` JSON NOT NULL,
    `totalItem` DOUBLE NOT NULL,
    `stone` DOUBLE NOT NULL,
    `wastageType` VARCHAR(191) NOT NULL,
    `touch` DOUBLE NOT NULL,
    `netWeight` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_order` ADD CONSTRAINT `customer_order_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_multiple_images` ADD CONSTRAINT `product_multiple_images_customer_order_id_fkey` FOREIGN KEY (`customer_order_id`) REFERENCES `customer_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BullionPurchase` ADD CONSTRAINT `BullionPurchase_bullionId_fkey` FOREIGN KEY (`bullionId`) REFERENCES `MasterBullion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GivenDetail` ADD CONSTRAINT `GivenDetail_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `BullionPurchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jobcard` ADD CONSTRAINT `Jobcard_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `Goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Total` ADD CONSTRAINT `Total_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `Goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itemDelivery` ADD CONSTRAINT `itemDelivery_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `Goldsmith`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itemDelivery` ADD CONSTRAINT `itemDelivery_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receivedsection` ADD CONSTRAINT `Receivedsection_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receivedsection` ADD CONSTRAINT `Receivedsection_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `Goldsmith`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Balances` ADD CONSTRAINT `Balances_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `Goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repair` ADD CONSTRAINT `Repair_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `Goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
