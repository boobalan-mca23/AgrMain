const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const toNumber = (v, fallback = 0) => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

module.exports = {
  createEntry: async (req, res) => {
    try {
      const {
        supplierId,
        jewelName,
        grossWeight,
        stoneWeight,
        wastage,
        touch,
        moveTo
      } = req.body;

      if (!supplierId || !jewelName) return res.status(400).json({ msg: "supplierId and jewelName required" });

      const gross = toNumber(grossWeight);
      const stone = toNumber(stoneWeight);
      const ws = toNumber(wastage);
      const tc = toNumber(touch);

      const net = parseFloat((gross - stone).toFixed(3));
      const finalPurity = parseFloat(((net + ws) * (tc / 100)).toFixed(3));

      const entry = await prisma.purchaseEntry.create({
        data: {
          supplierId: Number(supplierId),
          supplierName: (await prisma.supplier.findUnique({ where: { id: Number(supplierId)} })).name,
          jewelName,
          grossWeight: gross,
          stoneWeight: stone,
          netWeight: net,
          wastage: ws,
          touch: tc,
          finalPurity,
          moveTo: moveTo === "product" ? "product" : "purchase",
        },
      });

      // If moveTo === "purchase", also create a PurchaseStock row linked to this entry
      if (entry.moveTo === "purchase") {
        await prisma.purchaseStock.create({
          data: {
            entryId: entry.id,
            supplierId: Number(supplierId),
            jewelName: entry.jewelName,
            grossWeight: entry.grossWeight,
            stoneWeight: entry.stoneWeight,
            netWeight: entry.netWeight,
            wastage: entry.wastage,
            touch: entry.touch,
            finalPurity: entry.finalPurity,
          },
        });
      }

      res.json({ msg: "Created", entry });
    } catch (err) {
      console.error("Create entry error:", err);
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
        wastage,
        touch,
        moveTo
      } = req.body;

      const gross = toNumber(grossWeight);
      const stone = toNumber(stoneWeight);
      const ws = toNumber(wastage);
      const tc = toNumber(touch);
      const net = parseFloat((gross - stone).toFixed(3));
      const finalPurity = parseFloat(((net + ws) * (tc / 100)).toFixed(3));

      const updated = await prisma.purchaseEntry.update({
        where: { id },
        data: {
          supplierId: Number(supplierId),
          supplierName: (await prisma.supplier.findUnique({ where: { id: Number(supplierId)} })).name,
          jewelName,
          grossWeight: gross,
          stoneWeight: stone,
          netWeight: net,
          wastage: ws,
          touch: tc,
          finalPurity,
          moveTo: moveTo === "product" ? "product" : "purchase",
        }
      });

      // if moveTo changed to purchase and stock doesn't exist -> create one
      if (updated.moveTo === "purchase") {
        const existingStock = await prisma.purchaseStock.findFirst({ where: { entryId: id }});
        if (!existingStock) {
          await prisma.purchaseStock.create({
            data: {
              entryId: id,
              supplierId: Number(supplierId),
              jewelName: updated.jewelName,
              grossWeight: updated.grossWeight,
              stoneWeight: updated.stoneWeight,
              netWeight: updated.netWeight,
              wastage: updated.wastage,
              touch: updated.touch,
              finalPurity: updated.finalPurity,
            },
          });
        } else {
          // update existing stock to match changes
          await prisma.purchaseStock.update({
            where: { id: existingStock.id },
            data: {
              supplierId: Number(supplierId),
              jewelName: updated.jewelName,
              grossWeight: updated.grossWeight,
              stoneWeight: updated.stoneWeight,
              netWeight: updated.netWeight,
              wastage: updated.wastage,
              touch: updated.touch,
              finalPurity: updated.finalPurity,
            },
          });
        }
      } else {
        // moveTo is product -> if a purchaseStock exists for this entry, delete it
        await prisma.purchaseStock.deleteMany({ where: { entryId: id }});
      }

      res.json({ msg: "Updated", updated });
    } catch (err) {
      console.error("Update entry error:", err);
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
