const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const reduceGold = require("../Utils/reduceRawGold");
const addRawGold = require("../Utils/addRawGoldStock");
const {getGoldSmithBalance,updateGoldSmithBalance}=require('../Utils/updateGoldSmithBalance')
const {directWatageValue}=require('../Utils/directWastageValue')
const {directTouchJobReceive}=require('../Utils/directTouch')


const moveToItemDelivery = async (itemDelivery, jobcardId, goldSmithId) => {
  if (!Array.isArray(itemDelivery) || itemDelivery.length === 0) return;

  for (const item of itemDelivery) {

    const data = {
      itemName: item?.itemName || "",
      itemWeight: parseFloat(item?.itemWeight) || 0,
      count: parseInt(item?.count) || 0,
      touch: parseFloat(item?.touch) || 0,
      netWeight: parseFloat(item?.netWeight) || 0,
      wastageType: item?.wastageType || null,
      wastageValue: parseFloat(item?.wastageValue) || 0,
      wastagePure: parseFloat(item?.wastagePure) || 0,
      finalPurity: parseFloat(item?.finalPurity) || 0,
    };

    let updateItemDel;

    if (item?.id) {
      updateItemDel = await prisma.itemDelivery.update({
        where: { id: item.id },
        data,
      });

      const stoneWeightTotal =
        Array.isArray(item.deduction)
          ? item.deduction.reduce(
              (acc, d) => acc + (parseFloat(d.weight) || 0),
              0
            )
          : 0;

      const existingStock =
        Array.isArray(item.productStock) && item.productStock.length > 0
          ? item.productStock[0]
          : null;

      if (existingStock && existingStock.id) {
        await prisma.productStock.update({
          where: { id: existingStock.id },
          data: {
            ...data,
            stoneWeight: stoneWeightTotal,
            isActive: false,
          },
        });
      } else {
        await prisma.productStock.create({
          data: {
            ...data,
            stoneWeight: stoneWeightTotal,
            itemDelivery: { connect: { id: updateItemDel.id } },
            jobcard: { connect: { id: parseInt(jobcardId) } },
          },
        });
      }

      if (Array.isArray(item.deduction) && item.deduction.length > 0) {
        for (const ded of item.deduction) {
          const dedData = {
            deliveryId: updateItemDel.id,
            type: ded?.type || null,
            weight: parseFloat(ded?.weight) || 0,
          };

          if (ded?.id) {
            await prisma.deduction.update({
              where: { id: ded.id },
              data: dedData,
            });
          } else {
            await prisma.deduction.create({
              data: dedData,
            });
          }
        }
      }

    } 
    else {
      let deductionArr = [];

      if (Array.isArray(item.deduction) && item.deduction.length > 0) {
        deductionArr = item.deduction.map((d) => ({
          weight: parseFloat(d.weight) || 0,
          type: d.type || null,
        }));
      }

      const stoneWeightTotal = deductionArr.reduce(
        (acc, d) => acc + d.weight,
        0
      );

      await prisma.itemDelivery.create({
        data: {
          ...data,
          goldsmith: { connect: { id: parseInt(goldSmithId) } },
          jobcard: { connect: { id: parseInt(jobcardId) } },

          deduction: deductionArr.length
            ? { create: deductionArr }
            : undefined,

          productStock: {
            create: {
              ...data,
              stoneWeight: stoneWeightTotal,
              jobcard: { connect: { id: parseInt(jobcardId) } },
            },
          },
        },
      });
    }
  }
};

// helper function to update nextJobCardBalance
const updateNextJobBalance = async (id, goldsmithId) => {
  let goldSmithJob = await prisma.total.findMany({
    where: {
      id: { gte: id },

      goldsmithId: parseInt(goldsmithId),
    },
  });

  while (goldSmithJob.length != 1) {
    const prevJob = goldSmithJob[0];
    const currentJob = goldSmithJob[1];

    await prisma.total.update({
      where: {
        id: currentJob.id,
        goldsmithId: parseFloat(goldsmithId),
      },
      data: {
        openingBalance: prevJob.jobCardBalance,
        jobCardBalance:
          currentJob.givenTotal +
          prevJob.jobCardBalance -
          currentJob.deliveryTotal,
      },
    });

    goldSmithJob = await prisma.total.findMany({
      where: {
        id: { gt: prevJob.id },
        goldsmithId: parseFloat(goldsmithId),
      },
    });
  }
};

