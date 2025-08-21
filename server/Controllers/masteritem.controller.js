const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createItem = async (req, res) => {
  const { itemName } = req.body;

  try {
    const newItem = await prisma.masterItem.create({
      data: {
        itemName,
      },
    });
    res.status(201).json(newItem);
  } catch (err) {
    console.error("Error creating item:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
};

exports.getItems = async (req, res) => {
  try {
    const items = await prisma.masterItem.findMany({
      orderBy: { id: "asc" },
    });
    res.json(items);
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
};
