const { PrismaClient } = require("@prisma/client");
const { itemPurchaseToRawGold, deleteItemPurchaseFromRawGold, receiveGoldToStock, setTotalRawGold } = require("../Utils/addRawGoldStock");

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
      advanceTouch,
      itemName,
      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage,
      goldBalance,
      count
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


    const finalGoldBalance =
      goldBalance !== undefined
        ? round3(Number(goldBalance))
        : calc.goldBalance;


    let advanceLogId = null;
    if (calc.advanceGold > 0 && advanceTouch) {
      advanceLogId = await itemPurchaseToRawGold(calc.advanceGold, Number(advanceTouch));
    }


    const entry =
      await prisma.itemPurchaseEntry.create({

        data: {

          supplierId: Number(supplierId),

          supplierName: supplier.name,

          itemName,
          count: count ? Number(count) : 1,
          initialCount: count ? Number(count) : 1,
          wastageType,

          moveTo: "item",

          advanceGold: calc.advanceGold,
          advanceTouch: advanceTouch ? Number(advanceTouch) : null,
          advanceLogId,

          grossWeight: calc.grossWeight,

          stoneWeight: calc.stoneWeight,

          netWeight: calc.netWeight,

          touch: calc.touch,

          wastage: calc.wastage,

          wastagePure: calc.wastagePure,

          actualPure: calc.actualPure,

          finalPurity: calc.finalPurity,

          goldBalance: finalGoldBalance,

          initialCount: count ? Number(count) : 1,
          initialGrossWeight: calc.grossWeight,
          initialStoneWeight: calc.stoneWeight,
          initialNetWeight: calc.netWeight,
          initialActualPure: calc.actualPure,
          initialWastagePure: calc.wastagePure,
          initialFinalPurity: calc.finalPurity,
          initialAdvanceGold: calc.advanceGold,
          initialGoldBalance: finalGoldBalance,
        }

      });


    res.json({
      msg: "Created",
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

    const { supplierId } = req.query;

    const entries =
      await prisma.itemPurchaseEntry.findMany({

        where: {
          source: "PURCHASE",
          isInRepair: false,
          // Exclude internal split/tracking entries that should not appear as independent entries
          NOT: {
            moveTo: { in: ["REPAIR_SPLIT", "PROCESSED_BY_REPAIR", "REPAIR_RETURN", "CUSTOMER_RETURN", "returned"] }
          },
          ...(supplierId ? { supplierId: Number(supplierId) } : {})
        },

        include: {
          receivedGold: true,
          repairStocks: {
            where: { status: "InRepair" }
          }
        },

        orderBy: {
          createdAt: "asc"
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
      advanceTouch,
      itemName,
      grossWeight,
      stoneWeight,
      touch,
      wastageType,
      wastage,
      goldBalance,
      count
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

    let advanceLogId = oldEntry.advanceLogId;
    if (calc.advanceGold > 0 && advanceTouch) {
      advanceLogId = await itemPurchaseToRawGold(calc.advanceGold, Number(advanceTouch), advanceLogId);
    } else if (advanceLogId) {
      await deleteItemPurchaseFromRawGold(advanceLogId);
      advanceLogId = null;
    }


    const updated =
      await prisma.itemPurchaseEntry.update({

        where: { id },

        data: {

          supplierId: Number(supplierId),

          supplierName: supplier.name,

          itemName,
          count: count ? Number(count) : 1,
          wastageType,

          advanceGold: calc.advanceGold,
          advanceTouch: advanceTouch ? Number(advanceTouch) : null,
          advanceLogId,

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


    res.json({
      msg: "Updated",
      updated
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

    const entry = await prisma.itemPurchaseEntry.findUnique({
      where: { id }
    });

    if (!entry) {
      return res.status(404).json({ msg: "Entry not found" });
    }

    // Use transaction to ensure all related data is cleaned up
    await prisma.$transaction([
      prisma.repairStock.deleteMany({ where: { itemPurchaseId: id } }),
      prisma.returnLogs.deleteMany({ where: { itemPurchaseId: id } }),
      prisma.itemPurchaseEntry.delete({ where: { id } })
    ]);

    if (entry.advanceLogId) {
      await deleteItemPurchaseFromRawGold(entry.advanceLogId);
    }

    res.json({ msg: "Deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({
      msg: "Delete failed",
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

    where.source = { in: ["PURCHASE", "CUSTOMER_RETURN"] };

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
          },
          repairStocks: {
            where: { status: "InRepair" }
          },
          receivedGold: true
        },

        orderBy: {

          createdAt: "asc"

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

    const { startDate, endDate } = req.query;
    const where = {
      isSold: false,
      isInRepair: false,
      netWeight: { gt: 0 },
    };

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: new Date(startDate),
        lte: end,
      };
    }

    const stock = await prisma.itemPurchaseEntry.findMany({
      where,
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

    const { startDate, endDate } = req.query;
    const where = {
      isSold: false,
      isInRepair: false,
      netWeight: { gt: 0 },
    };

    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: new Date(startDate),
        lte: end,
      };
    }

    const stock = await prisma.itemPurchaseEntry.findMany({
      where,
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
          isBilled: false,
          soldAt: new Date(),
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
exports.returnToSupplier = async (req, res) => {
  const { id } = req.params;
  const { count, weight, stoneWeight, reason } = req.body;

  try {
    const entry = await prisma.itemPurchaseEntry.findUnique({
      where: { id: Number(id) }
    });

    if (!entry) return res.status(404).json({ msg: "Entry not found" });

    const reqCount = Number(count) || 1;
    const reqGross = Number(weight) || entry.grossWeight;
    const reqStone = Number(stoneWeight) || 0;
    const reqNet = reqGross - reqStone;

    const round3 = (n) => Number(Number(n).toFixed(3));

    const getPartPurity = (net, touch, wType, wVal) => {
      const actual = round3((net * touch) / 100);
      let final = 0;
      if (wType === "Touch") final = round3((net * wVal) / 100);
      else if (wType === "%") final = round3((net + (net * wVal / 100)) * touch / 100);
      else if (wType === "+") final = round3((net + wVal) * touch / 100);
      else final = actual;
      return { actual, final };
    };

    const returningPurity = getPartPurity(reqNet, entry.touch, entry.wastageType, entry.wastage);

    if (reqCount < entry.count) {
      const remCount = entry.count - reqCount;
      const remGross = round3(entry.grossWeight - reqGross);
      const remStone = round3(entry.stoneWeight - reqStone);
      const remNet = round3(remGross - remStone);
      const remPurity = getPartPurity(remNet, entry.touch, entry.wastageType, entry.wastage);

      await prisma.itemPurchaseEntry.update({
        where: { id: entry.id },
        data: {
          count: remCount,
          grossWeight: remGross,
          stoneWeight: remStone,
          netWeight: remNet,
          actualPure: remPurity.actual,
          finalPurity: remPurity.final,
          goldBalance: round3((entry.advanceGold * remCount / entry.count) - remPurity.final)
        }
      });

      await prisma.itemPurchaseEntry.create({
        data: {
          ...entry,
          id: undefined,
          count: reqCount,
          grossWeight: reqGross,
          stoneWeight: reqStone,
          netWeight: reqNet,
          actualPure: returningPurity.actual,
          finalPurity: returningPurity.final,
          goldBalance: 0,
          moveTo: "returned",
          source: "SUPPLIER_RETURN",
          createdAt: undefined
        }
      });
    } else {
      await prisma.itemPurchaseEntry.update({
        where: { id: entry.id },
        data: {
          moveTo: "returned",
          source: "SUPPLIER_RETURN"
        }
      });
    }


    res.json({ msg: "Returned successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed", error: err.message });
  }
};


// =============================
// GOLD RECEIPT MANAGEMENT
// =============================

exports.receiveGold = async (req, res) => {
  try {
    const { itemPurchaseEntryId, amount, weight, touch, date } = req.body;
    const weightToReceive = Number(weight);
    const amountToReceive = Number(amount || 0);

    const id = Number(itemPurchaseEntryId);
    const entry = await prisma.itemPurchaseEntry.findUnique({
      where: { id },
      include: { receivedGold: true }
    });

    if (!entry) return res.status(404).json({ msg: "Entry not found" });

    // Calculate currently received total
    const alreadyReceived = entry.receivedGold.reduce((sum, r) => sum + r.weight, 0);
    const pendingBalance = round3(entry.goldBalance - alreadyReceived);

    if (weightToReceive > pendingBalance + 0.001) {
      return res.status(400).json({
        msg: `Cannot receive more than pending balance. Max: ${pendingBalance}g`
      });
    }

    const logId = await receiveGoldToStock(amountToReceive, weightToReceive, Number(touch), date);

    await prisma.itemPurchaseReceivedGold.create({
      data: {
        itemPurchaseEntryId: id,
        amount: amountToReceive,
        weight: weightToReceive,
        touch: Number(touch),
        date: new Date(date),
        logId,
      },
    });


    res.json({ msg: "Gold received recorded" });
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

    const received = await prisma.itemPurchaseReceivedGold.findUnique({
      where: { id: receiptId },
      include: { itemPurchaseEntry: { include: { receivedGold: true } } }
    });

    if (!received) return res.status(404).json({ msg: "Record not found" });

    const weightToReceive = Number(weight);
    const amountToReceive = Number(amount || 0);
    const actualTouch = Number(touch);
    const actualDate = new Date(date);

    // Calculate pending balance WITHOUT the current receipt
    const otherAlreadyReceived = received.itemPurchaseEntry.receivedGold
      .filter(r => r.id !== receiptId)
      .reduce((sum, r) => sum + r.weight, 0);

    const pendingBalance = round3(received.itemPurchaseEntry.goldBalance - otherAlreadyReceived);

    if (weightToReceive > pendingBalance + 0.001) {
      return res.status(400).json({
        msg: `Cannot receive more than pending balance. Max: ${pendingBalance}g`
      });
    }

    await prisma.$transaction(async (tx) => {
      // Update Stock Log
      if (received.logId) {
        const stock = await tx.rawgoldStock.findFirst({
          where: { touch: actualTouch },
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

      await tx.itemPurchaseReceivedGold.update({
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

    const received = await prisma.itemPurchaseReceivedGold.findUnique({
      where: { id: receivedId },
    });

    if (!received) return res.status(404).json({ msg: "Record not found" });

    await prisma.$transaction(async (tx) => {
      if (received.logId) {
        await tx.rawGoldLogs.delete({ where: { id: received.logId } });
      }
      await tx.itemPurchaseReceivedGold.delete({ where: { id: receivedId } });

    });

    await setTotalRawGold();

    res.json({ msg: "Record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};
