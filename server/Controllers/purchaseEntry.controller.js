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
  grossWeight,
  stoneWeight,
  touch,
  wastageType,
  wastage,
  advanceGold
}) => {

  const gross = round3(toNumber(grossWeight));
  const stone = round3(toNumber(stoneWeight));
  const tc = round3(toNumber(touch));
  const ws = round3(toNumber(wastage));
  const advance = round3(toNumber(advanceGold));

  const netWeight = round3(gross - stone);

  const actualPure = round3((netWeight * tc) / 100);

  let finalPurity = 0;

  if (wastageType === "Touch") {

    finalPurity = round3((netWeight * ws) / 100);

  }

  if (wastageType === "%") {

    const A = round3((netWeight * ws) / 100);
    const B = round3(netWeight + A);

    finalPurity = round3((B * tc) / 100);

  }

  if (wastageType === "+") {

    const A = round3(netWeight + ws);

    finalPurity = round3((A * tc) / 100);

  }

  const wastagePure = round3(finalPurity - actualPure);

  // ✅ FIXED: Calculate gold balance ONLY when final purity exists
  let goldBalance = 0;

  if (finalPurity > 0) {

    goldBalance = round3(advance - finalPurity);

  }

  return {

    grossWeight: gross,
    stoneWeight: stone,
    netWeight,

    touch: tc,

    wastage: ws,

    advanceGold: advance,

    actualPure,

    finalPurity,

    wastagePure,

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
      jewelName,
      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage,
      moveTo,
      advanceGold,
      goldBalance // allow manual override
    } = req.body;


    if (!supplierId)
      return res.status(400).json({
        msg: "supplierId required"
      });


    const supplier = await prisma.supplier.findUnique({

      where: { id: Number(supplierId) }

    });


    if (!supplier)
      return res.status(404).json({
        msg: "Supplier not found"
      });


    const calc = calculateValues({

      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage,
      advanceGold

    });


    const finalGoldBalance =
      goldBalance !== undefined
        ? round3(Number(goldBalance))
        : calc.goldBalance;


    const entry = await prisma.purchaseEntry.create({

      data: {

        supplierId: Number(supplierId),

        supplierName: supplier.name,

        advanceGold: calc.advanceGold,

        goldBalance: finalGoldBalance,

        jewelName,

        grossWeight: calc.grossWeight,

        stoneWeight: calc.stoneWeight,

        netWeight: calc.netWeight,

        touch: calc.touch,

        wastageType,

        wastage: calc.wastage,

        wastagePure: calc.wastagePure,

        actualPure: calc.actualPure,

        finalPurity: calc.finalPurity,

        moveTo: moveTo === "product"
          ? "product"
          : "purchase"

      }

    });


    // =============================
    // ADD TO STOCK
    // =============================

    if (entry.moveTo === "purchase") {

      await prisma.purchaseStock.create({

        data: {

          entryId: entry.id,

          supplierId: entry.supplierId,

          jewelName: entry.jewelName,

          grossWeight: entry.grossWeight,

          stoneWeight: entry.stoneWeight,

          netWeight: entry.netWeight,

          touch: entry.touch,

          wastageType: entry.wastageType,

          wastage: entry.wastage,

          wastagePure: entry.wastagePure,

          actualPure: entry.actualPure,

          finalPurity: entry.finalPurity

        }

      });

    }


    res.json({

      msg: "Purchase entry created",

      entry

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

    const supplierId = req.query.supplierId;

    const where = supplierId
      ? { supplierId: Number(supplierId) }
      : {};


    const entries = await prisma.purchaseEntry.findMany({

      where,

      orderBy: {

        createdAt: "desc"

      },

      include: {

        supplier: true,

        stock: true

      }

    });


    res.json(entries);

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
// GET SINGLE ENTRY
// =============================

exports.getEntryById = async (req, res) => {

  try {

    const id = Number(req.params.id);

    const entry = await prisma.purchaseEntry.findUnique({

      where: { id },

      include: {
        supplier: true,
        stock: true
      }

    });

    if (!entry)
      return res.status(404).json({
        msg: "Entry not found"
      });

    res.json(entry);

  }

  catch (err) {

    console.error(err);

    res.status(500).json({
      msg: "Server error",
      error: err.message
    });

  }

};


exports.updateEntry = async (req, res) => {

  try {

    const id = Number(req.params.id);

    const {
      supplierId,
      jewelName,
      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage,
      moveTo,
      advanceGold,
      goldBalance
    } = req.body;


    const supplier = await prisma.supplier.findUnique({

      where: {

        id: Number(supplierId)

      }

    });


    const calc = calculateValues({

      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage,
      advanceGold

    });


    const finalGoldBalance =
      goldBalance !== undefined
        ? round3(Number(goldBalance))
        : calc.goldBalance;


    const updated = await prisma.purchaseEntry.update({

      where: { id },

      data: {

        supplierId: Number(supplierId),

        supplierName: supplier?.name,

        advanceGold: calc.advanceGold,

        goldBalance: finalGoldBalance,

        jewelName,

        grossWeight: calc.grossWeight,

        stoneWeight: calc.stoneWeight,

        netWeight: calc.netWeight,

        touch: calc.touch,

        wastageType,

        wastage: calc.wastage,

        wastagePure: calc.wastagePure,

        actualPure: calc.actualPure,

        finalPurity: calc.finalPurity,

        moveTo: moveTo === "product"
          ? "product"
          : "purchase"

      }

    });


    // =============================
    // STOCK SYNC
    // =============================

    const stock = await prisma.purchaseStock.findFirst({

      where: {

        entryId: id

      }

    });


    if (updated.moveTo === "purchase") {

      if (stock) {

        await prisma.purchaseStock.update({

          where: {

            id: stock.id

          },

          data: {

            supplierId: updated.supplierId,

            jewelName,

            grossWeight: calc.grossWeight,

            stoneWeight: calc.stoneWeight,

            netWeight: calc.netWeight,

            touch: calc.touch,

            wastageType,

            wastage: calc.wastage,

            wastagePure: calc.wastagePure,

            actualPure: calc.actualPure,

            finalPurity: calc.finalPurity

          }

        });

      }

      else {

        await prisma.purchaseStock.create({

          data: {

            entryId: id,

            supplierId: updated.supplierId,

            jewelName,

            grossWeight: calc.grossWeight,

            stoneWeight: calc.stoneWeight,

            netWeight: calc.netWeight,

            touch: calc.touch,

            wastageType,

            wastage: calc.wastage,

            wastagePure: calc.wastagePure,

            actualPure: calc.actualPure,

            finalPurity: calc.finalPurity

          }

        });

      }

    }

    else {

      await prisma.purchaseStock.deleteMany({

        where: {

          entryId: id

        }

      });

    }


    res.json({

      msg: "Purchase entry updated",

      updated

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
// DELETE ENTRY
// =============================

exports.deleteEntry = async (req, res) => {

  try {

    const id = Number(req.params.id);


    await prisma.purchaseStock.deleteMany({

      where: {

        entryId: id

      }

    });


    await prisma.purchaseEntry.delete({

      where: {

        id

      }

    });


    res.json({

      msg: "Purchase entry deleted"

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

exports.getPuritySummary = async (req, res) => {

  try {

    const stock = await prisma.purchaseStock.findMany({

      where: {
        netWeight: {
          gt: 0
        }
      },

      select: {
        touch: true,
        netWeight: true
      }

    });


    // =============================
    // Group by touch
    // =============================

    const map = {};

    stock.forEach(item => {

      const touch = round3(
        toNumber(item.touch)
      );

      if (!map[touch]) {

        map[touch] = {
          touch,
          netWeight: 0
        };

      }

      map[touch].netWeight += round3(
        toNumber(item.netWeight)
      );

    });


    const result = Object.values(map)
      .map(item => ({

        touch: item.touch,

        netWeight: round3(
          item.netWeight
        )

      }))
      .sort((a, b) =>
        b.touch - a.touch
      );


    res.json(result);

  }

  catch (err) {

    console.error(err);

    res.status(500).json({

      msg: "Failed to fetch net weight summary",

      error: err.message

    });

  }

};