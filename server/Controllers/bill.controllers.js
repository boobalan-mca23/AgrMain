const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const addRawGold = require("../Utils/addRawGoldStock");
const getCustomerBal = require("../Utils/getCustomerBalance");
// createBill

const createBill = async (req, res) => {
  const {
    date,
    time,
    customerId,
    billTotal,
    hallMark,
    orderItems,
    received,
    pureBalance,
    hallmarkBalance,
  } = req.body;
  console.log("req  body in bill", req.body);
  try {
    const customerExist = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) },
    });
    if (!customerExist) {
      return res.status(400).json({ msg: "Invalid Customer Id" });
    }

    // validate order items
    if (!orderItems || orderItems.length < 1) {
      return res
        .status(400)
        .json({ msg: "At least one order item is required" });
    }

    const modifiyOrders = orderItems.map((item, _) => ({
      productName: item.productName,
      weight: parseInt(item.weight),
      stoneWeight: parseFloat(item.stoneWeight),
      afterWeight: parseFloat(item.afterWeight),
      percentage: parseFloat(item.percentage),
      finalWeight: parseFloat(item.finalWeight),
    }));

    const newBill = await prisma.bill.create({
      data: {
        date: new Date(date),
        time: time,
        customer_id: parseInt(customerId),
        billAmount: parseFloat(billTotal),
        hallMark: parseFloat(hallMark),
        orders: { create: modifiyOrders },
      },
      include: {
        orders: true,
        customers: true,
      },
    });
    // newbill time we need to move rawgold stock
    await addRawGold.moveToRawGoldStock(received, newBill.id, customerId);

    for (const item of orderItems) {
      if (item.stockId) {
        await prisma.productStock.update({
          where: { id: parseInt(item.stockId) },
          data: {
            itemWeight: {
              decrement: parseFloat(item.finalWeight), // reduce stock
            },
          },
        });
      }
    }

    await prisma.customerBillBalance.upsert({
      where: { customer_id: parseInt(customerId) },
      update: {
        balance: parseFloat(pureBalance),
        hallMarkBal: parseFloat(hallmarkBalance),
      },
      create: {
        customer_id: parseInt(customerId),
        balance: parseFloat(pureBalance),
        hallMarkBal: parseFloat(hallmarkBalance),
      },
    });
    res
      .status(201)
      .json({ message: "Bill created successfully", bill: newBill });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ err: err.message });
  }
};
// update Bill

const updateBill = async (req, res) => {
  const { customerId, billId } = req.params;
  const { received, pureBalance, hallmarkBalance } = req.body;

  console.log("customerId", customerId);
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
    // update bill time we need to create or update rawGoldStock
    addRawGold.moveToRawGoldStock(received, billId, customerId);

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
    res.status(201).json({ message: "Bill updated successfully" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ err: err.message });
  }
};

// get bills by customer id
const getBillByCustomer = async (req, res) => {
  const { customerId } = req.params;

  try {
    const customerExist = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) },
    });
    if (!customerExist) {
      return res.status(400).json({ msg: "Invalid Customer Id" });
    }
    const bill = await prisma.bill.findMany({
      where: {
        customer_id: parseInt(customerId),
      },
      include: {
        orders: true,
        billReceive: true,
      },
    });

    return res.status(200).json({ bill });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ err: err.message });
  }
};

// get bill by billID
const getBillById = async (req, res) => {
  const { billId } = req.params;
  try {
    const allBills = await prisma.bill.findMany({
      where: {
        id: parseInt(billId),
      },
      include: {
        orders: true,
        billReceive: true,
      },
    });
    return res.status(200).json({ allBills });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ err: err.message });
  }
};

// get All bill

const geAllBill = async (req, res) => {
  try {
    const allBills = await prisma.bill.findMany({
      include: {
        orders: true,
        billReceive: true,
        customers:{
          include:{
            customerBillBalance:true
          }
        },
      },
    });
    const billId=allBills.length===0 ? 1:allBills[allBills.length-1].id

    return res.status(200).json({ data:allBills,billId:billId+1 });

  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ err: err.message });
  }
};

// customer report controller
const customerReport = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { fromDate, toDate } = req.query;

    const billWhere = {};
    const billReceiveWhere = {};
    const receiptWhere = {};
    const transactionWhere={};

    // If date range is provided
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999); // Include full day

      billWhere.createdAt = {
        gte: from,
        lte: to,
      };
      billReceiveWhere.createdAt = {
        gte: from,
        lte: to,
      };
      receiptWhere.createdAt = {
        gte: from,
        lte: to,
      };
       transactionWhere.createdAt = {
        gte: from,
        lte: to,
      };
    }

    // If customer_id is provided
    if (!isNaN(parseInt(customerId))) {
      billWhere.customer_id = parseInt(customerId);
      billReceiveWhere.cutomer_id = parseInt(customerId);
      receiptWhere.customer_id = parseInt(customerId);
      transactionWhere.customerId=parseInt(customerId)
    }

    let combinedData = [];
    // Check if at least date or customer_id is provided
    if ((fromDate && toDate) || customerId) {
      const allBill = await prisma.bill.findMany({
        where: billWhere,
        include: {
          orders: true,
        },
      });
      const billReceived = await prisma.billReceived.findMany({
        where: billWhere,
      });
      const allTransaction=await prisma.transaction.findMany({
        where:transactionWhere
      })
      const receipt = await prisma.receiptVoucher.findMany({
        where: receiptWhere,
      });

      const allReceive = [...billReceived, ...receipt];
    

      combinedData = [
        ...allBill.map((bill) => ({
          type: "bill",
          info: bill,
        })),
        ...allReceive.map((receive) => ({
          type: receive.billId ? "billReceive" : "ReceiptVoucher",
          info: receive,
        })),
        ...allTransaction.map((tran)=>({
          type:"transaction",
          info:tran
        }))
      
      ];

      // get overAll balance
      const overallBal = await getCustomerBal.getCustomerBalance(customerId);
   
      res.status(200).json({ data: combinedData, overallBal: overallBal });
    } else {
      res.status(200).json(combinedData);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
module.exports = {
  createBill,
  updateBill,
  getBillByCustomer,
  geAllBill,
  getBillById,
  customerReport,
};
