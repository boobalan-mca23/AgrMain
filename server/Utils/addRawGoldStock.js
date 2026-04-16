const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const setTotalRawGold = async (tx = prisma) => {
  // 1. Get all raw gold stocks
  const allStocks = await tx.rawgoldStock.findMany({ select: { id: true } });

  // 2. Group logs by rawGoldStockId and sum weights (pure) and amounts (physical)
  const grouped = await tx.rawGoldLogs.groupBy({
    by: ["rawGoldStockId"],
    _sum: {
      weight: true,
      amount: true,
    },
  });

  // Create maps for quick lookup
  const pureMap = grouped.reduce((map, g) => {
    map[g.rawGoldStockId] = g._sum.weight || 0;
    return map;
  }, {});

  const amtMap = grouped.reduce((map, g) => {
    map[g.rawGoldStockId] = g._sum.amount || 0;
    return map;
  }, {});

  // 3. Update every stock
  for (const s of allStocks) {
    const totalPure = pureMap[s.id] || 0;
    const totalAmt = amtMap[s.id] || 0;
    await tx.rawgoldStock.update({
      where: { id: s.id },
      data: {
        weight: totalPure,
        remainingWt: totalPure,
        amount: totalAmt,
        remainingAmt: totalAmt,
      },
    });
  }
};



const createhundredPercentTouch = async (tx = prisma) => {
  // In received section we have goldRate so that time we need to create new touch as 100
  const ifExist = await tx.masterTouch.findFirst({
    where: {
      touch: 100
    }
  })

  if (!ifExist) {
    await tx.masterTouch.create({
      data: {
        touch: 100,
        rawGoldStock: {
          create: {
            weight: 0,
            remainingWt: 0,
            touch: 100
          }
        }
      },
    });
  }
}


const moveToRawGoldStock = async (received, billId, customerId, tx = prisma) => {
  if (!received || received.length === 0) return;
  await createhundredPercentTouch(tx);
  if (received.length >= 1) {
    for (const receive of received) {
      let data = {
        date: receive.date,
        type: receive.type,
        goldRate: parseInt(receive.goldRate) || 0,
        gold: parseInt(receive.gold) || 0,
        touch: parseFloat(receive.touch) || 0,
        purity: parseFloat(receive.purity) || 0,
        receiveHallMark: parseFloat(receive.receiveHallMark) || 0,
        amount: parseFloat(receive.amount) || 0,
      };

      if (receive.id) {
        // Update existing
        await tx.rawGoldLogs.update({
          where: { id: receive.logId },
          data: {
            weight: data.purity,
            amount: (data.type === "Cash" || data.type === "Cash RTGS") ? (data.touch > 0 ? (data.purity / data.touch) * 100 : 0) : data.gold,
            touch: data.touch,
            purity: data.purity,
          },
        });

        await tx.billReceived.update({
          where: { id: parseInt(receive.id) },
          data,
        });
      } else {
        // Find stock by touch
        const stock = await tx.rawgoldStock.findFirst({
          where: { touch: (data.type === "Cash" || data.type === "Cash RTGS") ? 100 : parseFloat(data.touch) || 0, },
          select: { id: true },
        });

        if (!stock) {
          throw new Error(`No stock found for touch: ${data.touch}`);
        }

        // Create raw gold log
        const rawGoldLog = await tx.rawGoldLogs.create({
          data: {
            rawGoldStockId: stock.id,
            weight: data.purity || 0,
            amount: (data.type === "Cash" || data.type === "Cash RTGS") ? (data.touch > 0 ? (data.purity / data.touch) * 100 : 0) : (data.gold || 0),
            touch: (data.type === "Cash" || data.type === "Cash RTGS") ? 100 : (parseFloat(data.touch) || 0),
            purity: data.purity,
          },
        });

        // Create billReceived with relations connected
        await tx.billReceived.create({
          data: {
            ...data,
            bill: { connect: { id: parseInt(billId) } },          //  connect Bill
            customers: { connect: { id: parseInt(customerId) } }, //  connect Customer
            rawGoldLogs: { connect: { id: rawGoldLog.id } },      //  connect RawGoldLog
          },
        });
      }
    }
  }

  await setTotalRawGold(tx);
};

