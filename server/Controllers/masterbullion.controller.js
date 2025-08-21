const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createBullion = async (req, res) => {
  const { name, phone, address } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Bullion name is required." });
  }

  try {
    const newBullion = await prisma.masterBullion.create({
      data: {
        name,
        phone: phone || null,
        address: address || null,
      },
    });
    res.status(201).json(newBullion);
  } catch (error) {
    console.error("Create Bullion Error:", error); 
    res.status(500).json({
      message: "Error creating bullion",
      error: error.message || error, 
    });
  }
};
  
exports.getAllBullion = async (req, res) => {
  try {
    const bullion = await prisma.masterBullion.findMany();
    res.status(200).json(bullion);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bullion", error });
  }
};

exports.getBullionById = async (req, res) => {
  const { id } = req.params;
  try {
    const bullion = await prisma.masterBullion.findUnique({
      where: { id: parseInt(id) },
    });
    if (!bullion)
      return res.status(404).json({ message: "Bullion not found" });
    res.status(200).json(bullion);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bullion", error });
  }
};

exports.updateBullion = async (req, res) => {
  const { id } = req.params;
  const { name, phone, address } = req.body;
  try {
    const updatedBullion = await prisma.masterBullion.update({
      where: { id: parseInt(id) },
      data: {
        name,
        phone,
        address,
      },
    });
    res.status(200).json(updatedBullion);
  } catch (error) {
    res.status(500).json({ message: "Error updating bullion", error });
  }
};

exports.deleteBullion = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.masterBullion.delete({
      where: { id: parseInt(id) },
    });
    res.status(200).json({ message: "Bullion deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting bullion", error });
  }
};
