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

      // Fetch all adjustments for these suppliers
      const adjustments = await prisma.balanceAdjustment.findMany({
        where: { entityType: "SUPPLIER" }
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

        // Add Adjustments
        const supAdjustments = adjustments.filter(a => a.entityId === s.id);
        const adjBC = supAdjustments.reduce((sum, a) => sum + (a.bcAmount || 0), 0);
        const adjItem = supAdjustments.reduce((sum, a) => sum + (a.itemAmount || 0), 0);
        const adjCash = supAdjustments.reduce((sum, a) => sum + (a.cashAmount || 0), 0);

        const totalBC = initialBC + currentBC + adjBC;
        const totalItem = initialItem + currentItem + adjItem;
        const totalCash = initialGeneral + adjCash;
        const grandTotal = totalCash + totalBC + totalItem;

        // Remove the large relation objects before sending to client
        const { purchaseEntries, itemPurchaseEntries, ...rest } = s;
        return {
          ...rest,
          totalBCBalance: Number(totalBC.toFixed(3)),
          totalItemBalance: Number(totalItem.toFixed(3)),
          totalBalance: Number(grandTotal.toFixed(3)),
          totalCashBalance: Number(totalCash.toFixed(3))
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

      // 1. Fetch old state with relations to calculate CURRENT totals
      const oldSupplier = await prisma.supplier.findUnique({
        where: { id },
        include: {
          purchaseEntries: { include: { receivedGold: true } },
          itemPurchaseEntries: { include: { receivedGold: true } },
        }
      });

      if (!oldSupplier) return res.status(404).json({ msg: "Supplier not found" });

      // 2. Fetch adjustments
      const adjustments = await prisma.balanceAdjustment.findMany({
        where: { entityType: "SUPPLIER", entityId: id }
      });

      // 3. Calculate current totals (replicate getSuppliers logic)
      const currentBCVal = oldSupplier.purchaseEntries.reduce((sum, e) => {
        const received = e.receivedGold.reduce((rSum, r) => rSum + r.weight, 0);
        return sum + (e.goldBalance - received);
      }, 0);
      const currentItemVal = oldSupplier.itemPurchaseEntries
        .filter(e => e.moveTo !== "returned" && (["PURCHASE", "CUSTOMER_RETURN"].includes(e.source) || !e.source))
        .reduce((sum, e) => {
          const received = e.receivedGold.reduce((rSum, r) => rSum + r.weight, 0);
          return sum + (e.goldBalance - received);
        }, 0);

      const adjBC = adjustments.reduce((sum, a) => sum + (a.bcAmount || 0), 0);
      const adjItem = adjustments.reduce((sum, a) => sum + (a.itemAmount || 0), 0);
      const adjCash = adjustments.reduce((sum, a) => sum + (a.cashAmount || 0), 0);

      const dbTotalBC = Number(oldSupplier.openingBCBalance || 0) + currentBCVal + adjBC;
      const dbTotalItem = Number(oldSupplier.openingItemBalance || 0) + currentItemVal + adjItem;
      const dbTotalCash = Number(oldSupplier.openingBalance || 0) + adjCash;

      // 4. Determine Adjustments based on User Input (Incoming Totals)
      const adjustmentData = {
        entityType: "SUPPLIER",
        entityId: id,
        description: "Manual Balance adjustment from Master"
      };

      let hasAdjustment = false;

      // If user provided a new BC total
      if (payload.totalBCBalance !== undefined) {
         const newTotalBC = Number(payload.totalBCBalance);
         if (Math.abs(newTotalBC - dbTotalBC) > 0.0001) {
            adjustmentData.bcAmount = newTotalBC - dbTotalBC;
            hasAdjustment = true;
         }
      }

      // If user provided a new Item total
      if (payload.totalItemBalance !== undefined) {
          const newTotalItem = Number(payload.totalItemBalance);
          if (Math.abs(newTotalItem - dbTotalItem) > 0.0001) {
             adjustmentData.itemAmount = newTotalItem - dbTotalItem;
             hasAdjustment = true;
          }
      }
      
      // Note: We don't update openingBalance fields! 
      // We remove them from payload to preserve audit history.
      const { 
        openingBalance, openingBCBalance, openingItemBalance, 
        totalBCBalance, totalItemBalance, totalBalance, totalCashBalance,
        ...updateData 
      } = payload;

      const updated = await prisma.supplier.update({
        where: { id },
        data: updateData
      });

      if (hasAdjustment) {
        await prisma.balanceAdjustment.create({ data: adjustmentData });
      }

      res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Update failed", error: err.message });
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
