const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();


// =============================
// HELPERS
// =============================

const round3 = (n) =>
  Number.isFinite(n) ? Number(n.toFixed(3)) : 0;

const toNumber = (v, fallback = 0) => {

  if (v === null || v === undefined || v === "")
    return fallback;

  const n = Number(v);

  return Number.isFinite(n) ? n : fallback;

};


// =============================
// CALCULATE VALUES
// =============================

const calculateValues = ({
  advanceGold,
  grossWeight,
  stoneWeight,
  touch,
  wastageType,
  wastage
}) => {

  const gross = round3(toNumber(grossWeight));
  const stone = round3(toNumber(stoneWeight));
  const tc = round3(toNumber(touch));
  const ws = round3(toNumber(wastage));
  const advance = round3(toNumber(advanceGold));

  const netWeight = round3(gross - stone);

  const actualPure = round3((netWeight * tc) / 100);

  let finalPurity = 0;

  if (wastageType === "%") {

    const A = round3((netWeight * ws) / 100);
    const B = round3(netWeight + A);

    finalPurity = round3((B * tc) / 100);

  }

  if (wastageType === "Touch") {

    finalPurity = round3((netWeight * ws) / 100);

  }

  if (wastageType === "+") {

    const A = round3(netWeight + ws);

    finalPurity = round3((A * tc) / 100);

  }

  const wastagePure = round3(finalPurity - actualPure);

  // ✅ FIX: calculate ONLY if finalPurity exists
  let goldBalance = 0;

  if (finalPurity > 0)
    goldBalance = round3(advance - finalPurity);

  return {

    advanceGold: advance,

    grossWeight: gross,
    stoneWeight: stone,
    netWeight,

    touch: tc,

    wastage: ws,

    actualPure,

    wastagePure,

    finalPurity,

    goldBalance

  };

};



// =============================
// CREATE ENTRY
// =============================

exports.createEntry = async (req, res) => {

  try {

    const {

      supplierId,
      advanceGold,
      itemName,
      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage,
      goldBalance

    } = req.body;


    const supplier =
      await prisma.supplier.findUnique({
        where: { id: Number(supplierId) }
      });


    if (!supplier)
      return res.status(404).json({
        msg: "Supplier not found"
      });


    const calc = calculateValues({

      advanceGold,
      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage

    });


    // ✅ manual override allowed
    const finalGoldBalance =
      goldBalance !== undefined
        ? round3(Number(goldBalance))
        : calc.goldBalance;


    const entry =
      await prisma.itemPurchaseEntry.create({

        data: {

          supplierId: Number(supplierId),

          supplierName: supplier.name,

          itemName,

          wastageType,

          moveTo: "item",

          advanceGold: calc.advanceGold,

          grossWeight: calc.grossWeight,

          stoneWeight: calc.stoneWeight,

          netWeight: calc.netWeight,

          touch: calc.touch,

          wastage: calc.wastage,

          wastagePure: calc.wastagePure,

          actualPure: calc.actualPure,

          finalPurity: calc.finalPurity,

          goldBalance: finalGoldBalance

        }

      });


    // =============================
    // UPDATE SUPPLIER BALANCE
    // =============================

    const newBalance =
      round3(
        toNumber(supplier.openingBalance)
        + finalGoldBalance
      );


    await prisma.supplier.update({

      where: { id: Number(supplierId) },

      data: {

        openingBalance: newBalance

      }

    });


    res.json({

      msg: "Created",

      entry,

      supplierBalance: newBalance

    });

  }

  catch (err) {

    console.error(err);

    res.status(500).json({

      msg: "Server error",

      error: err.message

    });

  }

};



// =============================
// GET ENTRIES
// =============================

