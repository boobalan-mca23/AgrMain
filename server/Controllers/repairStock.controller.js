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
  const { productId, goldsmithId, reason } = req.body;

  try {
    if (!productId)
      return res.status(400).json({ msg: "productId is required" });

    const result = await prisma.$transaction(async (tx) => {

      const product = await tx.productStock.findUnique({
        where: { id: Number(productId) }
      });

      if (!product) throw new Error("Product not found");
      if (!product.isActive) throw new Error("Product already inactive / in repair");

      // check duplicate repair
      const existing = await tx.repairStock.findFirst({
        where: { productId: product.id, status: "InRepair" }
      });

      if (existing) throw new Error("Product already in repair");

      await tx.productStock.update({
        where: { id: product.id },
        data: { isActive: false }
      });

      return await tx.repairStock.create({
        data: {
          productId: product.id,
          goldsmithId: goldsmithId ? Number(goldsmithId) : null,
          reason: reason || null,
          status: "InRepair",
          itemName: product.itemName,
          grossWeight: product.itemWeight,
          netWeight: product.netWeight,
          purity: product.finalPurity,
        },
      });
    });

    res.status(200).json({
      msg: "Product sent to repair",
      repair: result
    });

  } catch (err) {
    console.log(err);
    res.status(400).json({ err: err.message });
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

      if ((repair.status || "").toLowerCase() === "returned")
        throw new Error("Item already returned");

      await tx.productStock.update({
        where: { id: repair.productId },
        data: { isActive: true },
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


module.exports = { getAllRepairStock, sendToRepair, returnFromRepair };
