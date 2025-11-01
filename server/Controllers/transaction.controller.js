
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const transToRawGold=require('../Utils/addRawGoldStock')
const {directTouch}=require('../Utils/directTouch')
const createTransaction = async (req, res) => {
  try {
    const { date, type,amount,gold, touch, purity, customerId, goldRate } = req.body;

    if (!date || !type || !customerId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
       // this function create touch direct
      await directTouch(touch)

      const transaction=await transToRawGold.transactionToRawGold(date, type,amount,gold, touch, purity, customerId, goldRate )
     console.log('transaction form return function',transaction)

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getAllTransactions = async (req, res) => {
  try {
    const { customerId } = req.params;
    console.log('customerid',customerId)
    
    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const transactions = await prisma.transaction.findMany({
      where: { customerId: parseInt(customerId) },
      orderBy: { id: "desc" },
    });
     console.log(transactions)

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createTransaction,
  getAllTransactions,
};
