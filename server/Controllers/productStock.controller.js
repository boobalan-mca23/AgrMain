const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/* ------------------------------------
   GET ALL PRODUCT STOCK
------------------------------------ */
const getAllProductStock = async (req, res) => {
  try {
    const allStock = await prisma.productStock.findMany();

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

    const activeStock = allStock.filter((item) => item.isActive);

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
  const {
    productStockId,
    purchaseStockId,
    addNetWeight,
    isBackchain,
    backchainPurity
  } = req.body;

  try {
    if (!productStockId || !purchaseStockId || !addNetWeight) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const weightToAdd = Number(addNetWeight);
    if (weightToAdd <= 0) {
      return res.status(400).json({ msg: "Invalid weight" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Fetch product stock
      const product = await tx.productStock.findUnique({
        where: { id: Number(productStockId) }
      });

      if (!product) {
        throw new Error("Product stock not found");
      }

      // 2️⃣ Fetch purchase stock
      const purchase = await tx.purchaseStock.findUnique({
        where: { id: Number(purchaseStockId) }
      });

      if (!purchase) {
        throw new Error("Purchase stock not found");
      }

      if (purchase.netWeight < weightToAdd) {
        throw new Error("Insufficient purchase stock weight");
      }

      // 3️⃣ Reduce purchase stock
      await tx.purchaseStock.update({
        where: { id: purchase.id },
        data: {
          netWeight: purchase.netWeight - weightToAdd
        }
      });

      // 4️⃣ Calculate new weight
      const mainWeight = Number(product.netWeight || 0);
      const mainPurity = Number(product.touch || 0);

      let newTotalWeight = mainWeight + weightToAdd;
      let newPurity = mainPurity;

      // 5️⃣ BACKCHAIN LOGIC
      if (isBackchain === true) {
        if (!backchainPurity && backchainPurity !== 0) {
          throw new Error("Backchain purity is required");
        }

        const bcPurity = Number(backchainPurity);

        const totalPure =
          mainWeight * mainPurity +
          weightToAdd * bcPurity;

        newPurity = totalPure / newTotalWeight;
      }

      // 6️⃣ Final purity grams
      const finalPurity = (newTotalWeight * newPurity) / 100;

      // 7️⃣ Update product stock
      const updatedProduct = await tx.productStock.update({
        where: { id: product.id },
        data: {
          netWeight: newTotalWeight,
          touch: Number(newPurity.toFixed(3)),
          finalPurity: Number(finalPurity.toFixed(3))
        }
      });

      return updatedProduct;
    });

    return res.status(200).json({
      msg: "Weight added successfully",
      product: result
    });

  } catch (err) {
    console.error(err.message);
    return res.status(400).json({ err: err.message });
  }
};


module.exports = {
  getAllProductStock,
  updateProductStock,
  addNetWeightToProduct,
};
