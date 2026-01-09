const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const returnCustomerItem = async (req, res) => {
  const { billId, orderItemId, reason } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {

      const item = await tx.orderItems.findUnique({
        where: { id: Number(orderItemId) }
      });

      if (!item) throw new Error("Item not found");

      if (item.repairStatus === "IN_REPAIR")
        throw new Error("Item is in repair");

      await tx.productStock.create({
        data: {
          itemName: item.productName,
          itemWeight: item.weight,
          stoneWeight: item.stoneWeight,
          netWeight: item.afterWeight || item.weight,
          finalPurity: item.percentage,
          count: item.count || 1,
          isBillProduct: true,
          isActive: true
        }
      });

      await tx.orderItems.update({
        where: { id: item.id },
        data: { repairStatus: "RETURNED" }
      });

      await tx.returnLogs.create({
        data: {
            billId: Number(billId),
            orderItemId: item.id,
            productName: item.productName,
            weight: item.weight,
            count: item.count || 1,
            reason: reason || "Customer return",
            source: "CUSTOMER"
        }
        });


      return true;
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