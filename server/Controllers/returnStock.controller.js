const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// const returnCustomerItem = async (req, res) => {
//   const { billId, orderItemId, reason } = req.body;

//   try {
//     const result = await prisma.$transaction(async (tx) => {

//       const item = await tx.orderItems.findUnique({
//         where: { id: Number(orderItemId) }
//       });

//       if (!item) throw new Error("Item not found");

//       if (item.repairStatus === "IN_REPAIR")
//         throw new Error("Item is in repair");

//       await tx.productStock.create({
//         data: {
//           itemName: item.productName,
//           itemWeight: item.weight,
//           stoneWeight: item.stoneWeight,
//           netWeight: item.afterWeight || item.weight,
//           finalPurity: item.finalPurity,
//           count: item.count,
//           touch: item.touch,
//           wastageValue  : item.wastageValue,
//           wastagePure   : item.wastagePure,
//           isBillProduct: true,
//           isActive: true,
//           source: "CUSTOMER_RETURN",
//         }
//       });

//       await tx.orderItems.update({
//         where: { id: item.id },
//         data: { repairStatus: "RETURNED" }
//       });

//       await tx.returnLogs.create({
//         data: {
//             billId: Number(billId),
//             orderItemId: item.id,
//             productName: item.productName,
//             weight: item.weight,
//             count: item.count || 1,
//             reason: reason || "Customer return",
//             source: "CUSTOMER"
//         }
//         });


//       return true;
//     });

//     res.json({ success: true });

//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };
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

      // Define weights for comparison and split logic at the start
      const originalWeight = (Number(item.weight) || 0).toFixed(3);
      const returnedWeight = (Number(itemWeight) || 0).toFixed(3);

      const bill = await tx.bill.findUnique({
        where: { id: Number(billId) },
        select: { customer_id: true }
      });

      if (!bill) throw new Error("Bill not found");

      const customerBalance = await tx.customerBillBalance.findUnique({
        where: { customer_id: bill.customer_id }
      });

      const isFull = item.stockType === "ITEM_PURCHASE" || (Number(originalWeight) <= Number(returnedWeight));
      const hallmarkReduction = isFull ? Number(currentHallmark) : 0;
      const fwtReduction = isFull ? (Number(item.finalWeight) || 0) : Number(finalWeight);

      if (customerBalance) {
        await tx.customerBillBalance.update({
          where: { customer_id: bill.customer_id },
          data: {
            balance: customerBalance.balance - fwtReduction,
            hallMarkBal: customerBalance.hallMarkBal - hallmarkReduction
          }
        });
      } else {
        await tx.customerBillBalance.create({
          data: {
            customer_id: bill.customer_id,
            balance: -fwtReduction, // Note: if coming from a return, we usually subtract from balance
            initialBalance: -fwtReduction,
            hallMarkBal: -hallmarkReduction
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

      //  CREATE STOCK ENTRY BASED ON STOCK TYPE
      let product;
      if (item.stockType === "ITEM_PURCHASE") {

        // Return to Item Purchase Stock
        const originalEntry = item.stockId
          ? await tx.itemPurchaseEntry.findUnique({ where: { id: item.stockId } })
          : null;

        let supplierId = originalEntry?.supplierId || 1;
        let supplierName = originalEntry?.supplierName || null;

        // Verify if the supplierId exists, otherwise fallback to first available
        const existingSupplier = await tx.supplier.findUnique({ where: { id: supplierId } });
        if (!existingSupplier) {
          const firstSupplier = await tx.supplier.findFirst();
          if (firstSupplier) {
            supplierId = firstSupplier.id;
            supplierName = firstSupplier.name;
          }
        }

        product = await tx.itemPurchaseEntry.create({
          data: {
            supplierId: supplierId,
            supplierName: supplierName,
            itemName: item.productName,
            grossWeight: Number(itemWeight),
            stoneWeight: Number(stoneWeight) || 0,
            netWeight: Number(netWeight),
            touch: Number(touch) || 0,
            wastageType: item.wastageType || "None",
            wastage: Number(wastageValue) || 0,
            wastagePure: Number(wastagePureDelta) || 0,
            actualPure: Number(actualPurityDelta) || 0,
            finalPurity: Number(finalPurityDelta),
            isSold: false,
            isInRepair: false,
            source: "CUSTOMER_RETURN",
            moveTo: "CUSTOMER_RETURN",
          }
        });
      } else {
        // Return to Product Stock
        product = await tx.productStock.create({
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
      }

      if (item.stockType !== "ITEM_PURCHASE" && Number(originalWeight) > Number(returnedWeight)) {
        // Partial Return: Deduct from original
        const remainingWeight = originalWeight - returnedWeight;
        const remainingStoneWeight = (Number(item.stoneWeight) || 0) - (Number(stoneWeight) || 0);
        const remainingNetWeight = (Number(item.afterWeight || item.netWeight) || 0) - (Number(netWeight) || 0);
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

        let newStatus = "PARTIAL_RETURN";
        if (item.repairStatus === "PARTIAL_REPAIR") {
          newStatus = "PARTIAL_REPAIR_RETURN";
        }

        // 1. Update original item remaining values (keeping to 3 decimal places)
        await tx.orderItems.update({
          where: { id: item.id },
          data: {
            weight: Number(remainingWeight.toFixed(3)),
            stoneWeight: Number(remainingStoneWeight.toFixed(3)),
            netWeight: Number(remainingNetWeight.toFixed(3)),
            afterWeight: Number(remainingNetWeight.toFixed(3)),
            count: remainingCount,
            actualPurity: Number(remActualPurity.toFixed(3)),
            wastagePure: Number(remWastagePure.toFixed(3)),
            finalPurity: Number(remFinalPurity.toFixed(3)),
            finalWeight: Number(((remainingNetWeight * Number(item.percentage || 0)) / 100).toFixed(3)),
            repairStatus: newStatus
          }
        });

      } else {
        // Full Return
        await tx.orderItems.update({
          where: { id: item.id },
          data: { repairStatus: "RETURNED" }
        });

        // All items returned logic removed because Bill model does not have a status field.
        // The frontend already handles bill filtering based on OrderItems repairStatus.
      }

      //  RETURN LOG
      await tx.returnLogs.create({
        data: {
          billId: Number(billId),
          orderItemId: item.id,
          productStockId: item.stockType === "ITEM_PURCHASE" ? null : product.id,
          itemPurchaseId: item.stockType === "ITEM_PURCHASE" ? product.id : null,
          productName: item.productName,
          weight: Number(itemWeight),
          count: Number(count) || 1,
          reason: reason || "Customer return",
          source: "CUSTOMER"
        }
      });
    });

    const updatedOrderItem = await prisma.orderItems.findUnique({
      where: { id: Number(orderItemId) }
    });

    res.json({ success: true, updatedOrderItem });

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

      // Bill status update removed as Bill model does not have a status field.
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
        },
        product: true,
        itemPurchase: true,
        orderItem: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: returns });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch returned stock" });
  }
};

module.exports = { returnCustomerBill, returnCustomerItem, getReturnedProducts, getReturnedStock };