// main controllers
const createJobcard = async (req, res) => {
  try {
    const { goldSmithId, description, givenGold, total } = req.body;
    console.log("createController", req.body);
    const goldsmithInfo = await prisma.goldsmith.findUnique({
      where: { id: parseInt(goldSmithId) },
    });

    if (!goldsmithInfo) {
      return res.status(404).json({ error: "Goldsmith not found" });
    }
    if (givenGold.length < 1) {
      return res.status(400).json({ error: "Given gold data is required" });
    }
      

    const jobCardTotal = {
      goldsmithId: parseInt(goldSmithId),
      givenTotal: parseFloat(total?.givenTotal) || 0,
      deliveryTotal: 0,
      stoneTotalWt: 0,
      jobCardBalance: parseFloat(total?.jobCardBalance) || 0,
      openingBalance: parseFloat(total?.openingBalance) || 0,
      balanceOption:false,
      goldSmithBalance:await getGoldSmithBalance(goldSmithId),
      receivedTotal: 0,
      isFinished: "false",
    };
    //  await reduceRawGold.checkAvailability(givenGoldArr)
    const newJobcard = await prisma.jobcard.create({
      data: {
        goldsmithId: parseInt(goldSmithId),
        description,
        total: {
          create: jobCardTotal,
        },
      },
    });
    await reduceGold.reduceRawGold(givenGold, newJobcard.id, goldSmithId); // we need to reduce rawGold stock
     
    await updateGoldSmithBalance(goldSmithId) // side by side goldSmith Balance also we need to change
    const allJobCards = await prisma.jobcard.findMany({
      where: {
        goldsmithId: parseInt(goldSmithId),
      },
      include: {
        givenGold: true,
        deliveries: {
          include: {
            deduction: true,
            productStock:true,
          },
        },
        received: true,
        total: true,
      },
    });
    res
      .status(200)
      .json({
        sucees: "true",
        message: "JobCard Created",
        allJobCards,
        jobCardLength: allJobCards.length + 1,
      });
  } catch (error) {
    console.error("Error creating jobcard:", error);
    res.status(500).json({
      message: "Server error during jobcard creation",
      error: error.message,
    });
  }
};

// main controllers
const updateJobCard = async (req, res) => {
  const { goldSmithId, jobCardId } = req.params;
  const { description, givenGold, itemDelivery, receiveSection, total } = req.body;

  console.log("update controller payload:", req.body);

  try {
    const goldsmithInfo = await prisma.goldsmith.findUnique({
      where: { id: parseInt(goldSmithId) },
    });

    if (!goldsmithInfo) {
      return res.status(404).json({ error: "Goldsmith not found" });
    }

    if (!total) {
      return res.status(400).json({ error: "Total information is required" });
    }

    for (const item of itemDelivery) {
      if (item.deduction) {
        for (const ded of item.deduction) {
          if (
            !ded.type ||
            ded.weight === "" ||
            Number(ded.weight) < 0 ||
            !/^\d*\.?\d*$/.test(ded.weight)
          ) {
            return res.status(400).json({
              error: "Give Correct Information in stone section",
            });
          }
        }
      }
    }

    const totalOfJobcard = await prisma.total.update({
      where: { id: total.id },
      data: {
        givenTotal: parseFloat(total.givenTotal) || 0,
        deliveryTotal: parseFloat(total.deliveryTotal) || 0,
        stoneTotalWt: parseFloat(total.stoneTotalWt) || 0,
        jobCardBalance: parseFloat(total.jobCardBalance) || 0,
        openingBalance: parseFloat(total.openingBalance) || 0,
        receivedTotal: parseFloat(total.receivedTotal) || 0,
      },
    });

    await prisma.jobcard.update({
      where: { id: parseInt(jobCardId) },
      data: { description },
    });

    await reduceGold.reduceRawGold(givenGold, jobCardId, goldSmithId);

    await directWatageValue(itemDelivery);

    await moveToItemDelivery(itemDelivery, jobCardId, goldSmithId);

    await directTouchJobReceive(receiveSection);
    await addRawGold.jobCardtoRawGoldStock(receiveSection, goldSmithId, jobCardId);

    await updateNextJobBalance(totalOfJobcard.id, goldSmithId);

    if (totalOfJobcard.jobCardBalance <= 0) {
      const lastJobCard = await prisma.total.findFirst({
        where: {
          id: total.id,
          goldsmithId: parseInt(goldSmithId),
          isFinished: "false",
        },
      });

      if (lastJobCard) {
        await prisma.total.updateMany({
          where: {
            id: { lte: lastJobCard.id },
            goldsmithId: parseInt(goldSmithId),
          },
          data: { isFinished: "true" },
        });
      }
    }

    await updateGoldSmithBalance(goldSmithId);

    const goldSmithInfo = await prisma.goldsmith.findUnique({
      where: { id: parseInt(goldSmithId) },
    });

    const allJobCards = await prisma.jobcard.findMany({
      where: { goldsmithId: parseInt(goldSmithId) },
      include: {
        givenGold: true,
        deliveries: {
          include: {
            deduction: true,
            productStock: true,
          },
        },
        received: true,
        total: true,
      },
    });

    res.status(200).json({
      goldSmithInfo,
      success: true,
      message: "JobCard Updated",
      allJobCards,
      jobCardLength: allJobCards.length,
    });

  } catch (error) {
    console.error("Error updating jobcard:", error);
    res.status(500).json({
      message: "Server error during jobcard update",
      error: error.message,
    });
  }
};

