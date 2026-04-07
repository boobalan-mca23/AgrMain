const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testSync() {
  console.log("--- Starting Balance Sync Test ---");

  try {
    // 1. Create a Test Supplier
    const supplier = await prisma.supplier.create({
      data: {
        name: "Test Sync Supplier " + Date.now(),
        openingBalance: 100.0, // Initial balance
      },
    });
    console.log(`Created Supplier: ${supplier.name}, Initial Balance: ${supplier.openingBalance}`);

    // 2. Mock a BC Purchase (PurchaseEntry)
    // In our controller, we add goldBalance to openingBalance
    const goldBalance = 50.0;
    const entry = await prisma.purchaseEntry.create({
      data: {
        supplierId: supplier.id,
        jewelName: "Test Jewel",
        grossWeight: 100,
        stoneWeight: 0,
        netWeight: 100,
        touch: 50,
        wastageType: "%",
        wastage: 0,
        wastagePure: 0,
        actualPure: 50,
        finalPurity: 50,
        advanceGold: 100,
        goldBalance: goldBalance, // 100 - 50 = 50
        moveTo: "purchase",
      },
    });
    console.log(`Created BC Purchase Entry with goldBalance: ${entry.goldBalance}`);

    // Update Supplier Balance (Logic from controller)
    let updatedSupplier = await prisma.supplier.update({
      where: { id: supplier.id },
      data: { openingBalance: supplier.openingBalance + entry.goldBalance },
    });
    console.log(`Supplier Balance after BC Purchase: ${updatedSupplier.openingBalance} (Expected: 150)`);

    // 3. Mock Receiving Gold (BC Purchase)
    const weightToReceive = 20.0;
    await prisma.purchaseReceivedGold.create({
      data: {
        purchaseEntryId: entry.id,
        weight: weightToReceive,
        touch: 100,
      },
    });
    console.log(`Recorded Gold Receipt: ${weightToReceive}g`);

    // Update Supplier Balance (Logic from controller)
    updatedSupplier = await prisma.supplier.update({
      where: { id: supplier.id },
      data: { openingBalance: updatedSupplier.openingBalance - weightToReceive },
    });
    console.log(`Supplier Balance after Gold Receipt: ${updatedSupplier.openingBalance} (Expected: 130)`);

    // 4. Mock an Item Purchase Entry
    // (We know Item Purchase already works, but let's verify receipts for it)
    const itemEntry = await prisma.itemPurchaseEntry.create({
      data: {
        supplierId: supplier.id,
        itemName: "Test Item",
        grossWeight: 200,
        stoneWeight: 0,
        netWeight: 200,
        touch: 50,
        wastageType: "%",
        wastage: 0,
        wastagePure: 0,
        actualPure: 100,
        finalPurity: 100,
        advanceGold: 120,
        goldBalance: 20.0, // 120 - 100 = 20
      },
    });
    console.log(`Created Item Purchase Entry with goldBalance: ${itemEntry.goldBalance}`);

    // Update Supplier Balance (Logic from controller)
    updatedSupplier = await prisma.supplier.update({
      where: { id: supplier.id },
      data: { openingBalance: updatedSupplier.openingBalance + itemEntry.goldBalance },
    });
    console.log(`Supplier Balance after Item Purchase: ${updatedSupplier.openingBalance} (Expected: 150)`);

    // 5. Mock Receiving Gold (Item Purchase)
    const itemWeightToReceive = 10.0;
    await prisma.itemPurchaseReceivedGold.create({
      data: {
        itemPurchaseEntryId: itemEntry.id,
        weight: itemWeightToReceive,
        touch: 100,
      },
    });
    console.log(`Recorded Item Gold Receipt: ${itemWeightToReceive}g`);

    // Update Supplier Balance (Logic from controller)
    updatedSupplier = await prisma.supplier.update({
      where: { id: supplier.id },
      data: { openingBalance: updatedSupplier.openingBalance - itemWeightToReceive },
    });
    console.log(`Supplier Balance after Item Gold Receipt: ${updatedSupplier.openingBalance} (Expected: 140)`);

    // Cleanup
    await prisma.purchaseReceivedGold.deleteMany({ where: { purchaseEntryId: entry.id } });
    await prisma.itemPurchaseReceivedGold.deleteMany({ where: { itemPurchaseEntryId: itemEntry.id } });
    await prisma.purchaseEntry.delete({ where: { id: entry.id } });
    await prisma.itemPurchaseEntry.delete({ where: { id: itemEntry.id } });
    await prisma.supplier.delete({ where: { id: supplier.id } });
    console.log("Cleanup complete.");

    if (updatedSupplier.openingBalance === 140) {
      console.log("--- SUCCESS: All balance synchronizations verified! ---");
    } else {
      console.log("--- FAILURE: Balance mismatch! ---");
    }

  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();
