const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


exports.createBullionPurchase = async (req, res) => {
  const { bullionId, grams, rate, amount, givenDetails } = req.body;

  try {
    const purchase = await prisma.bullionPurchase.create({
      data: {
        bullionId: parseInt(bullionId),
        grams: parseFloat(grams),
        rate: parseFloat(rate),
        amount: parseFloat(amount),
        balance: parseFloat(grams), 
        givenDetails: {
          create: (givenDetails || []).map((d) => ({
            amount: parseFloat(d.amount),
            grams: parseFloat(d.grams),
            touch: d.touch ? parseFloat(d.touch) : null,
            purity: d.purity ? parseFloat(d.purity) : null,
          })),
        },
      },
      include: { bullion: true, givenDetails: true },
    });

    res.status(201).json(purchase);
  } catch (error) {
    console.error("Create Error:", error);
    res.status(500).json({ error: "Failed to create bullion purchase" });
  }
};

exports.updateGivenDetailsOnly = async (req, res) => {
  const { id } = req.params;
  const { givenDetails } = req.body;

  try {
    const updatedPurchase = await prisma.bullionPurchase.update({
      where: { id: parseInt(id) },
      data: {
        givenDetails: {
          create: givenDetails.map((d) => ({
            amount: parseFloat(d.amount),
            grams: parseFloat(d.grams),
            touch: d.touch ? parseFloat(d.touch) : null,
            purity: d.purity ? parseFloat(d.purity) : null,
          })),
        },
      },
      include: { bullion: true, givenDetails: true },
    });

    res.json(updatedPurchase);
  } catch (error) {
    console.error("Update Given Details Error:", error);
    res.status(500).json({ error: "Failed to update given details" });
  }
};

exports.getAllBullionPurchases = async (req, res) => {
  try {
    const purchases = await prisma.bullionPurchase.findMany({
      include: { bullion: true, givenDetails: true },
      orderBy: { id: "desc" },
    });
    res.json(purchases);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch bullion purchases" });
  }
};

exports.deleteBullionPurchase = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.bullionPurchase.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Purchase deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Failed to delete bullion purchase" });
  }
};
