const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { entryToRawGold } = require('../Utils/addRawGoldStock')
const { directTouch } = require('../Utils/directTouch')

exports.getAllEntries = async (req, res) => {
  try {
    const entries = await prisma.entry.findMany({
      orderBy: { id: "desc" },
    });
    console.log('cash or gold entries', entries)
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
};

exports.createEntry = async (req, res) => {
  const { date, type, cashAmount, goldValue, touch, purity, goldRate } = req.body;

  try {

    // this function create touch direct
    await directTouch(touch)

    const newEntry = await entryToRawGold(date, type, cashAmount, goldValue, touch, purity, goldRate);
    res.status(201).json(newEntry);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create Entry" });
  }
};

exports.updateEntry = async (req, res) => {
  const { id } = req.params;
  const { date, type, cashAmount, goldValue, touch, purity, goldRate, logId } = req.body;

  try {
    // this function create touch direct
    await directTouch(touch)

    const updatedEntry = await entryToRawGold(date, type, cashAmount, goldValue, touch, purity, goldRate, logId);
    res.status(200).json(updatedEntry);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update Entry" });
  }
};

