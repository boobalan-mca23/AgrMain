const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {changeJobCardBalance}=require('../Utils/updateGoldSmithBalance')
exports.createGoldsmith = async (req, res) => {

  let { name, phonenumber, address ,balance} = req.body;

  if (!name) {
    return res.status(400).json({ message: "Goldsmith name is required." });
  }

  // normalize values
  phonenumber = phonenumber && phonenumber.trim() !== "" ? phonenumber.trim() : null;
  address = address && address.trim() !== "" ? address.trim() : null;

  // check only if phone is not null
  if (phonenumber) {
    const ifExist = await prisma.goldsmith.findFirst({
      where: { phone: phonenumber }
    });

    if (ifExist) {
      return res.status(400).json({ message: "Phone number already exists" });
    }
  }

  try {
    const newGoldsmith = await prisma.goldsmith.create({
      data: {
        name: name.trim(),
        phone: phonenumber,
        address,
        balance:parseFloat(balance)||0
      },
    });
    res.status(201).json(newGoldsmith);
  } catch (error) {
    res.status(500).json({ message: "Error creating goldsmith", error });
  }
};


exports.getAllGoldsmith = async (req, res) => {
  try {
    const goldsmith = await prisma.goldsmith.findMany({
      orderBy:{
        id:"desc"
      }
    });

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
  let { name, phone, address ,balance,balanceisEdited} = req.body;

  phone = phone && phone.trim() !== "" ? phone.trim() : null;
  address = address && address.trim() !== "" ? address.trim() : null;

  // check duplicate phone if not null
  if (phone) {
    const ifExist = await prisma.goldsmith.findFirst({
      where: {
        phone,
        NOT: { id: parseInt(id) }, // exclude self
      },
    });

    if (ifExist) {
      return res.status(400).json({ message: "Phone number already exists" });
    }
  }

  try {
    const updatedGoldsmith = await prisma.goldsmith.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        phone,
        address,
        balance:parseFloat(balance)||0
      },
    });

    if(balanceisEdited) { // change jobcard balance
        changeJobCardBalance(id,balance)
    }
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
