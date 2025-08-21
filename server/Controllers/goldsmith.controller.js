const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createGoldsmith = async (req, res) => {
  const { name, phonenumber, address } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Goldsmith name is required." });
  }

  try {
    const newGoldsmith = await prisma.goldsmith.create({
      data: {
        name,
        phone: phonenumber || null,
        address: address || null,
      },
    });
    res.status(201).json(newGoldsmith);
  } catch (error) {
    res.status(500).json({ message: "Error creating goldsmith", error });
  }
};

exports.getAllGoldsmith = async (req, res) => {
  try {
    const goldsmith = await prisma.goldsmith.findMany();
    res.status(200).json(goldsmith);
  } catch (error) {
    res.status(500).json({ message: "Error fetching goldsmith", error });
  }
};

exports.getGoldsmithById = async (req, res) => {
  const { id } = req.params;
  try {
    const goldsmith = await prisma.goldsmith.findUnique({
      where: { id: parseInt(id) },
    });
    if (!goldsmith)
      return res.status(404).json({ message: "goldsmith not found" });
    res.status(200).json(goldsmith);
  } catch (error) {
    res.status(500).json({ message: "Error fetching goldsmith", error });
  }
};

exports.updateGoldsmith = async (req, res) => {
  const { id } = req.params;
  const { name, phonenumber, address } = req.body;
  try {
    const updatedGoldsmith = await prisma.goldsmith.update({
      where: { id: parseInt(id) },
      data: {
        name,
        phonenumber,
        address,
      },
    });
    res.status(200).json(updatedGoldsmith);
  } catch (error) {
    res.status(500).json({ message: "Error updating goldsmith", error });
  }
};

exports.deleteGoldsmith = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.goldsmith.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json({ message: "Goldsmith deleted successfully" });
  } catch (error) {
    if (error.code === "P2003") {
      return res.status(400).json({
        message:
          "Cannot delete this goldsmith because it is linked to other records (e.g., jobcards).",
      });
    }
    res.status(500).json({ message: "Error deleting goldsmith", error });
  }
};
