const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  // ------------------------------------
  // GET ALL PURCHASE STOCK
  // ------------------------------------
  getAll: async (req, res) => {
    try {
      const list = await prisma.purchaseStock.findMany({
        orderBy: { createdAt: "desc" },
        include: { supplier: true, purchaseEntry: true }
      });
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  // ------------------------------------
  // GET ONE RECORD
  // ------------------------------------
  getOne: async (req, res) => {
    try {
      const id = Number(req.params.id);

      const item = await prisma.purchaseStock.findUnique({
        where: { id },
        include: { supplier: true, purchaseEntry: true }
      });

      if (!item) return res.status(404).json({ msg: "Not found" });

      res.json(item);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  // ------------------------------------
  // ⭐ NEW: GET ALL PURCHASE STOCK ENTRIES BY TOUCH VALUE
  // ------------------------------------
  getByTouch: async (req, res) => {
    try {
      const touch = Number(req.params.touch);

      const list = await prisma.purchaseStock.findMany({
        where: { touch },
        include: { supplier: true, purchaseEntry: true },
        orderBy: { createdAt: "desc" }
      });

      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  // ------------------------------------
  // ⭐ NEW: GET TOTAL WASTAGE FOR A TOUCH VALUE
  // ------------------------------------
  getTotalWastage: async (req, res) => {
    try {
      const touch = Number(req.params.touch);

      const list = await prisma.purchaseStock.findMany({
        where: { touch }
      });

      // important: Prisma model must contain "wastage" field
      const totalWastage = list.reduce((sum, item) => {
        const w = Number(item.wastage) || 0;
        return sum + w;
      }, 0);

      res.json({
        touch,
        totalWastage: Number(totalWastage.toFixed(3))
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  // ------------------------------------
  // UPDATE PURCHASE STOCK
  // ------------------------------------
  updateStock: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payload = req.body;

      // convert numeric fields
      ["grossWeight", "stoneWeight", "netWeight", "wastage", "touch", "finalPurity"]
        .forEach(key => {
          if (payload[key] !== undefined) payload[key] = Number(payload[key]);
        });

      const updated = await prisma.purchaseStock.update({
        where: { id },
        data: payload
      });

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  // ------------------------------------
  // DELETE PURCHASE STOCK ENTRY
  // ------------------------------------
  deleteStock: async (req, res) => {
    try {
      const id = Number(req.params.id);

      const stock = await prisma.purchaseStock.findUnique({ where: { id } });
      if (!stock) return res.status(404).json({ msg: "Not found" });

      await prisma.purchaseStock.delete({ where: { id } });

      res.json({ msg: "Deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  }
};