const receiptMoveToRawGold = async (received, customerId) => {
  await createhundredPercentTouch();

  if (received.length >= 1) {
    await prisma.$transaction(async (tx) => {
      for (const receive of received) {
        let data = {
          date: receive.date,
          type: receive.type,
          goldRate: parseInt(receive.goldRate) || 0,
          gold: parseInt(receive.gold) || 0,
          touch: parseFloat(receive.touch) || 0,
          purity: parseFloat(receive.purity) || 0,
          receiveHallMark: parseFloat(receive.hallMark) || 0,
          amount: parseFloat(receive.amount) || 0,
        };

        if (receive.id) {
          // Update existing
          await tx.rawGoldLogs.update({
            where: { id: receive.logId },
            data: {
              weight: data.purity,
              amount: (data.type === "Cash" || data.type === "Cash RTGS") ? (data.touch > 0 ? (data.purity / data.touch) * 100 : 0) : data.gold,
              touch: data.touch,
              purity: data.purity,
            },
          });

          await tx.receiptVoucher.update({
            where: { id: parseInt(receive.id) },
            data,
          });
        } else {
          // Find stock by touch
          const stock = await tx.rawgoldStock.findFirst({
            where: { touch: (data.type === "Cash" || data.type === "Cash RTGS") ? 100 : parseFloat(data.touch) || 0, },
            select: { id: true },
          });

          if (!stock) {
            throw new Error(`No stock found for touch: ${data.touch}`);
          }

          // Create raw gold log
          const rawGoldLog = await tx.rawGoldLogs.create({
            data: {
              rawGoldStockId: stock.id,
              weight: parseFloat(data.purity) || 0,
              amount: (data.type === "Cash" || data.type === "Cash RTGS") ? (data.touch > 0 ? (parseFloat(data.purity) / data.touch) * 100 : 0) : (parseFloat(data.gold) || 0),
              touch: (data.type === "Cash" || data.type === "Cash RTGS") ? 100 : (parseFloat(data.touch) || 0),
              purity: parseFloat(data.purity),
            },
          });


          await tx.receiptVoucher.create({
            data: {
              ...data,
              customers: { connect: { id: parseInt(customerId) } }, //  connect Customer
              rawGoldLogs: { connect: { id: rawGoldLog.id } },      //  connect RawGoldLog
            },
          });
        }
      }
    });
  }

  await setTotalRawGold();
};
const jobCardtoRawGoldStock = async (receiveSection, goldSmithId, jobCardId) => {
  // stock update

  if (receiveSection.length >= 1) {
    for (const receive of receiveSection) {
      let data = {
        goldsmithId: parseInt(goldSmithId),
        jobcardId: parseInt(jobCardId),
        weight: parseFloat(receive.weight) || 0,
        touch: parseFloat(receive.touch) || null,
        purity: parseFloat(receive.purity) || 0,
      };
      if (receive.id) {
        await prisma.rawGoldLogs.update({ // this change in raw gold stock
          where: {
            id: receive.logId,
          },
          data: {
            weight: data.purity,
            amount: data.weight, // physical
            touch: data.touch,
            purity: data.purity,
          },
        });
        await prisma.receivedsection.update({
          where: { id: parseInt(receive.id) },
          data,
        });
      } else {
        const stock = await prisma.rawgoldStock.findFirst({
          where: {
            touch: data.touch, // match the touch value
          },
          select: {
            id: true, // only return the id
          },
        });
        if (!stock) {
          throw new Error(`No stock found for touch: ${data.touch}`);
        }
        const rawGoldLog = await prisma.rawGoldLogs.create({
          data: {
            rawGoldStockId: stock.id,
            weight: data.purity,
            amount: data.weight, // physical
            touch: data.touch,
            purity: data.purity,
          },
        });
        data = {
          ...data,
          logId: rawGoldLog.id,
        };
        await prisma.receivedsection.create({ data });
      }
    }
  }
  await setTotalRawGold();
};
const transactionToRawGold = async (date, type, amount, gold, touch, purity, customerId, goldRate) => {

  await createhundredPercentTouch();

  const actualTouch = parseFloat(touch) || 0;
  const stock = await prisma.rawgoldStock.findFirst({
    where: { touch: actualTouch },
    select: { id: true },
  });
  if (!stock) {
    throw new Error(`No stock found for touch: ${actualTouch}`);
  }

  let pureWeight = parseFloat(purity) || 0;
  let physAmount = (type === "Cash" || type === "Cash RTGS") ? (actualTouch > 0 ? (pureWeight / actualTouch) * 100 : 0) : (parseFloat(gold) || 0);

  const rawGoldLog = await prisma.rawGoldLogs.create({
    data: {
      rawGoldStockId: stock.id,
      weight: pureWeight,
      amount: physAmount,
      touch: actualTouch,
      purity: pureWeight,
    },
  });

  const transaction = await prisma.transaction.create({
    data: {
      date: new Date(date),
      type,
      amount: parseFloat(amount) || 0,
      goldRate: parseFloat(goldRate) || 0,
      gold: parseFloat(gold) || 0,
      purity: parseFloat(purity) || 0,
      touch: actualTouch,
      customer: {
        connect: {
          id: parseInt(customerId),
        },
      },
      rawGoldLogs: {
        connect: { id: rawGoldLog.id }
      }
    },
  });

  const value = (type === "Cash" || type === "Cash RTGS") ? (parseFloat(purity) / actualTouch) * 100 : parseFloat(purity) || 0;
  await prisma.customerBillBalance.update({ // update customer excess balance
    where: {
      id: parseInt(customerId)
    },
    data: {
      balance: {
        increment: -value || 0
      }
    }
  })

  await setTotalRawGold(); // we need to add rawGold 

  return transaction;
}

