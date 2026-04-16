const { PrismaClient } = require("@prisma/client");
const { setTotalRawGold } = require("../Utils/addRawGoldStock");

const prisma = new PrismaClient();

async function migrate() {
  console.log("Starting Raw Gold migration...");

  const logs = await prisma.rawGoldLogs.findMany();
  console.log(`Found ${logs.length} logs to check.`);

  let updatedCount = 0;

  for (const log of logs) {
    if (log.amount === 0 || log.amount === null) {
      const touch = parseFloat(log.touch) || 0;
      const weight = parseFloat(log.weight) || 0;

      if (touch > 0) {
        // Physical Amount = Pure Weight / (Touch / 100)
        const amount = (weight / touch) * 100;
        
        await prisma.rawGoldLogs.update({
          where: { id: log.id },
          data: { amount: amount }
        });
        updatedCount++;
      }
    }
  }

  console.log(`Updated ${updatedCount} logs with calculated physical amount.`);

  console.log("Syncing Raw Gold Stock totals...");
  await setTotalRawGold();

  console.log("Migration completed successfully.");
}

migrate()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
