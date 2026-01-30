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

      //  UPDATE ORDER ITEM
      await tx.orderItems.update({
        where: { id: item.id },
        data: { repairStatus: "RETURNED" }
      });

      //  RETURN LOG
      await tx.returnLogs.create({
        data: {
          billId: Number(billId),
          orderItemId: item.id,
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
