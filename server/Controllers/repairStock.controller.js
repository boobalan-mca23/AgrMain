const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllRepairStock = async (req, res) => {
  try {
    const {
      status,
      goldsmith,
      from,
      to,
      search,
      page = 1,
      limit = 50
    } = req.query;

    const where = { AND: [] };

    // STATUS FILTER
    if (status && status !== "All") {
      where.AND.push({ status });
    }

    if (req.query.source) {
      where.AND.push({ source: req.query.source });
    }

    // GOLDSMITH FILTER
    if (goldsmith) {
      where.AND.push({ goldsmithId: Number(goldsmith) });
    }

    // DATE RANGE
    if (from || to) {
      const range = {};
      if (from) range.gte = new Date(from + "T00:00:00");
      if (to)   range.lte = new Date(to + "T23:59:59");

      where.AND.push({ sentDate: range });
    }

    // SEARCH FILTER
    if (search?.trim()) {
      where.AND.push({
        OR: [
          { itemName: { contains: search, mode: "insensitive" } },
          { product: { itemName: { contains: search, mode: "insensitive" } } }
        ]
      });
    }

    // PAGINATION
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    // TOTAL
    const total = await prisma.repairStock.count({ where });

    // DATA
    const repairs = await prisma.repairStock.findMany({
      where,
      include: { product: true, goldsmith: true },
      orderBy: { sentDate: "desc" },
      skip,
      take
    });

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      limit: take,
      count: repairs.length,
      repairs
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err.message });
  }
};

const sendToRepair = async (req, res) => {
  const { productId, goldsmithId, reason, source } = req.body;
  console.log("Received sendToRepair:", { productId, goldsmithId, reason, source });
  try {
    if (!productId) throw new Error("productId is required");
    if (!source || !["CUSTOMER", "GOLDSMITH"].includes(source))
      throw new Error("Invalid source");

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.productStock.findUnique({
        where: { id: Number(productId) }
      });

      if (!product) throw new Error("Product not found");
      if (!product.isActive) throw new Error("Product already in repair");

      if (source === "GOLDSMITH") {
        const g = await tx.goldsmith.findUnique({
          where: { id: Number(goldsmithId) }
        });
        if (!g) throw new Error("Invalid goldsmith");
      }

      const existing = await tx.repairStock.findFirst({
        where: { productId: product.id, status: "InRepair" }
      });
      if (existing) throw new Error("Already in repair");

      await tx.productStock.update({
        where: { id: product.id },
        data: { isActive: false }
      });

      const repair = await tx.repairStock.create({
        data: {
          productId: product.id,
          goldsmithId: source === "GOLDSMITH" ? Number(goldsmithId) : null,
          source,
          reason: reason || null,
          itemName: product.itemName,
          grossWeight: product.itemWeight,
          netWeight: product.netWeight,
          purity: product.finalPurity,
        }
      });

      await tx.repairLogs.create({
        data: {
          repairId: repair.id,
          action: "SENT_TO_REPAIR",
          note: reason || null,
        }
      });

      return repair;
    });

    res.json({ success: true, repair: result });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



const returnFromRepair = async (req, res) => {
  const { repairId } = req.body;

  try {
    if (!repairId)
      return res.status(400).json({ msg: "repairId is required" });

    const result = await prisma.$transaction(async (tx) => {

      const repair = await tx.repairStock.findUnique({
        where: { id: Number(repairId) }
      });

      if (!repair) throw new Error("Repair record not found");

      if (repair.status !== "InRepair") {
      throw new Error("Repair already completed");
    }


      await tx.productStock.update({
        where: { id: repair.productId },
        data: { isActive: true },
      });

      await tx.repairLogs.create({
      data: {
        repairId: repair.id,
        action: "RETURNED_FROM_REPAIR",
      },
    });


      await tx.repairStock.update({
        where: { id: repair.id },
        data: { status: "Returned", receivedDate: new Date() },
      });

      return await tx.repairStock.findUnique({
        where: { id: repair.id },
        include: { product: true, goldsmith: true }
      });
    });

    res.status(200).json({
      msg: "Product returned from repair",
      repair: result
    });

  } catch (err) {
    console.log(err);
    res.status(400).json({ err: err.message });
  }
};




const sendCustomerItemToRepair = async (req, res) => {
  const {
    billId,
    orderItemId,
    reason
  } = req.body;

  try {
    if (!billId || !orderItemId)
      throw new Error("billId and orderItemId are required");

    const result = await prisma.$transaction(async (tx) => {

      const orderItem = await tx.orderItems.findUnique({
        where: { id: Number(orderItemId) },
        include: { bill: true }
      });

      if (!orderItem) throw new Error("Order item not found");

      
      const productStock = await tx.productStock.create({
        data: {
          itemName: orderItem.productName,
          itemWeight: orderItem.weight,
          stoneWeight: orderItem.stoneWeight,
          netWeight: orderItem.afterWeight || orderItem.weight,
          finalPurity: orderItem.percentage,
          count: orderItem.count || 1,
          isBillProduct: true,
          isActive: false // immediately inactive → in repair
        }
      });

      const repair = await tx.repairStock.create({
        data: {
          productId: productStock.id,
          source: "CUSTOMER",
          reason: reason || null,
          itemName: productStock.itemName,
          grossWeight: productStock.itemWeight,
          netWeight: productStock.netWeight,
          purity: productStock.finalPurity,
        }
      });

     await tx.orderItems.update({
        where: { id: Number(orderItemId) },
        data: { repairStatus: "IN_REPAIR" }
      });


      await tx.repairLogs.create({
        data: {
          repairId: repair.id,
          action: "CUSTOMER_SENT_TO_REPAIR",
          note: reason || null
        }
      });

      return repair;
    });

    res.json({
      success: true,
      msg: "Customer item sent to repair",
      repair: result
    });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

const sendCustomerBillToRepair = async (req, res) => {
  const { billId, reason } = req.body;

  if (!billId) {
    return res.status(400).json({ error: "billId is required" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const items = await tx.orderItems.findMany({
        where: {
          billId: Number(billId),
          repairStatus: { not: "IN_REPAIR" }
        }
      });

      if (items.length === 0) {
        throw new Error("No items available for repair");
      }

      for (const item of items) {
        const productStock = await tx.productStock.create({
          data: {
            itemName: item.productName,
            itemWeight: item.weight,
            stoneWeight: item.stoneWeight,
            netWeight: item.afterWeight || item.weight,
            finalPurity: item.percentage,
            count: item.count || 1,
            isBillProduct: true,
            isActive: false
          }
        });

        const repair = await tx.repairStock.create({
          data: {
            productId: productStock.id,
            source: "CUSTOMER",
            reason: reason || null,
            itemName: productStock.itemName,
            grossWeight: productStock.itemWeight,
            netWeight: productStock.netWeight,
            purity: productStock.finalPurity
          }
        });

        await tx.orderItems.update({
          where: { id: item.id },
          data: { repairStatus: "IN_REPAIR" }
        });

        await tx.repairLogs.create({
          data: {
            repairId: repair.id,
            action: "CUSTOMER_BILL_SENT_TO_REPAIR",
            note: reason || null
          }
        });
      }
    });

    res.json({ success: true, msg: "Entire bill sent to repair" });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


module.exports = { sendCustomerBillToRepair, sendCustomerItemToRepair, getAllRepairStock, sendToRepair, returnFromRepair };
