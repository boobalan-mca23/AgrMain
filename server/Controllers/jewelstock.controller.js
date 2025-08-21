const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createJewelStock = async (req, res) => {
  try {
    const { jewelName, weight, stoneWeight, finalWeight, touch, purityValue } =
      req.body;

    const newEntry = await prisma.jewelStock.create({
      data: {
        jewelName,
        weight: parseFloat(weight),
        stoneWeight: parseFloat(stoneWeight || 0),
        finalWeight: parseFloat(finalWeight),
        touch: parseFloat(touch),
        purityValue: parseFloat(purityValue),
      },
    });

    res.status(201).json(newEntry);
  } catch (error) {
    console.error("Error creating jewel stock:", error);
    res.status(500).json({ error: "Failed to create jewel stock entry" });
  }
};

exports.getAllJewelStock = async (req, res) => {
  try {
    const entries = await prisma.jewelStock.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching jewel stock entries:", error);
    res.status(500).json({ error: "Failed to fetch jewel stock entries" });
  }
};

exports.updateJewelStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { jewelName, weight, stoneWeight, finalWeight, touch, purityValue } =
      req.body;

    const updatedEntry = await prisma.jewelStock.update({
      where: { id: parseInt(id) },
      data: {
        jewelName,
        weight: parseFloat(weight),
        stoneWeight: parseFloat(stoneWeight || 0),
        finalWeight: parseFloat(finalWeight),
        touch: parseFloat(touch),
        purityValue: parseFloat(purityValue),
      },
    });

    res.status(200).json(updatedEntry);
  } catch (error) {
    console.error("Error updating jewel stock:", error);
    res.status(500).json({ error: "Failed to update jewel stock entry" });
  }
};
exports.deleteJewelStock = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.jewelStock.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Jewel stock entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting jewel stock entry:", error);
    res.status(500).json({ error: "Failed to delete jewel stock entry" });
  }
};
