const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const addRawGold=require('../Utils/addRawGoldStock')

// createBill

const createBill = async (req, res) => {
  const {billno,date,time, customerId, billTotal,hallMark, orderItems, received,previousBalance,  prevHallmark, currentHallmark ,pureBalance,hallmarkBalance} = req.body;
  // billno,date,time,
  // console.log('req.body',req.body)
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
    if(!received || received.length<1){
      return res
        .status(400)
        .json({ msg: "At least one received item is required" });
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
        billno: billno,
        date: new Date(date),
        time: time,
        customer_id: parseInt(customerId),
        billAmount: parseFloat(billTotal),
        hallMark:parseFloat(hallMark),
        orders: { create: modifiyOrders },
        previousBalance, 
        prevHallmark,    
        currentHallmark:req.body.currentHallmark ?? 0, 

       },
      include: {
        orders: true,
        customers: true,
        
      },
    });
    // newbill time we need to move rawgold stock  
    await addRawGold.moveToRawGoldStock(received,newBill.id,customerId) 

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
  const { customerId,billId } = req.params;
  const {received,pureBalance,hallmarkBalance} = req.body;
  
  console.log('customerId',customerId)
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
     addRawGold.moveToRawGoldStock(received,billId,customerId) 
   
   
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

      try{
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
            include:{
                orders:true,
                billReceive:true
            }
       });

       return res.status(200).json({bill})

     }catch(err){
        console.error(err.message);
        return res.status(500).json({ err: err.message });
      }
};

// get bill by billID
    const getBillById=async (req,res) =>{
        const { billId } = req.params;
     try{
        const allBills=await prisma.bill.findMany({
            where:{
                id:parseInt(billId)
            },
            include:{
                orders:true,
                billReceive:true
            }
        })
        return res.status(200).json({allBills})
     }catch(err){
        console.error(err.message);
        return res.status(500).json({ err: err.message });
     }
  }


// get All bill

  const geAllBill=async (req,res) =>{
     try{
        const allBills=await prisma.bill.findMany({
            include:{
                orders:true,
                billReceive:true,
                customers:true
            }
        })
        return res.status(200).json({allBills})
     }catch(err){
        console.error(err.message);
        return res.status(500).json({ err: err.message });
     }
  }
module.exports = {
  createBill,
  updateBill,
  getBillByCustomer,
  geAllBill,
  getBillById
};
