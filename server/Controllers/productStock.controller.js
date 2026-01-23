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
    addNetWeight,     // this is GROSS weight being added
    isBackchain,
    backchainPurity
  } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {

      const product = await tx.productStock.findUnique({
        where: { id: Number(productStockId) }
      });

      const purchase = await tx.purchaseStock.findUnique({
        where: { id: Number(purchaseStockId) }
      });

      if (!product || !purchase) {
        throw new Error("Stock not found");
      }

      if (purchase.netWeight < addNetWeight) {
        throw new Error("Insufficient purchase stock");
      }

      /* 1️⃣ Reduce purchase stock */
      await tx.purchaseStock.update({
        where: { id: purchase.id },
        data: {
          netWeight: purchase.netWeight - addNetWeight
        }
      });

      /* 2️⃣ Update ITEM (Gross) Weight */
      const newItemWeight =
        Number(product.itemWeight || 0) + Number(addNetWeight);

      const stoneWeight = Number(product.stoneWeight || 0);
      const netWeight = newItemWeight - stoneWeight;

      /* 3️⃣ Purity Mixing (Backchain) */
      let newTouch = Number(product.touch || 0);

      if (isBackchain) {
        const totalPure =
          (product.netWeight * product.touch) +
          (addNetWeight * backchainPurity);

        newTouch = totalPure / netWeight;
      }

      /* 4️⃣ Actual Pure */
      const actualPure = (netWeight * newTouch) / 100;

      /* 5️⃣ Wastage Calculation */
      let finalPurity = 0;
      let wastagePure = 0;

      const wastage = Number(product.wastageValue || 0);
      const wastageType = product.wastageType; // "Touch" | "%" | "+"

      if (wastageType === "Touch") {
        finalPurity = (netWeight * wastage) / 100;
      }

      if (wastageType === "%") {
        const A = (netWeight * wastage) / 100;
        const B = A + netWeight;
        finalPurity = (B * newTouch) / 100;
      }

      if (wastageType === "+") {
        const A = netWeight + wastage;
        finalPurity = (A * newTouch) / 100;
      }

      wastagePure = finalPurity - actualPure;

      /* 6️⃣ Update Product Stock */
      return await tx.productStock.update({
        where: { id: product.id },
        data: {
          itemWeight: Number(newItemWeight.toFixed(3)),
          netWeight: Number(netWeight.toFixed(3)),
          touch: Number(newTouch.toFixed(3)),
          finalPurity: Number(finalPurity.toFixed(3)),
          wastagePure: Number(wastagePure.toFixed(3))
        }
      });
    });

    res.json({ msg: "Weight added successfully", product: result });

  } catch (err) {
    res.status(400).json({ err: err.message });
  }
};

module.exports = {
  getAllProductStock,
  updateProductStock,
  addNetWeightToProduct,
};
