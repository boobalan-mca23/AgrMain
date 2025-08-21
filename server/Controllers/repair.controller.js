const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createRepair = async (req, res) => {
  try {
    const {
      goldsmithId,
      givenWeights,
      totalGiven,
      itemWeights,
      totalItem,
      stone,
      wastageType,
      touch,
      netWeight,
    } = req.body;

    const newRepair = await prisma.repair.create({
      data: {
        goldsmithId,
        givenWeights,
        totalGiven,
        itemWeights,
        totalItem,
        stone,
        wastageType,
        touch,
        netWeight,
      },
      include: {
        goldsmith: true,
      },
    });

    res.status(201).json({ success: true, repair: newRepair });
  } catch (error) {
    console.error("Error creating repair:", error);
    res.status(500).json({ success: false, error: "Failed to create repair." });
  }
};

const getAllRepairs = async (req, res) => {
  try {
    const repairs = await prisma.repair.findMany({
      include: { goldsmith: true },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, repairs });
  } catch (error) {
    console.error("Error fetching repairs:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch repair records." });
  }
};

module.exports = {
  createRepair,
  getAllRepairs,
};
