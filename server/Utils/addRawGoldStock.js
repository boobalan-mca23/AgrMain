const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const setTotalRawGold = async () => {
  //  Group logs by rawGoldStockId and sum weights
  const grouped = await prisma.rawGoldLogs.groupBy({
    by: ["rawGoldStockId"],
    _sum: {
      weight: true,
    },
  });

  //  Loop through each group and update the corresponding stock
  for (const g of grouped) {
    await prisma.rawgoldStock.update({
      where: { id: g.rawGoldStockId },
      data: {
        weight: g._sum.weight || 0, // assumes your stock table has totalWeight column
        remainingWt:g._sum.weight||0
      },
    });
  }
};



const createhundredPercentTouch=async()=>{
// In received section we have goldRate so that time we need to create new touch as 100
  const ifExist=await prisma.masterTouch.findFirst({
      where:{
        touch:100
      }
    })
    
      if(!ifExist){
         await prisma.masterTouch.create({
      data: { touch: 100,
        rawGoldStock:{
          create:{
            weight:0,
            remainingWt:0,
            touch:100
          }
        }
        
      },
      
    });
      }
}


const moveToRawGoldStock = async (received, billId, customerId) => {
  await createhundredPercentTouch();

  if (received.length >= 1) {
    await prisma.$transaction(async (tx) => {
      for (const receive of received) {
        let data = {
          date:receive.date,
          type: receive.type,
          goldRate: parseInt(receive.goldRate) || 0,
          gold:parseInt(receive.gold) || 0,
          touch:parseFloat(receive.touch)||0,
          purity: parseFloat(receive.purity) || 0,
          receiveHallMark: parseFloat(receive.hallMark) || 0,
          amount: parseFloat(receive.amount) || 0,
        };

        if (receive.id) {
          // Update existing
          await tx.rawGoldLogs.update({
            where: { id: receive.logId },
            data: {
              weight: data.type === "Cash" ? data.purity :data.gold,
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
            where: { touch: data.type === "Cash" ? 100 : parseFloat(data.touch) || 0,  },
            select: { id: true },
          });

          if (!stock) {
            throw new Error(`No stock found for touch: ${data.touch}`);
          }

          // Create raw gold log
          const rawGoldLog = await tx.rawGoldLogs.create({
            data: {
              rawGoldStockId: stock.id,
              weight: data.type === "Cash"?parseFloat(data.purity): parseFloat(data.gold) || 0,
              touch: data.type === "Cash" ? 100 : parseFloat(data.touch) || 0, 
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
    });
  }

  await setTotalRawGold();
};

const receiptMoveToRawGold = async (received,customerId) => {
  await createhundredPercentTouch();

  if (received.length >= 1) {
    await prisma.$transaction(async (tx) => {
      for (const receive of received) {
        let data = {
          date:receive.date,
          type: receive.type,
          goldRate: parseInt(receive.goldRate) || 0,
          gold:parseInt(receive.gold) || 0,
          touch:parseFloat(receive.touch)||0,
          purity: parseFloat(receive.purity) || 0,
          receiveHallMark: parseFloat(receive.hallMark) || 0,
          amount: parseFloat(receive.amount) || 0,
        };

        if (receive.id) {
          // Update existing
          await tx.rawGoldLogs.update({
            where: { id: receive.logId },
            data: {
              weight:data.type==="Cash" ? data.purity:data.gold,
              touch:data.touch,
              purity:data.purity,
            },
          });

          await tx.receiptVoucher.update({
            where: { id: parseInt(receive.id) },
            data,
          });
        } else {
          // Find stock by touch
          const stock = await tx.rawgoldStock.findFirst({
            where: { touch: data.type === "Cash" ? 100 : parseFloat(data.touch) || 0,  },
            select: { id: true },
          });

          if (!stock) {
            throw new Error(`No stock found for touch: ${data.touch}`);
          }

          // Create raw gold log
          const rawGoldLog = await tx.rawGoldLogs.create({
            data: {
              rawGoldStockId: stock.id,
              weight:data.type ==="Cash" ?parseFloat(data.purity) :parseFloat(data.gold),
              touch:data.type ==="Cash" ? 100 : parseFloat(data.touch) || 0, 
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
            weight: data.weight,
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
            weight: data.weight,
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
const transactionToRawGold=async( date, type,amount,gold, touch, purity, customerId, goldRate )=>{
      
    await createhundredPercentTouch();

       const stock = await prisma.rawgoldStock.findFirst({
             where: { touch: type === "Cash" ? 100 : parseFloat(touch) || 0,  },
             select: { id: true },
          });
         if (!stock) {
            throw new Error(`No stock found for touch: ${touch}`);
          }
         const rawGoldLog = await prisma.rawGoldLogs.create({
            data: {
              rawGoldStockId: stock.id,
              weight:type==="Cash" ? parseFloat(purity) :parseFloat(gold)|| 0,
              touch: type === "Cash" ? 100 : parseFloat(touch) || 0, 
              purity:purity||0,
            },
          });

  const transaction= await prisma.transaction.create({
      data: {
        date: new Date(date),
        type,
        amount: parseFloat(amount)||0,
        goldRate: parseFloat(goldRate)|| 0,
        gold: parseFloat(gold)||0,
        purity: parseFloat(purity)||0,
        touch: type === "Gold" ? parseFloat(touch) : 0,
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


    await prisma.customerBillBalance.update({ // update customer excess balance
      where:{
        id:parseInt(customerId)},
      data:{
        balance:{
          increment:-purity||0
        }
      }
    })

    await setTotalRawGold(); // we need to add rawGold 

    return  transaction;

}
module.exports={
  moveToRawGoldStock,
  receiptMoveToRawGold,
  jobCardtoRawGoldStock,
  transactionToRawGold
}




