const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const returnCustomerItem = async (req, res) => {
  const {
    billId,
    orderItemId,
    reason,
    currentHallmark,
    itemWeight,
    touch,
    count,
    stoneWeight,
    wastageType,
    wastageValue,
    wastagePure,
    netWeight,
    finalPurity,
    finalWeight,
  } = req.body;

  try {
    console.log("hi Return Request Body:", req.body);
    await prisma.$transaction(async (tx) => {

      const item = await tx.orderItems.findUnique({
        where: { id: Number(orderItemId) }
      });

      if (!item) throw new Error("Item not found");

      const bill = await tx.bill.findUnique({
        where: { id: Number(billId) },
        select: { customer_id: true }
      });

      if (!bill) throw new Error("Bill not found");

      const customerBalance = await tx.customerBillBalance.findUnique({
        where: { customer_id: bill.customer_id }
      });

      if (customerBalance) {
        await tx.customerBillBalance.update({
          where: { customer_id: bill.customer_id },
          data: {
            balance: customerBalance.balance - Number(finalWeight),
            hallMarkBal: customerBalance.hallMarkBal - Number(currentHallmark)
          }
        });
      } else {
        await tx.customerBillBalance.create({
          data: {
            customer_id: bill.customer_id,
            balance: Number(finalWeight),
            initialBalance: Number(finalWeight)
          }
        });
      }


      if (item.repairStatus === "IN_REPAIR")
        throw new Error("Item is in repair");

      const actualPurityDelta = (netWeight * touch) / 100;

      let wastagePureDelta = 0;
      let finalPurityDelta = 0;

      if (wastageType === "Touch") {
        finalPurityDelta = (netWeight * wastageValue) / 100;
        wastagePureDelta = finalPurityDelta - actualPurityDelta;

      } else if (wastageType === "%") {
        const wastageWeight = (netWeight * wastageValue) / 100;
        const finalWastewt = netWeight + wastageWeight;
        finalPurityDelta = (finalWastewt * touch) / 100;
        wastagePureDelta = finalPurityDelta - actualPurityDelta;

      } else if (wastageType === "+") {
        const wastageWeight = netWeight + wastageValue;
        finalPurityDelta = (wastageWeight * touch) / 100;
        wastagePureDelta = finalPurityDelta - actualPurityDelta;
      }

      //  CREATE PRODUCT STOCK USING QC VALUES
      const product = await tx.productStock.create({
        data: {
          itemName: item.productName,
          itemWeight: Number(itemWeight),
          touch: Number(touch) || null,
          count: Number(count) || 1,
          stoneWeight: Number(stoneWeight) || 0,
          wastageValue: Number(wastageValue) || 0,
          wastageType: item.wastageType || null,
          netWeight: Number(netWeight),
          wastagePure: Number(wastagePureDelta) || 0,
          finalPurity: Number(finalPurityDelta),
          isBillProduct: false,
          isActive: true,
          source: "CUSTOMER_RETURN",
        }
      });

      // Split logic to support partial returns
      const originalWeight = Number(item.weight) || 0;
      const returnedWeight = Number(itemWeight) || 0;
      let returnOrderItemId = item.id;

      if (originalWeight > returnedWeight) {
        // Partial Return: Deduct from original
        const remainingWeight = originalWeight - returnedWeight;
        const remainingStoneWeight = (Number(item.stoneWeight) || 0) - (Number(stoneWeight) || 0);
        const remainingNetWeight = (Number(item.netWeight) || 0) - (Number(netWeight) || 0);
        const remainingCount = (Number(item.count) || 0) - (Number(count) || 0);

        // Recalculate purities for the remaining item
        const remActualPurity = (remainingNetWeight * Number(item.touch || 0)) / 100;
        let remWastagePure = 0;
        let remFinalPurity = 0;

        if (item.wastageType === "Touch") {
          remFinalPurity = (remainingNetWeight * Number(item.wastageValue || 0)) / 100;
          remWastagePure = remFinalPurity - remActualPurity;
        } else if (item.wastageType === "%") {
          const wWeight = (remainingNetWeight * Number(item.wastageValue || 0)) / 100;
          remFinalPurity = ((remainingNetWeight + wWeight) * Number(item.touch || 0)) / 100;
          remWastagePure = remFinalPurity - remActualPurity;
        } else if (item.wastageType === "+") {
          remFinalPurity = ((remainingNetWeight + Number(item.wastageValue || 0)) * Number(item.touch || 0)) / 100;
          remWastagePure = remFinalPurity - remActualPurity;
        }

        // 1. Update original item remaining values
        await tx.orderItems.update({
          where: { id: Number(orderItemId) },
          data: {
            weight: remainingWeight,
            stoneWeight: remainingStoneWeight,
            netWeight: remainingNetWeight,
            count: remainingCount,
            actualPurity: remActualPurity,
            wastagePure: remWastagePure,
            finalPurity: remFinalPurity,
            finalWeight: remainingNetWeight // assuming finalWeight correlates here
          }
        });

        // 2. Create the returned line item
        const newReturnItem = await tx.orderItems.create({
          data: {
            billId: Number(billId),
            productName: item.productName,
            count: Number(count) || 0,
            weight: returnedWeight,
            stoneWeight: Number(stoneWeight) || 0,
            afterWeight: Number(netWeight) || 0,
            netWeight: Number(netWeight) || 0,
            touch: Number(touch),
            wastageType: wastageType,
            wastageValue: Number(wastageValue),
            actualPurity: actualPurityDelta, // Derived natively above
            wastagePure: wastagePureDelta,
            finalPurity: finalPurityDelta,
            percentage: finalPurityDelta,
            repairStatus: "RETURNED"
          }
        });

        returnOrderItemId = newReturnItem.id;
      } else {
        // Full Return
        //  UPDATE ORDER ITEM
        await tx.orderItems.update({
          where: { id: item.id },
          data: { repairStatus: "RETURNED" }
        });
      }

      //  RETURN LOG
      await tx.returnLogs.create({
        data: {
          billId: Number(billId),
          orderItemId: returnOrderItemId,
          productStockId: product.id,
          productName: item.productName,
          weight: Number(itemWeight),
          count: Number(count) || 1,
          reason: reason || "Customer return",
          source: "CUSTOMER"
        }
      });
    });

    res.json({ success: true });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
const returnCustomerBill = async (req, res) => {
  const { billId } = req.body;

  try {
    await prisma.$transaction(async (tx) => {

      const items = await tx.orderItems.findMany({
        where: { billId: Number(billId) }
      });

      if (items.length === 0) {
        throw new Error("No items found for this bill");
      }


      const hasRepair = items.some(
        item => item.repairStatus === "IN_REPAIR"
      );

      if (hasRepair) {
        throw new Error("Cannot return bill while items are in repair");
      }


      const allReturned = items.every(
        item => item.repairStatus === "RETURNED"
      );

      if (!allReturned) {
        throw new Error("Return all items before returning bill");
      }

      await tx.bill.update({
        where: { id: Number(billId) },
        data: { status: "RETURNED" }
      });
    });

    res.json({ success: true });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



const getReturnedProducts = async (req, res) => {
  const returns = await prisma.returnLogs.findMany({
    include: {
      product: true,
      bill: true,
      orderItem: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ success: true, returns });
};

const getReturnedStock = async (req, res) => {
  try {
    const returns = await prisma.returnLogs.findMany({
      include: {
        bill: {
          select: {
            id: true,
            customers: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: returns });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch returned stock" });
  }
};

module.exports = { returnCustomerBill, returnCustomerItem, getReturnedProducts, getReturnedStock };
