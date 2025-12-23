const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  entriesReport: async (req, res) => {
    try {
      const { from, to, supplierId } = req.query;
      const where = {};

      if (supplierId) where.supplierId = Number(supplierId);

      if (from || to) {
        where.createdAt = {};

        if (from) {
          const start = new Date(from);
          start.setHours(0, 0, 0, 0);
          where.createdAt.gte = start;
        }

        if (to) {
          const end = new Date(to);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }

      const entries = await prisma.purchaseEntry.findMany({
        where,
        include: { supplier: true, stock: true },
        orderBy: { createdAt: "desc" },
      });

      res.json(entries);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },
};
