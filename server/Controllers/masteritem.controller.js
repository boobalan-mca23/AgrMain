const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createItem = async (req, res) => {
  const { itemName } = req.body;

  try {
     const ifExist=await prisma.masterItem.findFirst({
      where:{
        itemName:itemName
      }
    })
    if(ifExist){
      return res.status(400).json({msg:"Item Name  Already Exist"})
    }
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

exports.updateItem = async (req, res) => {
  const { id } = req.params;
  const { itemName } = req.body;

  if (!itemName || !itemName.trim()) {
    return res.status(400).json({ error: "Item name cannot be empty" });
  }

  try {
    const updatedItem = await prisma.masterItem.update({
      where: { id: parseInt(id) },
      data: { itemName: itemName.trim() },
    });

    res.json(updatedItem);
  } catch (err) {
    console.error("Error updating item:", err);
    res.status(500).json({ error: "Something went wrong while updating item." });
  }
};

exports.deleteItem = async (req, res) => {
  const { id } = req.params;

  try {
    const item = await prisma.masterItem.findUnique({
      where: { id: parseInt(id) },
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    await prisma.masterItem.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting item", error });
  }
};
