const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const toNumber = (v, fallback = 0) => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const round3 = (n) => Number.isFinite(n) ? Number(n.toFixed(3)) : 0;

module.exports = {
  createEntry: async (req, res) => {
    try {
      const {
        supplierId,
        jewelName,
        grossWeight,
        stoneWeight,
        touch,
        wastageType,
        wastage,
        moveTo
      } = req.body;

      if (!supplierId || !jewelName) {
        return res.status(400).json({ msg: "supplierId and jewelName required" });
      }

      const gross = round3(Number(grossWeight) || 0);
      const stone = round3(Number(stoneWeight) || 0);
      const tc = round3(Number(touch) || 0);
      const ws = round3(Number(wastage) || 0);

      const net = round3(gross - stone);

      const actualPure = round3((net * tc) / 100);

      let finalPurity = 0;

      if (wastageType === "Touch") {
        finalPurity = round3((net * ws) / 100);
      }

      if (wastageType === "%") {
        const A = round3((net * ws) / 100);
        const B = round3(A + net);
        finalPurity = round3((B * tc) / 100);
      }

      if (wastageType === "+") {
        const A = round3(net + ws);
        finalPurity = round3((A * tc) / 100);
      }

      const wastagePure = round3(finalPurity - actualPure);

      const supplier = await prisma.supplier.findUnique({
        where: { id: Number(supplierId) }
      });

      const entry = await prisma.purchaseEntry.create({
        data: {
          supplierId: Number(supplierId),
          supplierName: supplier?.name,
          jewelName,

          grossWeight: gross,
          stoneWeight: stone,
          netWeight: net,

          touch: tc,
          wastageType,
          wastage: ws,
          wastagePure,

          actualPure,
          finalPurity,

          moveTo: moveTo === "product" ? "product" : "purchase",
        }
      });

      if (entry.moveTo === "purchase") {
        await prisma.purchaseStock.create({
          data: {
            entryId: entry.id,
            supplierId: Number(supplierId),

            jewelName,

            grossWeight: gross,
            stoneWeight: stone,
            netWeight: net,

            touch: tc,
            wastageType,
            wastage: ws,
            wastagePure,

            actualPure,
            finalPurity,
          }
        });
      }

      res.json({ msg: "Created", entry });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  getEntries: async (req, res) => {
    try {
      const entries = await prisma.purchaseEntry.findMany({
        orderBy: { createdAt: "desc" },
        include: { supplier: true, stock: true }
      });
      res.json(entries);
    } catch (err) {
      console.error("Get entries error:", err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  getEntryById: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const entry = await prisma.purchaseEntry.findUnique({
        where: { id },
        include: { supplier: true, stock: true }
      });
      if (!entry) return res.status(404).json({ msg: "Not found" });
      res.json(entry);
    } catch (err) {
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  updateEntry: async (req, res) => {
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
        moveTo
      } = req.body;

      const gross = round3(Number(grossWeight) || 0);
      const stone = round3(Number(stoneWeight) || 0);
      const tc = round3(Number(touch) || 0);
      const ws = round3(Number(wastage) || 0);

      const net = round3(gross - stone);
      const actualPure = round3((net * tc) / 100);

      let finalPurity = 0;

      if (wastageType === "Touch") {
        finalPurity = round3((net * ws) / 100);
      }

      if (wastageType === "%") {
        const A = round3((net * ws) / 100);
        const B = round3(A + net);
        finalPurity = round3((B * tc) / 100);
      }

      if (wastageType === "+") {
        const A = round3(net + ws);
        finalPurity = round3((A * tc) / 100);
      }

      const wastagePure = round3(finalPurity - actualPure);

      const supplier = await prisma.supplier.findUnique({
        where: { id: Number(supplierId) }
      });

      const updated = await prisma.purchaseEntry.update({
        where: { id },
        data: {
          supplierId: Number(supplierId),
          supplierName: supplier?.name,
          jewelName,

          grossWeight: gross,
          stoneWeight: stone,
          netWeight: net,

          touch: tc,
          wastageType,
          wastage: ws,
          wastagePure,

          actualPure,
          finalPurity,

          moveTo: moveTo === "product" ? "product" : "purchase",
        }
      });

      if (updated.moveTo === "purchase") {
        const stock = await prisma.purchaseStock.findFirst({
          where: { entryId: id }
        });

        if (stock) {
          await prisma.purchaseStock.update({
            where: { id: stock.id },
            data: {
              supplierId: Number(supplierId),
              jewelName,

              grossWeight: gross,
              stoneWeight: stone,
              netWeight: net,

              touch: tc,
              wastageType,
              wastage: ws,
              wastagePure,

              actualPure,
              finalPurity,
            }
          });
        } else {
          await prisma.purchaseStock.create({
            data: {
              entryId: id,
              supplierId: Number(supplierId),
              jewelName,

              grossWeight: gross,
              stoneWeight: stone,
              netWeight: net,

              touch: tc,
              wastageType,
              wastage: ws,
              wastagePure,

              actualPure,
              finalPurity,
            }
          });
        }
      } else {
        await prisma.purchaseStock.deleteMany({ where: { entryId: id } });
      }

      res.json({ msg: "Updated", updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  deleteEntry: async (req, res) => {
    try {
      const id = Number(req.params.id);

      // When deleting a PurchaseEntry, ensure linked PurchaseStock entries are deleted first
      await prisma.purchaseStock.deleteMany({ where: { entryId: id }});
      await prisma.purchaseEntry.delete({ where: { id }});
      res.json({ msg: "Deleted" });
    } catch (err) {
      console.error("Delete entry error:", err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  }
};
