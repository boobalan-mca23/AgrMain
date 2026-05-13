const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* ------------------------------------
   GET ALL PRODUCT STOCK
------------------------------------ */
const getAllProductStock = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: new Date(startDate),
        lte: end,
      };
    }

    const allStock = await prisma.productStock.findMany({
      where,
      orderBy: {
        id: "desc", // latest products first
      },
    });

    // auto deactivate near-zero items
    const inactiveItems = allStock.filter(
      (item) => item.itemWeight <= 0.05 && item.isActive
    );

    if (inactiveItems.length > 0) {
      await Promise.all(
        inactiveItems.map((item) =>
          prisma.productStock.update({
            where: { id: item.id },
            data: { isActive: false, isBillProduct: false },
          })
        )
      );
    }

    const activeStock = allStock.filter((item) => {
      // If it was just deactivated or weight is low, exclude it
      if (item.itemWeight <= 0.05 && item.isActive) return false;
      return item.isActive;
    });

    return res.status(200).json({ allStock: activeStock });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ err: err.message });
  }
};

/* ------------------------------------
   UPDATE PRODUCT STOCK (existing)
------------------------------------ */
const updateProductStock = async (req, res) => {
  const { id } = req.params;
  const { isBillProduct, isActive } = req.body;

  try {
    const updatedStock = await prisma.productStock.update({
      where: { id: parseInt(id) },
      data: { isBillProduct, isActive },
    });

    return res.status(200).json({ updatedStock });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ err: err.message });
  }
};

const addNetWeightToProduct = async (req, res) => {
  try {
    const {
      stockId,      // Renamed from productStockId
      stockType,    // New: PRODUCT or ITEM_PURCHASE
      purchaseStockId,
      addNetWeight
    } = req.body;

    const weight = Number(addNetWeight);

    if (!weight || weight <= 0) {
      throw new Error("Invalid weight");
    }

    const result = await prisma.$transaction(async (tx) => {
      /* =============================
         1️⃣ Fetch purchase record
      ============================= */
      const purchase = await tx.purchaseStock.findUnique({
        where: { id: Number(purchaseStockId) }
      });

      if (!purchase) {
        throw new Error("Purchase stock not found");
      }

      const purchaseNetWeight = Number(purchase.netWeight || 0);
      if (purchaseNetWeight < weight) {
        throw new Error("Insufficient purchase stock");
      }

      /* =============================
         2️⃣ Reduce purchase netWeight
      ============================= */
      const remainingWeight = Number((purchaseNetWeight - weight).toFixed(3));
      await tx.purchaseStock.update({
        where: { id: purchase.id },
        data: { netWeight: remainingWeight }
      });

      /* =============================
         3️⃣ Handle different stock types
      ============================= */
      if (stockType === "ITEM_PURCHASE") {
        const item = await tx.itemPurchaseEntry.findUnique({
          where: { id: Number(stockId) }
        });

        if (!item) throw new Error("Item Purchase record not found");

        const newItemWeight = Number(item.grossWeight || 0) + weight;
        const netWeight = Number((newItemWeight - Number(item.stoneWeight || 0)).toFixed(3));
        const touch = Number(item.touch || 0);
        const actualPure = Number(((netWeight * touch) / 100).toFixed(3));

        let finalPurity = 0;
        const wastage = Number(item.wastage || 0);
        const wastageType = item.wastageType;

        if (wastageType === "Touch") {
          finalPurity = (netWeight * wastage) / 100;
        } else if (wastageType === "%") {
          const A = (netWeight * wastage) / 100;
          const B = netWeight + A;
          finalPurity = (B * touch) / 100;
        } else if (wastageType === "+") {
          const A = netWeight + wastage;
          finalPurity = (A * touch) / 100;
        }

        finalPurity = Number(finalPurity.toFixed(3));
        const wastagePure = Number((finalPurity - actualPure).toFixed(3));

        return await tx.itemPurchaseEntry.update({
          where: { id: item.id },
          data: {
            grossWeight: Number(newItemWeight.toFixed(3)),
            netWeight,
            finalPurity,
            wastagePure,
            actualPure
          }
        });

      } else {
        // Default to PRODUCT
        const product = await tx.productStock.findUnique({
          where: { id: Number(stockId) }
        });

        if (!product) throw new Error("Product Stock record not found");

        const newItemWeight = Number(product.itemWeight || 0) + weight;
        const netWeight = Number((newItemWeight - Number(product.stoneWeight || 0)).toFixed(3));
        const touch = Number(product.touch || 0);
        const actualPure = Number(((netWeight * touch) / 100).toFixed(3));

        let finalPurity = 0;
        const wastage = Number(product.wastageValue || 0);
        const wastageType = product.wastageType;

        if (wastageType === "Touch") {
          finalPurity = (netWeight * wastage) / 100;
        } else if (wastageType === "%") {
          const A = (netWeight * wastage) / 100;
          const B = netWeight + A;
          finalPurity = (B * touch) / 100;
        } else if (wastageType === "+") {
          const A = netWeight + wastage;
          finalPurity = (A * touch) / 100;
        }

        finalPurity = Number(finalPurity.toFixed(3));
        const wastagePure = Number((finalPurity - actualPure).toFixed(3));

        return await tx.productStock.update({
          where: { id: product.id },
          data: {
            itemWeight: Number(newItemWeight.toFixed(3)),
            netWeight,
            finalPurity,
            wastagePure
          }
        });
      }
    });

    res.json({
      msg: "Weight added successfully",
      product: result
    });

  } catch (err) {
    console.error(err);
    res.status(400).json({ err: err.message });
  }
};

module.exports = {
  getAllProductStock,
  updateProductStock,
  addNetWeightToProduct,
};