const getAllJobCardsByGoldsmithId = async (req, res) => {
  try {
    const { id } = req.params;
    const goldsmithInfo = await prisma.goldsmith.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!goldsmithInfo) {
      return res.status(404).json({ error: "Goldsmith not found" });
    }

    const allJobCards = await prisma.jobcard.findMany({
      where: {
        goldsmithId: parseInt(id),
      },
      include: {
        givenGold: true,
        deliveries: {
          include: {
            deduction: true,
          },
        },
        received: true,
        total: true,
      },
    });
    let jobCardLength = await prisma.jobcard.findMany();
    console.log("len", jobCardLength.length + 1);
    return res.status(200).json({
      goldsmith: {
        id: goldsmithInfo.id,
        name: goldsmithInfo.name,
        address: goldsmithInfo.address,
        phoneNo: goldsmithInfo.phone,
      },
      jobCards: allJobCards,
      jobCardLength: jobCardLength.length + 1,
    });
  } catch (err) {
    console.error("Error fetching job card info:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};

// main controllers
// getJobCardBy Id

const getJobCardById = async (req, res) => {
  const { id } = req.params;
  try {
    const goldSmithInfo = await prisma.jobcard.findUnique({
      where: { id: parseInt(id) },
    });

    if (!goldSmithInfo) {
      return res.status(404).json({ error: "Job Card not found" });
    }

    const jobCardInfo = await prisma.jobcard.findMany({
      where: {
        id: parseInt(id),
      },
      include: {
        goldsmith: true,
        givenGold: true,
        deliveries: {
          include: {
            deduction: true,
            productStock:true,
          },
        },
        received: true,
        total: true,
      },
    });

    let lastJobCard = (
      await prisma.total.findMany({
        where: { goldsmithId: goldSmithInfo.goldsmithId },
      })
    ).at(-1);

    return res
      .status(200)
      .json({ jobcard: jobCardInfo, lastJobCard: lastJobCard });
  } catch (err) {
    return res.status(500).json({ err: "Server Error" });
  }
};

// main controllers
const getPreviousJobCardBal = async (req, res) => {
  const { id } = req.params;

  try {
    const jobCards = await prisma.total.findMany({
      where: {
        goldsmithId: parseInt(id),
      },
    });

    if (jobCards.length >= 1) {
      const jobCard = jobCards.at(-1);

      res
        .status(200)
        .json({ status: "balance", balance:jobCard.balanceOption? jobCard.goldSmithBalance : jobCard.jobCardBalance });
    } else {
     
      res.status(200).json({ status: "nobalance", balance:await getGoldSmithBalance(id)});
    }
  } catch (err) {
    console.error("Previous Balance Error:", err);
    return res.status(500).json({ error: err.message });
  }
};


// main controllers
const formatDate = (dateString) => {
  const [day, month, year] = dateString.split("/");
  return `${year}-${month}-${day}`;
};

const jobCardFilter = async (req, res) => {
  const { fromDate, toDate } = req.query;
  const { id } = req.params;
  console.log("reqquery", req.query);

  try {
    let whereCondition = {};

    // If id exists and not "null", add goldsmith filter
    if (id && id !== "null") {
      whereCondition.goldsmithId = parseInt(id);
    }

    // If fromDate and toDate exist and not "null", add date filter
    if (fromDate && toDate && fromDate !== "null" && toDate !== "null") {
      const parsedFromDate = new Date(formatDate(fromDate));
      const parsedToDate = new Date(formatDate(toDate));

      // Adjust toDate to include the entire day
      parsedToDate.setHours(23, 59, 59, 999);

      if (isNaN(parsedFromDate.getTime()) || isNaN(parsedToDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      whereCondition.createdAt = {
        gte: parsedFromDate,
        lte: parsedToDate,
      };
    }

    // If both id = null and dates = null → whereCondition = {} (fetch all)
    const filterJobCards = await prisma.jobcard.findMany({
      where: whereCondition,
      include: {
        goldsmith: true,
        givenGold: true,
        deliveries: true,
        received: true,
        total: true,
      },
    });

    res.json(filterJobCards);
  } catch (error) {
    console.error("Error filtering job cards:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
};


module.exports = {
  createJobcard,
  updateJobCard,
  getAllJobCardsByGoldsmithId,
  getJobCardById,
  getPreviousJobCardBal,
  jobCardFilter,
  
};
