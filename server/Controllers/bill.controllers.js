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
    prevHallmark,
    prevBalance,
    billDetailsprofit,
    Stoneprofit,
    Totalprofit,
    cashBalance,
    hallmarkQty,
 
  } = req.body;
  console.log("req  body in bill", req.body);
  try {
    const customerExist = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) },
    });
    if (!customerExist) {
      return res.status(400).json({ msg: "Invalid Customer Id" });
    }
 
    if (!orderItems || orderItems.length < 1) {
      return res
        .status(400)
        .json({ msg: "At least one order item is required" });
    }
 
    const modifiyOrders = orderItems.map((item) => ({
      productName: item.productName,
      count: item.count ? parseInt(item.count) : undefined,
      weight: item.weight ? parseFloat(item.weight) : undefined,
      stoneWeight: item.stoneWeight ? parseFloat(item.stoneWeight) : undefined,
      afterWeight: item.afterWeight ? parseFloat(item.afterWeight) : undefined,
      percentage: item.percentage ? parseFloat(item.percentage) : undefined,
      finalWeight: item.finalWeight ? parseFloat(item.finalWeight) : undefined,
    }));
 
 
    const newBill = await prisma.bill.create({
      data: {
        date: new Date(date),
        time: time,
        hallmarkQty:parseFloat(hallmarkQty)||0,
        cashBalance: parseFloat(cashBalance),
        customer_id: parseInt(customerId),
        billAmount: parseFloat(billTotal),
        hallMark: parseFloat(hallMark),
        prevHallMark: parseFloat(prevHallmark),
        PrevBalance: parseFloat(prevBalance),
        billDetailsprofit : parseFloat(billDetailsprofit),
        Stoneprofit: parseFloat(Stoneprofit),
        Totalprofit :parseFloat(Totalprofit),
        orders: { create: modifiyOrders },
      },
      include: {
        orders: true,
        customers: true,
      },
    });
    // newbill time we need to move rawgold stock
    await addRawGold.moveToRawGoldStock(received, newBill.id, customerId);
 
    // for (const item of orderItems) {
    //   if (item.stockId) {
    //     await prisma.productStock.update({
    //       where: { id: parseInt(item.stockId) },
    //       data: {
    //         itemWeight: {
    //           decrement: parseFloat(item.finalWeight), // reduce stock
    //         },
    //       },
    //     });
    //   }
    // }
 
    for (const item of orderItems) {
      if (item.stockId) {
        // parse safely
        const stock=await prisma.productStock.findMany({where:{
          id:item.stockId
        },
          select:{
           itemWeight:true,
           touch:true,
           wastageValue:true
          }},)

         const decProductWt = isNaN(parseFloat(item.weight)) ? 0 : parseFloat(item.weight);
         const decStoneWeight = isNaN(parseFloat(item.stoneWeight)) ? 0 : parseFloat(item.stoneWeight);
         const decCount = item.count ? (isNaN(parseInt(item.count)) ? 0 : parseInt(item.count)) : 0;
         const remainWt=stock[0].itemWeight-decProductWt
         const wastagePure=((remainWt*stock[0].touch)/100) - ((remainWt*stock[0].wastageValue)/100)
         const finalPurity=(remainWt*stock[0].wastageValue)/100 
        
        await prisma.productStock.update({
          where: { id: parseInt(item.stockId) },
          data: {
            itemWeight:remainWt||0,
            // decrement stoneWeight if present
            stoneWeight: decStoneWeight ? { decrement: decStoneWeight } : undefined,
            // decrement count if present
            count: decCount ? { decrement: decCount } : undefined,
            wastagePure:wastagePure||0,
            // if you also store finalWeight total on stock, adjust this too
            finalWeight:finalPurity||0
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
}
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
     orderBy:{
       id:"desc"
     }
    });
    const billId=allBills.length+1
    console.log('billid',billId)
    return res.status(200).json({ data:allBills,billId:billId});

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
