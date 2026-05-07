const { PrismaClient } = require("@prisma/client");
const { purchaseEntryToRawGold, deletePurchaseEntryFromRawGold, receiveGoldToStock, setTotalRawGold } = require("../Utils/addRawGoldStock");

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
      advanceTouch,
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


    let logId = null;
    let actualAdvanceTouch = null;

    if (calc.advanceGold > 0 && advanceTouch) {
      actualAdvanceTouch = parseFloat(advanceTouch);
      const stock = await prisma.rawgoldStock.findFirst({
        where: { touch: actualAdvanceTouch }
      });

      if (!stock || stock.remainingWt < calc.advanceGold) {
        return res.status(400).json({
          msg: "Insufficient Raw Gold Stock for selected Advance Touch"
        });
      }

      logId = await purchaseEntryToRawGold(calc.advanceGold, actualAdvanceTouch);
    }

    const entry = await prisma.purchaseEntry.create({

      data: {

        supplierId: Number(supplierId),

        supplierName: supplier.name,

        advanceGold: calc.advanceGold,

        advanceTouch: actualAdvanceTouch,

        logId,

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
    const { supplierId, startDate, endDate } = req.query;
    const where = {};

    if (supplierId) {
      where.supplierId = Number(supplierId);
    }

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: new Date(startDate),
        lte: end,
      };
    }

    const entries = await prisma.purchaseEntry.findMany({
      where,

      orderBy: {

        createdAt: "asc"

      },

      include: {
        supplier: true,
        stock: true,
        receivedGold: true
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
      advanceTouch,
      goldBalance
    } = req.body;


    const oldEntry = await prisma.purchaseEntry.findUnique({ where: { id } });

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


    let logId = oldEntry?.logId || null;
    let actualAdvanceTouch = advanceTouch ? parseFloat(advanceTouch) : null;

    if (calc.advanceGold > 0 && actualAdvanceTouch) {
      const stock = await prisma.rawgoldStock.findFirst({
        where: { touch: actualAdvanceTouch }
      });

      let requiredStock = calc.advanceGold;
      if (oldEntry && oldEntry.advanceTouch === actualAdvanceTouch && oldEntry.advanceGold) {
        requiredStock = calc.advanceGold - oldEntry.advanceGold;
      }

      if (requiredStock > 0 && (!stock || stock.remainingWt < requiredStock)) {
        return res.status(400).json({
          msg: "Insufficient Raw Gold Stock for selected Advance Touch"
        });
      }

      logId = await purchaseEntryToRawGold(calc.advanceGold, actualAdvanceTouch, logId);
    } else if (logId) {
      // If advanceGold became 0 or advanceTouch removed, delete the log
      await deletePurchaseEntryFromRawGold(logId);
      logId = null;
      actualAdvanceTouch = null;
    }

    const updated = await prisma.purchaseEntry.update({

      where: { id },

      data: {

        supplierId: Number(supplierId),

        supplierName: supplier?.name,

        advanceGold: calc.advanceGold,

        advanceTouch: actualAdvanceTouch,

        logId,

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

    const entry = await prisma.purchaseEntry.findUnique({ where: { id } });

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

    if (entry && entry.logId) {
      await deletePurchaseEntryFromRawGold(entry.logId);
    }


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
// =============================
// RECEIVE GOLD FROM BALANCE
// =============================

exports.receiveGold = async (req, res) => {
  try {
    const { purchaseEntryId, amount, weight, touch, date } = req.body;

    if (!purchaseEntryId || !weight || !touch) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const id = Number(purchaseEntryId);
    const entry = await prisma.purchaseEntry.findUnique({
      where: { id },
      include: { receivedGold: true }
    });

    if (!entry) return res.status(404).json({ msg: "Entry not found" });

    // Calculate current pending balance
    const alreadyReceived = entry.receivedGold.reduce((sum, r) => sum + r.weight, 0);
    const pendingBalance = round3(entry.goldBalance - alreadyReceived);
    const weightToReceive = Number(weight);
    const amountToReceive = Number(amount || 0);

    if (weightToReceive > pendingBalance + 0.001) { // added small epsilon for Float precision
      return res.status(400).json({
        msg: `Cannot receive more than pending balance. Max: ${pendingBalance}g`
      });
    }

    const logId = await receiveGoldToStock(amountToReceive, weightToReceive, touch, date);

    const received = await prisma.purchaseReceivedGold.create({
      data: {
        purchaseEntryId: id,
        amount: amountToReceive,
        weight: weightToReceive,
        touch: Number(touch),
        date: new Date(date),
        logId,
      },
    });


    res.json({ msg: "Gold received safely", received });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.updateReceivedGold = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, weight, touch, date } = req.body;

    const receiptId = Number(id);
    const received = await prisma.purchaseReceivedGold.findUnique({
      where: { id: receiptId },
      include: { purchaseEntry: { include: { receivedGold: true } } }
    });

    if (!received) return res.status(404).json({ msg: "Record not found" });

    const weightToReceive = Number(weight);
    const amountToReceive = Number(amount || 0);
    const actualTouch = Number(touch);
    const actualDate = new Date(date);

    // Calculate pending balance WITHOUT the current receipt
    const otherAlreadyReceived = received.purchaseEntry.receivedGold
      .filter(r => r.id !== receiptId)
      .reduce((sum, r) => sum + r.weight, 0);

    const pendingBalance = round3(received.purchaseEntry.goldBalance - otherAlreadyReceived);

    if (weightToReceive > pendingBalance + 0.001) {
      return res.status(400).json({
        msg: `Cannot receive more than pending balance. Max: ${pendingBalance}g`
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Raw Gold Log if logId exists
      if (received.logId) {
        const stock = await tx.rawgoldStock.findFirst({
          where: { touch: actualTouch },
          select: { id: true },
        });

        if (!stock) throw new Error(`No stock found for touch: ${actualTouch}`);

        await tx.rawGoldLogs.update({
          where: { id: received.logId },
          data: {
            rawGoldStockId: stock.id,
            weight: weightToReceive, // pure
            amount: amountToReceive, // physical
            touch: actualTouch,
            purity: weightToReceive,
            date: actualDate,
          }
        });
      }

      // 2. Update Receive Record
      await tx.purchaseReceivedGold.update({
        where: { id: receiptId },
        data: {
          amount: amountToReceive,
          weight: weightToReceive,
          touch: actualTouch,
          date: actualDate,
        }
      });

    });

    await setTotalRawGold();

    res.json({ msg: "Record updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

exports.deleteReceivedGold = async (req, res) => {
  try {
    const { id } = req.params;
    const receivedId = Number(id);

    const received = await prisma.purchaseReceivedGold.findUnique({
      where: { id: receivedId },
    });

    if (!received) return res.status(404).json({ msg: "Record not found" });

    await prisma.$transaction(async (tx) => {
      if (received.logId) {
        // Deleting RawGoldLogs will cascade delete PurchaseReceivedGold 
        // IF schema.prisma has onDelete: Cascade. 
        // Let's assume it does, but we'll try to delete both safely.
        await tx.rawGoldLogs.delete({ where: { id: received.logId } });
      } else {
        await tx.purchaseReceivedGold.delete({ where: { id: receivedId } });
      }

    });

    await setTotalRawGold();

    res.json({ msg: "Record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
