const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const reduceRawGold = async (rawGoldStock) => {
  await prisma.$transaction(async (tx) => {
    for (const gold of rawGoldStock) {
      await tx.rawgoldStock.update({
        where: { id: gold.id },
        data: {
          weight: gold.remainingWt,
          remainingWt: gold.remainingWt,
        },
      });
    }
  });
};

module.exports = {
  reduceRawGold,
};