const updateTransactionInRawGold = async (id, date, type, amount, gold, touch, purity, customerId, goldRate) => {
  await createhundredPercentTouch();

  const oldTransaction = await prisma.transaction.findUnique({
    where: { id: parseInt(id) },
    include: { rawGoldLogs: true }
  });

  if (!oldTransaction) throw new Error("Transaction not found");

  // 1. Reverse old balance
  const oldTouch = parseFloat(oldTransaction.touch) || 0;
  const oldValue = (oldTransaction.type === "Cash" || oldTransaction.type === "Cash RTGS")
    ? (parseFloat(oldTransaction.purity) / oldTouch) * 100
    : parseFloat(oldTransaction.purity) || 0;

  await prisma.customerBillBalance.update({
    where: { id: parseInt(oldTransaction.customerId) },
    data: { balance: { increment: oldValue || 0 } }
  });

  // 2. Prepare new values
  const actualTouch = parseFloat(touch) || 0;
  const stock = await prisma.rawgoldStock.findFirst({
    where: { touch: actualTouch },
    select: { id: true },
  });
  if (!stock) throw new Error(`No stock found for touch: ${actualTouch}`);

  let pureWeight = parseFloat(purity) || 0;
  let physAmount = (type === "Cash" || type === "Cash RTGS") ? (actualTouch > 0 ? (pureWeight / actualTouch) * 100 : 0) : (parseFloat(gold) || 0);

  // 3. Update rawGoldLogs
  if (oldTransaction.logId) {
    await prisma.rawGoldLogs.update({
      where: { id: oldTransaction.logId },
      data: {
        rawGoldStockId: stock.id,
        weight: pureWeight,
        amount: physAmount,
        touch: actualTouch,
        purity: pureWeight,
      }
    });
  }

  // 4. Update transaction
  const updatedTransaction = await prisma.transaction.update({
    where: { id: parseInt(id) },
    data: {
      date: new Date(date),
      type,
      amount: parseFloat(amount) || 0,
      goldRate: parseFloat(goldRate) || 0,
      gold: parseFloat(gold) || 0,
      purity: parseFloat(purity) || 0,
      touch: actualTouch,
      customer: { connect: { id: parseInt(customerId) } }
    }
  });

  // 5. Apply new balance
  const newValue = (type === "Cash" || type === "Cash RTGS") ? (parseFloat(purity) / actualTouch) * 100 : parseFloat(purity) || 0;
  await prisma.customerBillBalance.update({
    where: { id: parseInt(customerId) },
    data: { balance: { increment: -newValue || 0 } }
  });

  await setTotalRawGold();

  return updatedTransaction;
}

