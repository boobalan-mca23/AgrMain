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
    customername,
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
    console.log("orderItems", orderItems);
    const modifiyOrders = orderItems.map((item) => {
      const netWeight = item.netWeight ? parseFloat(item.netWeight) : 0;
      const touch = item.touch ? parseFloat(item.touch) : 0;
      const wastageValue = item.wastageValue ? parseFloat(item.wastageValue) : 0;

      const actualPurity = (netWeight * touch) / 100;

      let wastagePure = 0;
      let finalPurity = 0;

      if (item.wastageType === "Touch") {
        finalPurity = (netWeight * wastageValue) / 100;
        wastagePure = finalPurity - actualPurity;
      } else if (item.wastageType === "%") {
        const wastageWeight = (netWeight * wastageValue) / 100;
        const finalWeight = netWeight + wastageWeight;
        finalPurity = (finalWeight * touch) / 100;
        wastagePure = finalPurity - actualPurity;
      } else if (item.wastageType === "+") {
        const finalWeight = netWeight + wastageValue;
        finalPurity = (finalWeight * touch) / 100;
        wastagePure = finalPurity - actualPurity;
      }

      return {
        productName: item.productName,
        count: item.count ? parseInt(item.count) : undefined,
        weight: item.weight ? parseFloat(item.weight) : undefined,
        stoneWeight: item.stoneWeight ? parseFloat(item.stoneWeight) : undefined,
        enteredStoneWeight: item.enteredStoneWeight ? parseFloat(item.enteredStoneWeight) : undefined,
        afterWeight: item.afterWeight ? parseFloat(item.afterWeight) : undefined,
        percentage: item.percentage ? parseFloat(item.percentage) : undefined,
        finalWeight: item.finalWeight ? parseFloat(item.finalWeight) : undefined,

        stockId: item.stockId ? parseInt(item.stockId) : undefined,
        stockType: item.stockType || "PRODUCT",
        touch,
        netWeight,
        wastageValue,
        wastageType: item.wastageType,
        actualPurity,
        wastagePure,
        finalPurity
      };
    });

    const lastBill = await prisma.bill.findFirst({
      orderBy: { id: "desc" },
    });

    const nextBillNo = lastBill ? (lastBill.billno || lastBill.id) + 1 : 1;

    const billPureEffect = parseFloat(pureBalance) - parseFloat(prevBalance);
    const billHallmarkEffect = parseFloat(hallmarkBalance) - parseFloat(prevHallmark);
    let newBill;

    await prisma.$transaction(async (tx) => {
      newBill = await tx.bill.create({
        data: {
          billno: nextBillNo,
          date: new Date(date),
          time: time,
          customername: customername,
          hallmarkQty: parseFloat(hallmarkQty) || 0,
          cashBalance: parseFloat(cashBalance),
          customer_id: parseInt(customerId),
          billAmount: parseFloat(billTotal),
          hallMark: parseFloat(hallMark),
          prevHallMark: parseFloat(prevHallmark),
          PrevBalance: parseFloat(prevBalance),
          billPureEffect,
          billHallmarkEffect,
          billDetailsprofit: parseFloat(billDetailsprofit),
          Stoneprofit: parseFloat(Stoneprofit),
          Totalprofit: parseFloat(Totalprofit),
          orders: { create: modifiyOrders },
        },
        include: {
          orders: true,
          customers: true,
        },
      });
      console.log("newBill created", newBill);
      // newbill time we need to move rawgold stock
      await addRawGold.moveToRawGoldStock(received || [], newBill.id, customerId, tx);

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

          if (item.stockType === "ITEM_PURCHASE") {
            const itemPurchaseEntry = await tx.itemPurchaseEntry.findUnique({
              where: { id: parseInt(item.stockId) },
            });

            if (itemPurchaseEntry) {
              // Split logic for item purchase bill deductions
              const decProductWt = isNaN(parseFloat(item.weight)) ? 0 : parseFloat(item.weight);
              const remainWt = itemPurchaseEntry.netWeight - decProductWt;

              await tx.itemPurchaseEntry.update({
                where: { id: parseInt(item.stockId) },
                data: {
                  netWeight: remainWt,
                  isSold: remainWt <= 0,
                  soldAt: remainWt <= 0 ? new Date() : null,
                },
              });
            }
            continue;
          }

          // parse safely (for PRODUCT stock)
          const stock = await tx.productStock.findMany({
            where: {
              id: item.stockId
            },
          });

          if (!stock || stock.length === 0) continue;

          const decProductWt = isNaN(parseFloat(item.weight)) ? 0 : parseFloat(item.weight);
          const decStoneWeight = isNaN(parseFloat(item.stoneWeight)) ? 0 : parseFloat(item.stoneWeight);
          const decCount = item.count ? (isNaN(parseInt(item.count)) ? 0 : parseInt(item.count)) : 0;
          const remainWt = stock[0].itemWeight - decProductWt
          const prevNetWeight = parseFloat(stock[0].netWeight) || 0;
          const billNetWeight = parseFloat(item.netWeight) || 0;
          const netWeight = prevNetWeight - billNetWeight;

          const actualPurity = (netWeight * stock[0].touch) / 100;

          let wastagePure = 0;
          let finalPurity = 0;

          if (stock[0].wastageType === "Touch") {
            finalPurity = (netWeight * stock[0].wastageValue) / 100;
            wastagePure = finalPurity - actualPurity;

          } else if (stock[0].wastageType === "%") {
            const wastageWeight = (netWeight * stock[0].wastageValue) / 100;
            const finalWastewt = netWeight + wastageWeight;
            finalPurity = (finalWastewt * stock[0].touch) / 100;
            wastagePure = finalPurity - actualPurity;

          } else if (stock[0].wastageType === "+") {
            const wastageWeight = netWeight + stock[0].wastageValue;
            finalPurity = (wastageWeight * stock[0].touch) / 100;
            wastagePure = finalPurity - actualPurity;
          }

          await tx.productStock.update({
            where: { id: parseInt(item.stockId) },
            data: {
              itemWeight: remainWt,
              stoneWeight: decStoneWeight ? { decrement: decStoneWeight } : undefined,
              count: decCount ? { decrement: decCount } : undefined,

              netWeight,
              wastagePure,
              finalPurity,
              wastageType: stock[0].wastageType,
              isBillProduct: remainWt > 0.05,
              isActive: remainWt > 0.05,
            },
          });
        }
      }



      await tx.customerBillBalance.upsert({
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
    })
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
  const {
    received,
    pureBalance,
    hallmarkBalance,
    billTotal,
    hallMark,
    prevHallmark,
    prevBalance,
    billDetailsprofit,
    Stoneprofit,
    Totalprofit,
    hallmarkQty,
    orderItems,
  } = req.body;

  console.log("updateBill customerId", customerId, "billId", billId);
  try {
    // check customer
    const customerExist = await prisma.customer.findUnique({
      where: { id: parseInt(customerId) },
    });
    if (!customerExist) {
      return res.status(400).json({ msg: "Invalid Customer Id" });
    }

    // Update the main bill fields
    let modifiedOrders = [];

    if (orderItems && orderItems.length > 0) {

      modifiedOrders = orderItems.map((item) => {

        const netWeight = item.netWeight ? parseFloat(item.netWeight) : 0;
        const touch = item.touch ? parseFloat(item.touch) : 0;
        const wastageValue = item.wastageValue ? parseFloat(item.wastageValue) : 0;

        const actualPurity = (netWeight * touch) / 100;

        let wastagePure = 0;
        let finalPurity = 0;

        if (item.wastageType === "Touch") {
          finalPurity = (netWeight * wastageValue) / 100;
          wastagePure = finalPurity - actualPurity;

        } else if (item.wastageType === "%") {

          const wastageWeight = (netWeight * wastageValue) / 100;
          const finalWeight = netWeight + wastageWeight;

          finalPurity = (finalWeight * touch) / 100;
          wastagePure = finalPurity - actualPurity;

        } else if (item.wastageType === "+") {

          const finalWeight = netWeight + wastageValue;

          finalPurity = (finalWeight * touch) / 100;
          wastagePure = finalPurity - actualPurity;
        }

        return {
          productName: item.productName,
          count: item.count ? parseInt(item.count) : undefined,
          weight: item.weight ? parseFloat(item.weight) : undefined,
          stoneWeight: item.stoneWeight ? parseFloat(item.stoneWeight) : undefined,
          enteredStoneWeight: item.enteredStoneWeight ? parseFloat(item.enteredStoneWeight) : undefined,
          afterWeight: item.afterWeight ? parseFloat(item.afterWeight) : undefined,
          percentage: item.percentage ? parseFloat(item.percentage) : undefined,
          finalWeight: item.finalWeight ? parseFloat(item.finalWeight) : undefined,

          touch,
          netWeight,
          wastageValue,
          wastageType: item.wastageType,

          actualPurity,
          wastagePure,
          finalPurity
        };

      });

    }

    const billIdNum = parseInt(billId);
    const customerIdNum = parseInt(customerId);

    // get the old bill
    const oldBill = await prisma.bill.findUnique({
      where: { id: billIdNum },
      select: {
        billPureEffect: true,
        billHallmarkEffect: true
      }
    });

    // get current customer balance
    const customerBalance = await prisma.customerBillBalance.findUnique({
      where: { customer_id: customerIdNum }
    });

    const currentPure = customerBalance?.balance || 0;
    const currentHallmark = customerBalance?.hallMarkBal || 0;

    const oldPureEffect = oldBill?.billPureEffect || 0;
    const oldHallEffect = oldBill?.billHallmarkEffect || 0;

    // new bill effect
    const newPureEffect =
      parseFloat(pureBalance) - parseFloat(prevBalance);

    const newHallEffect =
      parseFloat(hallmarkBalance) - parseFloat(prevHallmark);

    // compute new overall balances
    const updatedPureBalance =
      currentPure - oldPureEffect + newPureEffect;

    const updatedHallmarkBalance =
      currentHallmark - oldHallEffect + newHallEffect;

    await prisma.$transaction(async (tx) => {
      await tx.bill.update({
        where: { id: billIdNum },
        data: {
          billAmount: parseFloat(billTotal) || 0,
          hallMark: parseFloat(hallMark) || 0,

          prevHallMark: parseFloat(prevHallmark) || 0,
          PrevBalance: parseFloat(prevBalance) || 0,

          billPureEffect: newPureEffect,
          billHallmarkEffect: newHallEffect,
          hallmarkQty: parseFloat(hallmarkQty) || 0,
          billDetailsprofit: parseFloat(billDetailsprofit) || 0,
          Stoneprofit: parseFloat(Stoneprofit) || 0,
          Totalprofit: parseFloat(Totalprofit) || 0,
        }
      });

      // Manual update/create/delete for order items to preserve repairStatus and IDs
      const existingItems = await tx.orderItems.findMany({ where: { billId: billIdNum } });
      const incomingIds = modifiedOrders.map(o => o.id).filter(id => id !== undefined);

      // 1. Delete items that were removed
      await tx.orderItems.deleteMany({
        where: {
          billId: billIdNum,
          id: { notIn: incomingIds }
        }
      });

      // 2. Update existing or Create new
      for (const item of modifiedOrders) {
        const { id, ...itemData } = item;
        if (id) {
          await tx.orderItems.update({
            where: { id: parseInt(id) },
            data: {
              ...itemData,
              // repairStatus is included in itemData via frontend
            }
          });
        } else {
          await tx.orderItems.create({
            data: {
              ...itemData,
              billId: billIdNum
            }
          });
        }
      }

      // update customer balance
      await tx.customerBillBalance.upsert({
        where: { customer_id: customerIdNum },
        update: {
          balance: updatedPureBalance,
          hallMarkBal: updatedHallmarkBalance,
        },
        create: {
          customer_id: customerIdNum,
          balance: updatedPureBalance,
          hallMarkBal: updatedHallmarkBalance,
        },
      });

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
    console.log("allBills", allBills);
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
        customers: true,
        customers: {
          include: {
            customerBillBalance: true
          }
        },
      },
      orderBy: {
        id: "desc"
      }
    });
    //uneven num
    //  const lastBill = allBills[0];
    //   const nextBillNo = lastBill ? (lastBill.billno || lastBill.id) + 1 : 1;
    let [status] = await prisma.$queryRawUnsafe(
      `SHOW TABLE STATUS LIKE 'Bill'`
    );

    if (!status) {
      [status] = await prisma.$queryRawUnsafe(
        `SHOW TABLE STATUS LIKE 'bill'`
      );
    }

    // Convert BigInt safely to number
    const nextBillNo = Number(status?.Auto_increment) || (allBills[0]?.id + 1) || 1;

    return res.status(200).json({ data: allBills, billId: nextBillNo, nextBillNo, });

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
    const transactionWhere = {};

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
      transactionWhere.customerId = parseInt(customerId)
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
      const allTransaction = await prisma.transaction.findMany({
        where: transactionWhere
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
        ...allTransaction.map((tran) => ({
          type: "transaction",
          info: tran
        }))

      ];

      // get overAll balance
      const overallBal = await prisma.customerBillBalance.findUnique({
        where: { customer_id: parseInt(customerId) },
        select: { balance: true, initialBalance: true },
      });

      res.status(200).json({ data: combinedData, overallBal: overallBal });
    } else {
      res.status(200).json(combinedData);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
// delete bill
const deleteBill = async (req, res) => {
  const { billId } = req.params;

  try {
    // Check if the bill exists
    const billExist = await prisma.bill.findUnique({
      where: { id: parseInt(billId) },
    });
    if (!billExist) {
      return res.status(404).json({ msg: "Bill not found" });
    }

    // Delete associated orders first due to foreign key constraints
    // await prisma.order.deleteMany({
    //   where: { bill_id: parseInt(billId) },
    // });

    // Delete the bill
    await prisma.bill.delete({
      where: { id: parseInt(billId) },
    });

    res.status(200).json({ message: "Bill deleted successfully" });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ err: err.message });
  }
};

module.exports = {
  createBill,
  updateBill,
  getBillByCustomer,
  geAllBill,
  deleteBill,
  getBillById,
  customerReport,
};
