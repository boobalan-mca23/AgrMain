const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const addRawGold=require('../Utils/addRawGoldStock')
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

const getReceiptByCustomerId = async (req, res) => {
  try {
    const { customerId } = req.params;

      console.log('customerid',customerId)

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const receipt = await prisma.receiptVoucher.findMany({
      where: { customerId: parseInt(customerId) },
      orderBy: { id: "desc" },
    });
     console.log(receipt)

    res.status(200).json(receipt);
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const formatDate = (dateString) => {
  const [day, month, year] = dateString.split("/");
  return `${year}-${month}-${day}`;
};

const receiptFilter = async (req, res) => {
  const { fromDate, toDate } = req.query;
  const { id } = req.params;
  console.log("reqquery", req.query);

  try {
    let whereCondition = {};

    // If id exists and not "null", add goldsmith filter
    if (id && id !== "null") {
      whereCondition.customer_id = parseInt(id);
    }

    // If fromDate and toDate exist and not "null", add date filter
    if (fromDate && toDate && fromDate !== "null" && toDate !== "null") {
      const parsedFromDate = new Date(formatDate(fromDate));
      const parsedToDate = new Date(formatDate(toDate));

      // Adjust toDate to include the entire day
      parsedToDate.setHours(23, 59, 59, 999);

      if (isNaN(parsedFromDate.getTime()) || isNaN(parsedToDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      whereCondition.createdAt = {
        gte: parsedFromDate,
        lte: parsedToDate,
      };
    }

    // If both id = null and dates = null → whereCondition = {} (fetch all)
    const filterReceipts = await prisma.receiptVoucher.findMany({
      where: whereCondition,
      select:{
        date:true,
        type:true,
        goldRate:true,
        gold:true,
        touch:true,
        purity:true,
        amount:true,
        receiveHallMark:true
      }
    });

    res.json(filterReceipts);
  } catch (error) {
    console.error("Error filtering receipts:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
module.exports = {
    createReceipt ,
    getReceiptByCustomerId,
    receiptFilter
  
};