exports.getEntries = async (req, res) => {

  try {

    const { supplierId } = req.query;

    const entries =
      await prisma.itemPurchaseEntry.findMany({

        where: supplierId
          ? { supplierId: Number(supplierId) }
          : {},

        orderBy: {
          createdAt: "desc"
        }

      });

    res.json(entries);

  }

  catch (err) {

    res.status(500).json({
      msg: "Server error",
      error: err.message
    });

  }

};



// =============================
// GET SINGLE ENTRY
// =============================

exports.getEntryById = async (req, res) => {

  try {

    const id = Number(req.params.id);

    const entry =
      await prisma.itemPurchaseEntry.findUnique({

        where: { id }

      });

    if (!entry)
      return res.status(404).json({
        msg: "Entry not found"
      });

    res.json(entry);

  }

  catch (err) {

    res.status(500).json({
      msg: "Server error",
      error: err.message
    });

  }

};



// =============================
// UPDATE ENTRY
// =============================

exports.updateEntry = async (req, res) => {

  try {

    const id = Number(req.params.id);

    const oldEntry =
      await prisma.itemPurchaseEntry.findUnique({
        where: { id }
      });


    const {

      supplierId,
      advanceGold,
      itemName,
      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage,
      goldBalance

    } = req.body;


    const supplier =
      await prisma.supplier.findUnique({
        where: { id: Number(supplierId) }
      });


    const calc = calculateValues({

      advanceGold,
      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage

    });


    const finalGoldBalance =
      goldBalance !== undefined
        ? round3(Number(goldBalance))
        : calc.goldBalance;


    const updated =
      await prisma.itemPurchaseEntry.update({

        where: { id },

        data: {

          supplierId: Number(supplierId),

          supplierName: supplier.name,

          itemName,

          wastageType,

          advanceGold: calc.advanceGold,

          grossWeight: calc.grossWeight,

          stoneWeight: calc.stoneWeight,

          netWeight: calc.netWeight,

          touch: calc.touch,

          wastage: calc.wastage,

          wastagePure: calc.wastagePure,

          actualPure: calc.actualPure,

          finalPurity: calc.finalPurity,

          goldBalance: finalGoldBalance

        }

      });


    const balanceAdjustment =
      finalGoldBalance - oldEntry.goldBalance;


    const newBalance =
      round3(
        toNumber(supplier.openingBalance)
        + balanceAdjustment
      );


    await prisma.supplier.update({

      where: { id: Number(supplierId) },

      data: {
        openingBalance: newBalance
      }

    });


    res.json({

      msg: "Updated",

      updated,

      supplierBalance: newBalance

    });

  }

  catch (err) {

    res.status(500).json({
      msg: "Server error",
      error: err.message
    });

  }

};



// =============================
// DELETE ENTRY
// =============================

exports.deleteEntry = async (req, res) => {

  try {

    const id = Number(req.params.id);

    const entry =
      await prisma.itemPurchaseEntry.findUnique({
        where: { id }
      });


    const supplier =
      await prisma.supplier.findUnique({
        where: { id: entry.supplierId }
      });


    const newBalance =
      round3(
        toNumber(supplier.openingBalance)
        - entry.goldBalance
      );


    await prisma.supplier.update({

      where: { id: entry.supplierId },

      data: {
        openingBalance: newBalance
      }

    });


    await prisma.itemPurchaseEntry.delete({
      where: { id }
    });


    res.json({
      msg: "Deleted",
      supplierBalance: newBalance
    });

  }

  catch (err) {

    res.status(500).json({
      msg: "Server error",
      error: err.message
    });

  }

};

// =============================
// ITEM PURCHASE REPORT
// =============================

exports.getItemPurchaseReport = async (req, res) => {

  try {

    const { from, to, supplierId } = req.query;

    const where = {};

    // Supplier filter
    if (supplierId && supplierId !== "all") {

      where.supplierId = Number(supplierId);

    }

    // Date filter
    if (from && to) {

      where.createdAt = {

        gte: new Date(from),

        lte: new Date(to + "T23:59:59")

      };

    }

    const report =
      await prisma.itemPurchaseEntry.findMany({

        where,

        include: {

          supplier: {
            select: {
              id: true,
              name: true
            }
          }

        },

        orderBy: {

          createdAt: "desc"

        }

      });

    res.json(report);

  }

  catch (err) {

    console.error(err);

    res.status(500).json({

      msg: "Report fetch failed",

      error: err.message

    });

  }

};

