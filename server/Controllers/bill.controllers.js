const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// createBill

const createBill = async (req, res) => {
  const { customerId, billTotal,hallMark, orderItems, received } = req.body;

  try {
    // check customer
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

    const modifiyReceieve = received.map((receive, _) => ({
      customer_id: parseInt(customerId),
      goldRate: parseInt(receive.goldRate),
      gold: parseFloat(receive.gold),
      touch: parseFloat(receive.touch),
      purity: parseFloat(receive.purity),
      receiveHallMark:parseFloat(receive.receiveHallMark),
      amount: parseInt(receive.amount),
    }));

    const newBill = await prisma.bill.create({
      data: {
        customer_id: parseInt(customerId),
        billAmount: parseFloat(billTotal),
        hallMark:parseFloat(hallMark),
        orders: { create: modifiyOrders },
       },
      include: {
        orders: true,
        customers: true,
      },
    });

    await prisma.billReceived.createMany({data:modifiyReceieve})
    
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
  const { customerId } = req.params;
  const {received,pureBalance,hallmarkBalance} = req.body;
  console.log('reqBody',req.body)
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

    // build queries for transaction
    const queries = received.map((receive) => {
      const data = {
        customer_id:parseInt(customerId),
        date:receive.date,
        goldRate: parseInt(receive.goldRate)||0,
        type:receive.type,
        gold: parseFloat(receive.gold)||0,
        touch: parseFloat(receive.touch)||0,
        purity: parseFloat(receive.purity)||0,
        amount: parseFloat(receive.amount)||0,
        receiveHallMark:parseFloat(receive.hallMark)||0
      };

      if (receive.id) {
        // update existing
        return prisma.billReceived.update({
          where: { id: parseInt(receive.id) },
          data,
        });
      } else {
        // create new
        return prisma.billReceived.create({ data });
      }

    });
   const balanceQuery = prisma.customerBillBalance.upsert({
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

    //  run everything in one transaction
    await prisma.$transaction([...queries, balanceQuery]);

    

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
                billReceive:true
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
