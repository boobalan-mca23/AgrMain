const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  createSupplier: async (req, res) => {
    try {
      const { name, contactNumber, address, gstOrBusinessId, openingBalance } = req.body;
      if (!name) return res.status(400).json({ msg: "Supplier name required" });

      const sup = await prisma.supplier.create({
        data: {
          name,
          contactNumber,
          address,
          gstOrBusinessId,
          openingBalance: openingBalance ? Number(openingBalance) : 0,
        },
      });
      return res.json(sup);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  getSuppliers: async (req, res) => {
    try {
      const list = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
      res.json(list);
    } catch (err) {
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  getSupplierById: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const sup = await prisma.supplier.findUnique({ where: { id } });
      if (!sup) return res.status(404).json({ msg: "Not found" });
      res.json(sup);
    } catch (err) {
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  updateSupplier: async (req, res) => {
    try {
      const id = Number(req.params.id);
      const payload = req.body;
      if (payload.openingBalance !== undefined) payload.openingBalance = Number(payload.openingBalance);
      const updated = await prisma.supplier.update({ where: { id }, data: payload });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  },

  deleteSupplier: async (req, res) => {
    try {
      const id = Number(req.params.id);
      await prisma.supplier.delete({ where: { id }});
      res.json({ msg: "Deleted" });
    } catch (err) {
      res.status(500).json({ msg: "Server error", error: err.message });
    }
  }
};
