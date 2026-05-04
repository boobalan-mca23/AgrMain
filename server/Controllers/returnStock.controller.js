const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const recalculateBillProfit = require("../Utils/recalculateBillProfit");

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

const combineStatus = (current, action) => {
  if (!current || current === "NONE" || current === "SOLD") return action;
  if (current.includes(action)) return current;
  return `${action} (${current})`;
};
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
    percentage,
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
        select: { customer_id: true, hallmarkQty: true }
      });
      
      if (!bill) throw new Error("Bill not found");

      const reductionCount = Math.min(Number(count || 1), Number(bill.hallmarkQty || 0));

      const customerBalance = await tx.customerBillBalance.findUnique({
        where: { customer_id: bill.customer_id }
      });

      const isFull = Number(originalWeight) <= Number(returnedWeight);
      const hallmarkReduction = Number(currentHallmark) * reductionCount;
      
      // Use the updated finalWeight/finalPurity from the request, as it reflects the user's manual QC correction.
      // We only fallback to the original record if the request params are missing or zero.
      const fwtReduction = (Number(finalWeight) || Number(finalPurity) || 0) || (Number(item.finalWeight) || Number(item.finalPurity) || 0);

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
        // Fetch original ItemPurchaseEntry to get supplierId and other required fields
        let supplierId = null;
        if (item.stockId) {
          const originalEntry = await tx.itemPurchaseEntry.findUnique({
            where: { id: item.stockId }
          });
          if (originalEntry) supplierId = originalEntry.supplierId;
        }
        // Fallback to first available supplier if still null
        if (!supplierId) {
          const firstSupplier = await tx.supplier.findFirst();
          supplierId = firstSupplier?.id || null;
        }

        // Create a NEW ItemPurchaseEntry record for the returned portion
        product = await tx.itemPurchaseEntry.create({
          data: {
            itemName: item.productName || "Returned Item",
            supplierId,
            count: Number(count) || 1,
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
            isBilled: false,
            isInRepair: false,
            source: "CUSTOMER_RETURN",
            moveTo: "CUSTOMER_RETURN",
            createdAt: new Date()
          }
        });
        console.log("SUCCESS: Created NEW ItemPurchaseEntry for return. ID:", product.id);
      }
 else {
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

      if (Number(originalWeight) > Number(returnedWeight)) {
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
            repairStatus: combineStatus(item.repairStatus, "PARTIAL_RETURN")
          }
        });

        // Decrement Hallmark Qty on Bill for partial returns too
        if (reductionCount > 0) {
          await tx.bill.update({
            where: { id: Number(billId) },
            data: { hallmarkQty: { decrement: reductionCount } }
          });
        }

      } else {
        // Full Return
        await tx.orderItems.update({
          where: { id: item.id },
          data: { 
            repairStatus: combineStatus(item.repairStatus, "RETURNED"),
            weight: 0,
            count: 0,
            netWeight: 0,
            afterWeight: 0,
            finalWeight: 0,
            actualPurity: 0,
            wastagePure: 0,
            finalPurity: 0
          }
        });

        // Decrement Hallmark Qty on Bill for full returns
        if (reductionCount > 0) {
          await tx.bill.update({
            where: { id: Number(billId) },
            data: { hallmarkQty: { decrement: reductionCount } }
          });
        }
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
          awt: Number(netWeight),
          pureGoldReduction: Number(fwtReduction),
          hallmarkReduction: Number(hallmarkReduction),
          fwt: Number(fwtReduction),
          count: Number(count) || 1,
          stoneWeight: Number(stoneWeight || item.stoneWeight || 0),
          enteredStoneWeight: Number(stoneWeight || 0),
          touch: Number(touch || item.touch || 0),
          percentage: Number(percentage || item.percentage || 0),
          reason: reason || "Customer return",
          source: "CUSTOMER"
        }
      });

      // Recalculate Bill Profits
      await recalculateBillProfit(Number(billId), tx);
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
