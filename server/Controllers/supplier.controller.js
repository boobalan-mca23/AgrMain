const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  createSupplier: async (req, res) => {
    try {
      const { name, contactNumber, address, gstOrBusinessId, openingBalance, openingBCBalance, openingItemBalance } = req.body;
      if (!name) return res.status(400).json({ msg: "Supplier name required" });

      const sup = await prisma.supplier.create({
        data: {
          name,
          contactNumber,
          address,
          gstOrBusinessId,
          openingBalance: openingBalance ? Number(openingBalance) : 0,
          openingBCBalance: openingBCBalance ? Number(openingBCBalance) : 0,
          openingItemBalance: openingItemBalance ? Number(openingItemBalance) : 0,
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
      const suppliers = await prisma.supplier.findMany({
        include: {
          purchaseEntries: {
            include: {
              receivedGold: true
            }
          },
          itemPurchaseEntries: {
            include: {
              receivedGold: true
            }
          }
        },
        orderBy: { name: "asc" }
      });

      const list = suppliers.map(s => {
        const initialBC = Number(s.openingBCBalance || 0);
        const initialItem = Number(s.openingItemBalance || 0);
        const initialGeneral = Number(s.openingBalance || 0);

        const currentBC = s.purchaseEntries.reduce((sum, e) => {
          const received = e.receivedGold.reduce((rSum, r) => rSum + r.weight, 0);
          return sum + (e.goldBalance - received);
        }, 0);

        const currentItem = s.itemPurchaseEntries
          .filter(e => {
            const isReturned = e.moveTo === "returned";
            const isValidSource = ["PURCHASE", "CUSTOMER_RETURN"].includes(e.source) || !e.source;
            return isValidSource && !isReturned;
          })
          .reduce((sum, e) => {
            const received = e.receivedGold.reduce((rSum, r) => rSum + r.weight, 0);
            return sum + (e.goldBalance - received);
          }, 0);

        const totalBC = initialBC + currentBC;
        const totalItem = initialItem + currentItem;
        const grandTotal = initialGeneral + totalBC + totalItem;

        // Remove the large relation objects before sending to client
        const { purchaseEntries, itemPurchaseEntries, ...rest } = s;
        return {
          ...rest,
          totalBCBalance: Number(totalBC.toFixed(3)),
          totalItemBalance: Number(totalItem.toFixed(3)),
          totalBalance: Number(grandTotal.toFixed(3))
        };
      });

      res.json(list);
    } catch (err) {
      console.error(err);
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
      if (payload.openingBCBalance !== undefined) payload.openingBCBalance = Number(payload.openingBCBalance);
      if (payload.openingItemBalance !== undefined) payload.openingItemBalance = Number(payload.openingItemBalance);

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
