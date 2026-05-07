const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const {changeJobCardBalance}=require('../Utils/updateGoldSmithBalance')
exports.createGoldsmith = async (req, res) => {

  let { name, phonenumber, address ,balance} = req.body;

  if (!name) {
    return res.status(400).json({ message: "Goldsmith name is required." });
  }

  // normalize values
  phonenumber = phonenumber && phonenumber.trim() !== "" ? phonenumber.trim() : null;
  address = address && address.trim() !== "" ? address.trim() : null;

  // check only if phone is not null
  if (phonenumber) {
    const ifExist = await prisma.goldsmith.findFirst({
      where: { phone: phonenumber }
    });

    if (ifExist) {
      return res.status(400).json({ message: "Phone number already exists" });
    }
  }

  try {
    const newGoldsmith = await prisma.goldsmith.create({
      data: {
        name: name.trim(),
        phone: phonenumber,
        address,
        balance: parseFloat(balance) || 0,
        initialBalance: parseFloat(balance) || 0
      },
    });
    res.status(201).json(newGoldsmith);
  } catch (error) {
    res.status(500).json({ message: "Error creating goldsmith", error });
  }
};


exports.getAllGoldsmith = async (req, res) => {
  try {
    const goldsmith = await prisma.goldsmith.findMany({
      orderBy:{
        id:"asc"
      }
    });

    res.status(200).json(goldsmith);
  } catch (error) {
    res.status(500).json({ message: "Error fetching goldsmith", error });
  }
};

exports.getGoldsmithById = async (req, res) => {
  const { id } = req.params;
  try {
    const goldsmith = await prisma.goldsmith.findUnique({
      where: { id: parseInt(id) },
    });
    if (!goldsmith)
      return res.status(404).json({ message: "goldsmith not found" });
    res.status(200).json(goldsmith);
  } catch (error) {
    res.status(500).json({ message: "Error fetching goldsmith", error });
  }
};

exports.updateGoldsmith = async (req, res) => {
  const { id } = req.params;
  let { name, phone, address ,balance,balanceisEdited} = req.body;

  phone = phone && phone.trim() !== "" ? phone.trim() : null;
  address = address && address.trim() !== "" ? address.trim() : null;

  // check duplicate phone if not null
  if (phone) {
    const ifExist = await prisma.goldsmith.findFirst({
      where: {
        phone,
        NOT: { id: parseInt(id) }, // exclude self
      },
    });

    if (ifExist) {
      return res.status(400).json({ message: "Phone number already exists" });
    }
  }

  try {
    const oldGoldsmith = await prisma.goldsmith.findUnique({
      where: { id: parseInt(id) }
    });

    const oldBalance = oldGoldsmith?.balance || 0;
    const newBalance = parseFloat(balance) || 0;

    if (newBalance !== oldBalance) {
      await prisma.balanceAdjustment.create({
        data: {
          entityType: "GOLDSMITH",
          entityId: parseInt(id),
          goldAmount: newBalance - oldBalance,
          description: "Manual Gold adjustment from Master"
        }
      });
    }

    const updatedGoldsmith = await prisma.goldsmith.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        phone,
        address,
        balance: newBalance
      },
    });

    if(balanceisEdited) { // change jobcard balance
        changeJobCardBalance(id,balance)
    }
    res.status(200).json(updatedGoldsmith);
  } catch (error) {
    res.status(500).json({ message: "Error updating goldsmith", error });
  }
};


exports.deleteGoldsmith = async (req, res) => {
  const { id } = req.params;
  const goldsmithId = parseInt(id);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete Balances
      await tx.balances.deleteMany({ where: { goldsmithId } });

      // 2. Delete BalanceAdjustments
      await tx.balanceAdjustment.deleteMany({
        where: { entityType: "GOLDSMITH", entityId: goldsmithId },
      });

      // 3. Delete RepairStock and associated logs if any (assuming cascade or no dependent logs with weight)
      // RepairStock logs (if exists in schema, we should check)
      await tx.repairStock.deleteMany({ where: { goldsmithId } });
      await tx.repair.deleteMany({ where: { goldsmithId } });

      // 4. Delete Jobcard-related records
      const jobcards = await tx.jobcard.findMany({
        where: { goldsmithId },
        select: { id: true },
      });
      const jobcardIds = jobcards.map((j) => j.id);

      if (jobcardIds.length > 0) {
        // Delete deductions (linked to itemDelivery)
        const deliveries = await tx.itemDelivery.findMany({
          where: { jobcardId: { in: jobcardIds } },
          select: { id: true },
        });
        const deliveryIds = deliveries.map((d) => d.id);

        if (deliveryIds.length > 0) {
          await tx.deduction.deleteMany({
            where: { deliveryId: { in: deliveryIds } },
          });
        }

        // Delete Jobcard children
        await tx.itemDelivery.deleteMany({ where: { jobcardId: { in: jobcardIds } } });
        await tx.receivedsection.deleteMany({ where: { jobcardId: { in: jobcardIds } } });
        await tx.givenGold.deleteMany({ where: { jobcardId: { in: jobcardIds } } });
        await tx.total.deleteMany({ where: { jobcardId: { in: jobcardIds } } });
        
        // Delete Jobcards
        await tx.jobcard.deleteMany({ where: { goldsmithId } });
      }

      // 5. Delete direct relationships that might not be under jobcards
      await tx.receivedsection.deleteMany({ where: { goldsmithId } });
      await tx.givenGold.deleteMany({ where: { goldsmithId } });
      await tx.itemDelivery.deleteMany({ where: { goldsmithId } });

      // 6. Finally delete the Goldsmith
      await tx.goldsmith.delete({
        where: { id: goldsmithId },
      });
    });

    res.status(200).json({ message: "Goldsmith and all related records deleted successfully" });
  } catch (error) {
    console.error("Hard delete failed:", error);
    res.status(500).json({ message: "Error performing hard delete", error: error.message });
  }
};
