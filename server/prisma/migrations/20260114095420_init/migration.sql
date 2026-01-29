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
CREATE TABLE `masterWastage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wastage` DOUBLE NOT NULL,
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
    `logId` INTEGER NULL,
    `gold` DOUBLE NULL,
    `amount` DOUBLE NULL,
    `goldRate` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `touch` DOUBLE NULL,
    `customerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Transaction_customerId_fkey`(`customerId`),
    INDEX `Transaction_logId_fkey`(`logId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Entry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `logId` INTEGER NULL,
    `date` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `cashAmount` DOUBLE NULL,
    `goldValue` DOUBLE NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `goldRate` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Entry_logId_fkey`(`logId`),
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

    INDEX `customer_order_customer_id_fkey`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_multiple_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_order_id` INTEGER NOT NULL,
    `filename` VARCHAR(191) NOT NULL,

    INDEX `product_multiple_images_customer_order_id_fkey`(`customer_order_id`),
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

    INDEX `BullionPurchase_bullionId_fkey`(`bullionId`),
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

    INDEX `GivenDetail_purchaseId_fkey`(`purchaseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goldsmith` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `balance` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Jobcard` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goldsmithId` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Jobcard_goldsmithId_fkey`(`goldsmithId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `givenGold` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goldsmithId` INTEGER NULL,
    `jobcardId` INTEGER NULL,
    `logId` INTEGER NULL,
    `weight` DOUBLE NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `givenGold_goldsmithId_fkey`(`goldsmithId`),
    INDEX `givenGold_jobcardId_fkey`(`jobcardId`),
    INDEX `givenGold_logId_fkey`(`logId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itemDelivery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itemName` VARCHAR(191) NULL,
    `itemWeight` DOUBLE NULL,
    `count` INTEGER NULL,
    `touch` DOUBLE NULL,
    `sealName` VARCHAR(191) NULL,
    `netWeight` DOUBLE NULL,
    `wastageType` VARCHAR(191) NULL,
    `wastageValue` DOUBLE NULL,
    `wastagePure` DOUBLE NULL,
    `finalPurity` DOUBLE NULL,
    `goldsmithId` INTEGER NULL,
    `jobcardId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `itemDelivery_goldsmithId_fkey`(`goldsmithId`),
    INDEX `itemDelivery_jobcardId_fkey`(`jobcardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deduction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NULL,
    `deliveryId` INTEGER NOT NULL,
    `weight` DOUBLE NULL,
    `stoneWt` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `deduction_deliveryId_fkey`(`deliveryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Total` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobcardId` INTEGER NULL,
    `goldsmithId` INTEGER NOT NULL,
    `balanceOption` BOOLEAN NOT NULL DEFAULT false,
    `givenTotal` DOUBLE NULL,
    `deliveryTotal` DOUBLE NULL,
    `stoneTotalWt` DOUBLE NULL,
    `openingBalance` DOUBLE NULL,
    `goldSmithBalance` DOUBLE NULL,
    `jobCardBalance` DOUBLE NULL,
    `receivedTotal` DOUBLE NULL,
    `isFinished` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Total_goldsmithId_fkey`(`goldsmithId`),
    INDEX `Total_jobcardId_fkey`(`jobcardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Receivedsection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weight` DOUBLE NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `logId` INTEGER NULL,
    `jobcardId` INTEGER NOT NULL,
    `goldsmithId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Receivedsection_goldsmithId_fkey`(`goldsmithId`),
    INDEX `Receivedsection_jobcardId_fkey`(`jobcardId`),
    INDEX `Receivedsection_logId_fkey`(`logId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawgoldStock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `touchId` INTEGER NOT NULL,
    `touch` DOUBLE NULL,
    `weight` DOUBLE NULL,
    `remainingWt` DOUBLE NULL,

    INDEX `RawgoldStock_touchId_fkey`(`touchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawGoldLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rawGoldStockId` INTEGER NOT NULL,
    `weight` DOUBLE NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,

    INDEX `RawGoldLogs_rawGoldStockId_fkey`(`rawGoldStockId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpenseTracker` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `logId` INTEGER NULL,
    `expenseDate` DATETIME(3) NULL,
    `gold` DOUBLE NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExpenseTracker_logId_fkey`(`logId`),
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

    INDEX `Balances_goldsmithId_fkey`(`goldsmithId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repair` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goldsmithId` INTEGER NOT NULL,
    `givenWeights` LONGTEXT NOT NULL,
    `totalGiven` DOUBLE NOT NULL,
    `itemWeights` LONGTEXT NOT NULL,
    `totalItem` DOUBLE NOT NULL,
    `stone` DOUBLE NOT NULL,
    `wastageType` VARCHAR(191) NOT NULL,
    `touch` DOUBLE NOT NULL,
    `netWeight` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Repair_goldsmithId_fkey`(`goldsmithId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productstock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobcardId` INTEGER NULL,
    `deliveryId` INTEGER NULL,
    `itemName` VARCHAR(191) NULL,
    `itemWeight` DOUBLE NULL,
    `count` INTEGER NOT NULL,
    `touch` DOUBLE NULL,
    `stoneWeight` DOUBLE NULL,
    `wastageValue` DOUBLE NULL,
    `netWeight` DOUBLE NULL,
    `wastagePure` DOUBLE NULL,
    `wastageType` VARCHAR(191) NULL,
    `finalPurity` DOUBLE NULL,
    `isBillProduct` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `source` ENUM('NORMAL', 'CUSTOMER_RETURN', 'REPAIR_RETURN') NOT NULL DEFAULT 'NORMAL',

    INDEX `ProductStock_deliveryId_fkey`(`deliveryId`),
    INDEX `ProductStock_jobcardId_fkey`(`jobcardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `billno` INTEGER NULL,
    `date` DATETIME(3) NULL,
    `time` DATETIME(3) NULL,
    `customer_id` INTEGER NOT NULL,
    `customername` VARCHAR(191) NULL,
    `billAmount` DOUBLE NOT NULL,
    `hallMark` DOUBLE NULL,
    `prevHallMark` DOUBLE NULL,
    `PrevBalance` DOUBLE NULL,
    `hallmarkQty` DOUBLE NULL,
    `billDetailsprofit` DOUBLE NULL,
    `Stoneprofit` DOUBLE NULL,
    `Totalprofit` DOUBLE NULL,
    `cashBalance` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Bill_customer_id_fkey`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItems` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `billId` INTEGER NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `count` INTEGER NULL,
    `weight` DOUBLE NULL,
    `stoneWeight` DOUBLE NULL,
    `afterWeight` DOUBLE NULL,
    `percentage` DOUBLE NULL,
    `finalWeight` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `stockId` INTEGER NULL,
    `touch` DOUBLE NULL,
    `netWeight` DOUBLE NULL,
    `wastageValue` DOUBLE NULL,
    `wastagePure` DOUBLE NULL,
    `finalPurity` DOUBLE NULL,
    `repairStatus` VARCHAR(191) NOT NULL DEFAULT 'NONE',

    INDEX `OrderItems_billId_fkey`(`billId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billReceived` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `billId` INTEGER NULL,
    `customer_id` INTEGER NOT NULL,
    `logId` INTEGER NULL,
    `date` VARCHAR(191) NULL,
    `type` VARCHAR(191) NULL,
    `goldRate` INTEGER NULL,
    `gold` DOUBLE NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `receiveHallMark` DOUBLE NULL,
    `amount` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `billReceived_billId_fkey`(`billId`),
    INDEX `billReceived_customer_id_fkey`(`customer_id`),
    INDEX `billReceived_logId_fkey`(`logId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receiptVoucher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `logId` INTEGER NULL,
    `date` VARCHAR(191) NULL,
    `type` VARCHAR(191) NULL,
    `goldRate` INTEGER NULL,
    `gold` DOUBLE NULL,
    `touch` DOUBLE NULL,
    `purity` DOUBLE NULL,
    `receiveHallMark` DOUBLE NULL,
    `amount` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `receiptVoucher_customer_id_fkey`(`customer_id`),
    INDEX `receiptVoucher_logId_fkey`(`logId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customerBillBalance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `balance` DOUBLE NULL,
    `hallMarkBal` DOUBLE NULL,
    `initialBalance` DOUBLE NULL,
    `customer_id` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `customerBillBalance_customer_id_key`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contactNumber` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `gstOrBusinessId` VARCHAR(191) NULL,
    `openingBalance` DOUBLE NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `supplierName` VARCHAR(191) NULL,
    `jewelName` VARCHAR(191) NOT NULL,
    `grossWeight` DOUBLE NOT NULL,
    `stoneWeight` DOUBLE NOT NULL,
    `netWeight` DOUBLE NOT NULL,
    `wastage` DOUBLE NOT NULL,
    `touch` DOUBLE NOT NULL,
    `finalPurity` DOUBLE NOT NULL,
    `moveTo` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseEntry_supplierId_fkey`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_stock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entryId` INTEGER NULL,
    `supplierId` INTEGER NOT NULL,
    `jewelName` VARCHAR(191) NOT NULL,
    `grossWeight` DOUBLE NOT NULL,
    `stoneWeight` DOUBLE NOT NULL,
    `netWeight` DOUBLE NOT NULL,
    `wastage` DOUBLE NOT NULL,
    `touch` DOUBLE NOT NULL,
    `finalPurity` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseStock_entryId_fkey`(`entryId`),
    INDEX `PurchaseStock_supplierId_fkey`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repairstock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `goldsmithId` INTEGER NULL,
    `source` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `sentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `receivedDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'InRepair',
    `itemName` VARCHAR(191) NULL,
    `grossWeight` DOUBLE NULL,
    `netWeight` DOUBLE NULL,
    `purity` DOUBLE NULL,

    INDEX `repairstock_productId_idx`(`productId`),
    INDEX `repairstock_goldsmithId_idx`(`goldsmithId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepairLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `repairId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `returnLogs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `billId` INTEGER NULL,
    `orderItemId` INTEGER NULL,
    `productStockId` INTEGER NULL,
    `productName` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `count` INTEGER NOT NULL,
    `reason` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_logId_fkey` FOREIGN KEY (`logId`) REFERENCES `RawGoldLogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Entry` ADD CONSTRAINT `Entry_logId_fkey` FOREIGN KEY (`logId`) REFERENCES `RawGoldLogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_order` ADD CONSTRAINT `customer_order_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_multiple_images` ADD CONSTRAINT `product_multiple_images_customer_order_id_fkey` FOREIGN KEY (`customer_order_id`) REFERENCES `customer_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BullionPurchase` ADD CONSTRAINT `BullionPurchase_bullionId_fkey` FOREIGN KEY (`bullionId`) REFERENCES `MasterBullion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GivenDetail` ADD CONSTRAINT `GivenDetail_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `BullionPurchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jobcard` ADD CONSTRAINT `Jobcard_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `givenGold` ADD CONSTRAINT `givenGold_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `goldsmith`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `givenGold` ADD CONSTRAINT `givenGold_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `givenGold` ADD CONSTRAINT `givenGold_logId_fkey` FOREIGN KEY (`logId`) REFERENCES `RawGoldLogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itemDelivery` ADD CONSTRAINT `itemDelivery_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `goldsmith`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itemDelivery` ADD CONSTRAINT `itemDelivery_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deduction` ADD CONSTRAINT `deduction_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `itemDelivery`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Total` ADD CONSTRAINT `Total_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Total` ADD CONSTRAINT `Total_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receivedsection` ADD CONSTRAINT `Receivedsection_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receivedsection` ADD CONSTRAINT `Receivedsection_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receivedsection` ADD CONSTRAINT `Receivedsection_logId_fkey` FOREIGN KEY (`logId`) REFERENCES `RawGoldLogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawgoldStock` ADD CONSTRAINT `RawgoldStock_touchId_fkey` FOREIGN KEY (`touchId`) REFERENCES `MasterTouch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawGoldLogs` ADD CONSTRAINT `RawGoldLogs_rawGoldStockId_fkey` FOREIGN KEY (`rawGoldStockId`) REFERENCES `RawgoldStock`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseTracker` ADD CONSTRAINT `ExpenseTracker_logId_fkey` FOREIGN KEY (`logId`) REFERENCES `RawGoldLogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Balances` ADD CONSTRAINT `Balances_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repair` ADD CONSTRAINT `Repair_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `goldsmith`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productstock` ADD CONSTRAINT `productstock_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `itemDelivery`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productstock` ADD CONSTRAINT `productstock_jobcardId_fkey` FOREIGN KEY (`jobcardId`) REFERENCES `Jobcard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bill` ADD CONSTRAINT `Bill_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItems` ADD CONSTRAINT `OrderItems_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `Bill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billReceived` ADD CONSTRAINT `billReceived_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `Bill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billReceived` ADD CONSTRAINT `billReceived_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billReceived` ADD CONSTRAINT `billReceived_logId_fkey` FOREIGN KEY (`logId`) REFERENCES `RawGoldLogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiptVoucher` ADD CONSTRAINT `receiptVoucher_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receiptVoucher` ADD CONSTRAINT `receiptVoucher_logId_fkey` FOREIGN KEY (`logId`) REFERENCES `RawGoldLogs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customerBillBalance` ADD CONSTRAINT `customerBillBalance_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_entries` ADD CONSTRAINT `purchase_entries_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_stock` ADD CONSTRAINT `purchase_stock_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `purchase_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_stock` ADD CONSTRAINT `purchase_stock_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repairstock` ADD CONSTRAINT `repairstock_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `productstock`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repairstock` ADD CONSTRAINT `repairstock_goldsmithId_fkey` FOREIGN KEY (`goldsmithId`) REFERENCES `goldsmith`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returnLogs` ADD CONSTRAINT `returnLogs_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `Bill`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returnLogs` ADD CONSTRAINT `returnLogs_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItems`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `returnLogs` ADD CONSTRAINT `returnLogs_productStockId_fkey` FOREIGN KEY (`productStockId`) REFERENCES `productstock`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