const deleteTransactionFromRawGold = async (id) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: parseInt(id) },
    include: { rawGoldLogs: true }
  });

  if (!transaction) throw new Error("Transaction not found");

  // 1. Reverse balance
  const actualTouch = parseFloat(transaction.touch) || 0;
  const value = (transaction.type === "Cash" || transaction.type === "Cash RTGS")
    ? (parseFloat(transaction.purity) / actualTouch) * 100
    : parseFloat(transaction.purity) || 0;

  await prisma.customerBillBalance.update({
    where: { id: parseInt(transaction.customerId) },
    data: { balance: { increment: value || 0 } }
  });

  // 2. Delete transaction and log
  await prisma.transaction.delete({ where: { id: parseInt(id) } });
  if (transaction.logId) {
    await prisma.rawGoldLogs.delete({ where: { id: transaction.logId } });
  }

  await setTotalRawGold();
}
const entryToRawGold = async (date, type, amount, gold, touch, purity, goldRate, logId = null) => {
  await createhundredPercentTouch();

  // For both Cash and Gold, use the provided touch (if Cash, it's the requested custom touch)
  const actualTouch = parseFloat(touch) || 0;
  const stock = await prisma.rawgoldStock.findFirst({
    where: { touch: actualTouch },
    select: { id: true },
  });

  if (!stock) {
    throw new Error(`No stock found for touch: ${actualTouch}`);
  }

  // Calculate pure weight based on type
  let pureWeight = parseFloat(purity) || 0;
  let physAmount = (type === "Cash" || type === "Cash RTGS") ? (actualTouch > 0 ? (pureWeight / actualTouch) * 100 : 0) : (parseFloat(gold) || 0);

  let rawGoldLog;

  if (logId) {
    // If we're updating
    rawGoldLog = await prisma.rawGoldLogs.update({
      where: { id: logId },
      data: {
        rawGoldStockId: stock.id,
        weight: pureWeight,
        amount: physAmount,
        touch: actualTouch,
        purity: pureWeight,
      }
    });
  } else {
    // Creating new
    rawGoldLog = await prisma.rawGoldLogs.create({
      data: {
        rawGoldStockId: stock.id,
        weight: pureWeight,
        amount: physAmount,
        touch: actualTouch,
        purity: pureWeight,
      },
    });
  }

  let entry;
  if (logId) {
    // Update existing entry
    entry = await prisma.entry.findFirst({ where: { logId } });
    if (entry) {
      entry = await prisma.entry.update({
        where: { id: entry.id },
        data: {
          date: new Date(date),
          type,
          cashAmount: parseFloat(amount) || 0,
          goldRate: parseFloat(goldRate) || 0,
          goldValue: parseFloat(gold) || 0,
          purity: parseFloat(purity) || 0,
          touch: actualTouch,
        },
      });
    }
  } else {
    // Create new entry
    entry = await prisma.entry.create({
      data: {
        date: new Date(date),
        type,
        cashAmount: parseFloat(amount) || 0,
        goldRate: parseFloat(goldRate) || 0,
        goldValue: parseFloat(gold) || 0,
        purity: parseFloat(purity) || 0,
        touch: actualTouch,
        rawGoldLogs: {
          connect: { id: rawGoldLog.id }
        }
      },
    });
  }

  await setTotalRawGold(); // we need to add rawGold 

  return entry;
}

const deleteEntryFromRawGold = async (id) => {
  const entry = await prisma.entry.findUnique({
    where: { id: parseInt(id) },
    include: { rawGoldLogs: true }
  });

  if (!entry) throw new Error("Entry not found");

  // Delete entry and log
  await prisma.entry.delete({ where: { id: parseInt(id) } });
  if (entry.logId) {
    await prisma.rawGoldLogs.delete({ where: { id: entry.logId } });
  }

  await setTotalRawGold();
}