exports.getItemPurchaseStock = async (req, res) => {
  try {

    const stock = await prisma.itemPurchaseEntry.findMany({
      where: {
        isSold: false,
        isBilled: false,

        netWeight: {
          gt: 0
        },

        // exclude items currently in repair
        repairStocks: {
          none: {
            status: "InRepair"
          }
        }
      },

      orderBy: {
        createdAt: "desc"
      }
    });

    res.json({ allStock: stock });

  } catch (err) {

    res.status(500).json({
      msg: "Failed",
      error: err.message
    });

  }
};

exports.itemPurchaseStock = async (req, res) => {

  try {

    const stock = await prisma.itemPurchaseEntry.findMany({

      where: {

        isSold: false,
        isBilled: false,

        netWeight: {
          gt: 0
        },

        // 🚫 Skip items currently in repair
        repairStocks: {
          none: {
            status: "InRepair"
          }
        }

      },

      orderBy: {
        createdAt: "desc"
      }

    });

    res.json({ allStock: stock });

  }
  catch (err) {

    res.status(500).json({
      msg: "Failed",
      error: err.message
    });

  }

};

exports.markItemSold = async (req, res) => {

  try {

    const id = Number(req.params.id);

    const entry =
      await prisma.itemPurchaseEntry.findUnique({
        where: { id }
      });

    if (!entry)
      return res.status(404).json({
        msg: "Item not found"
      });

    const updated =
      await prisma.itemPurchaseEntry.update({

        where: { id },

        data: {

          isSold: true,

          soldAt: new Date(),

          netWeight: 0

        }

      });

    res.json({

      msg: "Item marked as sold",

      updated

    });

  }

  catch (err) {

    res.status(500).json({

      msg: "Failed",

      error: err.message

    });

  }

};



exports.updateSoldStatusAutomatically = async (id, newWeight) => {

  await prisma.itemPurchaseEntry.update({

    where: { id },

    data: {

      netWeight: newWeight,

      isSold: newWeight <= 0,

      soldAt: newWeight <= 0 ? new Date() : null

    }

  });

};

exports.getStockByTouch = async (req, res) => {

  try {

    const touch = Number(req.params.touch);

    const stock =
      await prisma.itemPurchaseEntry.findMany({

        where: {

          touch: touch,

          netWeight: {

            gt: 0

          },

          moveTo: "item"

        },

        orderBy: {

          createdAt: "asc"

        }

      });

    res.json(stock);

  }

  catch (err) {

    res.status(500).json({

      msg: "Failed to fetch stock by touch",

      error: err.message

    });

  }

};

// =============================
// REDUCE ITEM PURCHASE STOCK
// =============================

exports.reduceStockWeight = async (req, res) => {

  try {

    const {

      purchaseStockId,

      weight

    } = req.body;

    const entry =
      await prisma.itemPurchaseEntry.findUnique({

        where: {

          id: Number(purchaseStockId)

        }

      });

    if (!entry)
      return res.status(404).json({

        msg: "Stock not found"

      });

    if (entry.netWeight < weight)
      return res.status(400).json({

        msg: "Insufficient stock"

      });

    const newWeight =
      round3(entry.netWeight - weight);

    const updated =
      await prisma.itemPurchaseEntry.update({

        where: {

          id: Number(purchaseStockId)

        },

        data: {

          netWeight: newWeight

        }

      });

    res.json({

      msg: "Stock updated",

      updated

    });

  }

  catch (err) {

    res.status(500).json({

      msg: "Stock update failed",

      error: err.message

    });

  }

};