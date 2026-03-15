const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* ------------------------------------
   GET ALL PRODUCT STOCK
------------------------------------ */
const getAllProductStock = async (req, res) => {
  try {
    const allStock = await prisma.productStock.findMany({
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
      productStockId,
      purchaseStockId,
      addNetWeight
    } = req.body;

    const weight = Number(addNetWeight);

    if (!weight || weight <= 0) {
      throw new Error("Invalid weight");
    }

    const result = await prisma.$transaction(async (tx) => {

      /* =============================
         1️⃣ Fetch records
      ============================= */

      const product = await tx.productStock.findUnique({
        where: { id: Number(productStockId) }
      });

      const purchase = await tx.purchaseStock.findUnique({
        where: { id: Number(purchaseStockId) }
      });

      if (!product || !purchase) {
        throw new Error("Stock not found");
      }

      const purchaseNetWeight =
        Number(purchase.netWeight || 0);

      if (purchaseNetWeight < weight) {
        throw new Error("Insufficient purchase stock");
      }

      /* =============================
         2️⃣ Reduce purchase netWeight
      ============================= */

      const remainingWeight =
        Number((purchaseNetWeight - weight).toFixed(3));

      await tx.purchaseStock.update({

        where: { id: purchase.id },

        data: {
          netWeight: remainingWeight
        }

      });


      /* =============================
         3️⃣ Update product gross weight
      ============================= */

      const newItemWeight =
        Number(product.itemWeight || 0) + weight;

      const stoneWeight =
        Number(product.stoneWeight || 0);

      const netWeight =
        Number((newItemWeight - stoneWeight).toFixed(3));


      /* =============================
         4️⃣ Keep touch SAME
      ============================= */

      const touch =
        Number(product.touch || 0);


      /* =============================
         5️⃣ Recalculate purity
      ============================= */

      const actualPure =
        Number(((netWeight * touch) / 100).toFixed(3));

      let finalPurity = 0;

      const wastage =
        Number(product.wastageValue || 0);

      const wastageType =
        product.wastageType;

      if (wastageType === "Touch") {

        finalPurity =
          (netWeight * wastage) / 100;

      }

      else if (wastageType === "%") {

        const A =
          (netWeight * wastage) / 100;

        const B =
          netWeight + A;

        finalPurity =
          (B * touch) / 100;

      }

      else if (wastageType === "+") {

        const A =
          netWeight + wastage;

        finalPurity =
          (A * touch) / 100;

      }

      finalPurity =
        Number(finalPurity.toFixed(3));

      const wastagePure =
        Number((finalPurity - actualPure).toFixed(3));


      /* =============================
         6️⃣ Update product stock
      ============================= */

      const updatedProduct =
        await tx.productStock.update({

          where: { id: product.id },

          data: {

            itemWeight:
              Number(newItemWeight.toFixed(3)),

            netWeight,

            finalPurity,

            wastagePure

          }

        });

      return updatedProduct;

    });

    res.json({
      msg: "Weight added successfully",
      product: result
    });

  }

  catch (err) {

    console.error(err);

    res.status(400).json({
      err: err.message
    });

  }

};

module.exports = {
  getAllProductStock,
  updateProductStock,
  addNetWeightToProduct,
};