const purchaseEntryToRawGold = async (advanceGold, advanceTouch, logId = null) => {
  const actualTouch = parseFloat(advanceTouch) || 0;
  const amount = parseFloat(advanceGold) || 0;

  if (amount <= 0 || actualTouch <= 0) return null;

  const stock = await prisma.rawgoldStock.findFirst({
    where: { touch: actualTouch },
    select: { id: true },
  });

  if (!stock) {
    throw new Error(`No stock found for touch: ${actualTouch}`);
  }

  let rawGoldLog;

  if (logId) {
    rawGoldLog = await prisma.rawGoldLogs.update({
      where: { id: parseInt(logId) },
      data: {
        rawGoldStockId: stock.id,
        weight: -((amount * actualTouch) / 100), // pure
        amount: -amount, // physical
        touch: actualTouch,
        purity: -((amount * actualTouch) / 100),
      }
    });
  } else {
    rawGoldLog = await prisma.rawGoldLogs.create({
      data: {
        rawGoldStockId: stock.id,
        weight: -((amount * actualTouch) / 100), // pure
        amount: -amount, // physical
        touch: actualTouch,
        purity: -((amount * actualTouch) / 100),
      },
    });
  }

  await setTotalRawGold();

  return rawGoldLog.id;
}

const deletePurchaseEntryFromRawGold = async (logId) => {
  if (!logId) return;

  const log = await prisma.rawGoldLogs.findUnique({
    where: { id: parseInt(logId) }
  });

  if (log) {
    await prisma.rawGoldLogs.delete({ where: { id: parseInt(logId) } });
    await setTotalRawGold();
  }
}

const receiveGoldToStock = async (physAmount, purity, touch, date = new Date(), tx = prisma) => {
  const actualTouch = parseFloat(touch) || 0;
  const amount = parseFloat(physAmount) || 0;
  const pwt = parseFloat(purity) || 0;

  if (pwt <= 0 || actualTouch <= 0) return null;

  const stock = await tx.rawgoldStock.findFirst({
    where: { touch: actualTouch },
    select: { id: true },
  });

  if (!stock) {
    throw new Error(`No stock found for touch: ${actualTouch}`);
  }

  const rawGoldLog = await tx.rawGoldLogs.create({
    data: {
      rawGoldStockId: stock.id,
      weight: pwt,
      amount: amount,
      touch: actualTouch,
      purity: pwt,
      date: new Date(date),
    },
  });

  await setTotalRawGold(tx);

  return rawGoldLog.id;
};

const itemPurchaseToRawGold = async (amount, actualTouch, logId = null) => {
  if (amount <= 0 || actualTouch <= 0) return null;

  const stock = await prisma.rawgoldStock.findFirst({
    where: { touch: actualTouch },
    select: { id: true },
  });

  if (!stock) {
    throw new Error(`No stock found for touch: ${actualTouch}`);
  }

  let rawGoldLog;

  if (logId) {
    rawGoldLog = await prisma.rawGoldLogs.update({
      where: { id: parseInt(logId) },
      data: {
        rawGoldStockId: stock.id,
        weight: -((amount * actualTouch) / 100), // pure
        amount: -amount, // physical
        touch: actualTouch,
        purity: -((amount * actualTouch) / 100),
      }
    });
  } else {
    rawGoldLog = await prisma.rawGoldLogs.create({
      data: {
        rawGoldStockId: stock.id,
        weight: -((amount * actualTouch) / 100), // pure
        amount: -amount, // physical
        touch: actualTouch,
        purity: -((amount * actualTouch) / 100),
      },
    });
  }

  await setTotalRawGold();

  return rawGoldLog.id;
}

const deleteItemPurchaseFromRawGold = async (logId) => {
  if (!logId) return;

  const log = await prisma.rawGoldLogs.findUnique({
    where: { id: parseInt(logId) }
  });

  if (log) {
    await prisma.rawGoldLogs.delete({ where: { id: parseInt(logId) } });
    await setTotalRawGold();
  }
}

module.exports = {
  moveToRawGoldStock,
  receiptMoveToRawGold,
  jobCardtoRawGoldStock,
  transactionToRawGold,
  updateTransactionInRawGold,
  deleteTransactionFromRawGold,
  entryToRawGold,
  deleteEntryFromRawGold,
  purchaseEntryToRawGold,
  deletePurchaseEntryFromRawGold,
  itemPurchaseToRawGold,
  deleteItemPurchaseFromRawGold,
  receiveGoldToStock,
  setTotalRawGold,
}
