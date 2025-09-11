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
        weight: g._sum.weight || 0,
        remainingWt:g._sum.weight||0   // assumes your stock table has totalWeight column
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
            weight: -data.weight,
            touch: data.touch,
            purity: data.purity,
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
            weight: -data.weight,
            touch: data.touch,
            purity: data.purity,
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



module.exports = {
  reduceRawGold,
   
};
