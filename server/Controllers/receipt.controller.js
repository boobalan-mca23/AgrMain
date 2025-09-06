const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const addRawGold=require('../Utils/RawGoldStock')
const createReceipt = async (req, res) => {

  const {customerId, received,pureBalance,hallmarkBalance} = req.body;

  try {
    // check customer
    const customerExist = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) },
    });
    if (!customerExist) {
      return res.status(400).json({ msg: "Invalid Customer Id" });
    }

    // validate received array
    if (!received || received.length < 1) {
      return res
        .status(400)
        .json({ msg: "At least one received item is required" });
    }
       // receipt voucher time we need to add rawGold stock
   await addRawGold.receiptMoveToRawGold(received,customerId) 

   await prisma.customerBillBalance.upsert({
      where: { customer_id: parseInt(customerId) },
      update: {
        balance: pureBalance,
        hallMarkBal: hallmarkBalance,
      },
      create: {
        customer_id: parseInt(customerId),
        balance: pureBalance,
        hallMarkBal: hallmarkBalance,
      },
    });
 

    res.status(201).json({ message: "Receipt Created successfully" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ err: err.message });
  }
};

module.exports = {
    createReceipt ,
  
};