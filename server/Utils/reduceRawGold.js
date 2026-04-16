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

const reduceRawGold  = async (givenGold,jobCardId,goldSmithId) => {
  // stock update
   
  if (givenGold.length >= 1) {
    for (const gold of givenGold) {
      let data = {
        goldsmithId: parseInt(goldSmithId),
        jobcardId: parseInt(jobCardId),
        weight: parseFloat(gold.weight) || 0,
        touch: parseFloat(gold.touch) || null,
        purity: parseFloat(gold.purity) || 0,
      };
      
      if (gold.id) {
        await prisma.rawGoldLogs.update({ // this change in raw gold stock
          where: {
            id: gold.logId,
          },
          data: {
            weight: -data.purity,
            amount: -data.weight,
            touch: data.touch,
            purity: -data.purity,
          },
        });
        await prisma.givenGold.update({
          where: { id: parseInt(gold.id) },
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
            weight: -data.purity,
            amount: -data.weight,
            touch: data.touch,
            purity: -data.purity,
          },
        });
        data = {
          ...data,
          logId: rawGoldLog.id,
        };
        await prisma.givenGold.create({ data });
      }
    }
  }
  await setTotalRawGold();
};
const expenseGoldReduce=async( expenseDate,gold,touch,purity,description)=>{
     let data={
       expenseDate,
       description,
       gold,
       touch,
       purity,
       
     }
   const stock = await prisma.rawgoldStock.findFirst({
          where: {
            touch: touch||0, // match the touch value
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
            weight: -(data.purity || 0),
            amount: -(data.gold || 0),
            touch: data.touch || 0,
            purity: -(data.purity || 0),
          },
        });
        data = {
          ...data,
          logId: rawGoldLog.id,
        };
        await prisma.expenseTracker.create({ data });

       await setTotalRawGold();
}


module.exports = {
  reduceRawGold,
  expenseGoldReduce
};
