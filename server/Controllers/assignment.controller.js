const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const reduceGold=require('../Utils/reduceRawGold')
const addRawGold=require('../Utils/addRawGoldStock')
const itemToStock = async () => {
  const items = await prisma.itemDelivery.findMany({
    include: {
      deduction: true, // bring all deductions for each delivery
    },
  });

  // group by itemName + touch
  const grouped = items.reduce((acc, item) => {
    const key = `${item.itemName}-${item.touch}`;
     
    if (!acc[key]) {
      acc[key] = {

        jobcardId: item.jobcardId,
        itemName: item.itemName,
        touch: item.touch,
        totalItemWeight: 0,
        totalWastagePure:0,
        totalFinalPurity: 0,
        totalWastageValue: 0,
        totalStoneWeight: 0,
        count: 0,
      };
    }

    acc[key].totalItemWeight += item.itemWeight || 0;
    acc[key].totalFinalPurity += item.finalPurity || 0; 
    acc[key].totalWastageValue += item.wastageValue || 0;
    acc[key].totalWastagePure += item.wastagePure || 0;
    acc[key].count +=item.count ||0;
    acc[key].totalStoneWeight += item.deduction.reduce(
      
      (sum, d) => sum + (d.weight  || 0),
      0
    );
    

    return acc;
  }, {});

  let stockInformation = Object.values(grouped);
   console.log('stockInformation',stockInformation)
   await prisma.productStock.deleteMany({}) //

  for (const stockItem of stockInformation) {
    let exist = await prisma.productStock.findFirst({
      where: {
        itemName: stockItem.itemName,
        touch: stockItem.touch,
      },
      select: { id: true },
    });

    if (exist) {
      await prisma.productStock.update({
        where: { id: exist.id },
        data: {
          itemName: stockItem.itemName,
          itemWeight: stockItem.totalItemWeight,
          count:stockItem.count,
          touch: stockItem.touch,
          stoneWeight: stockItem.totalStoneWeight,
          wastagePure:stockItem.totalWastagePure,
          wastageValue: stockItem.totalWastageValue,
          finalWeight: stockItem.totalFinalPurity ,
        },
      });
    } else {
      await prisma.productStock.create({
        data: {
          jobcardId: stockItem.jobcardId,
          itemName: stockItem.itemName,
          itemWeight: stockItem.totalItemWeight,
          count:stockItem.count,
          touch: stockItem.touch,
          stoneWeight: stockItem.totalStoneWeight,
          wastageValue: stockItem.totalWastageValue,
          wastagePure:stockItem.totalWastagePure,
          finalWeight: stockItem.totalFinalPurity,
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
      receivedTotal: 0,
      isFinished: "false",
    };
    //  await reduceRawGold.checkAvailability(givenGoldArr)
    const newJobcard=await prisma.jobcard.create({
      data: {
        goldsmithId: parseInt(goldSmithId),
        description,
        total: {
          create: jobCardTotal,
        },
      },
    });
    await reduceGold.reduceRawGold(givenGold,newJobcard.id,goldSmithId) // we need to reduce rawGold stock
    const allJobCards = await prisma.jobcard.findMany({
      where: {
        goldsmithId: parseInt(goldSmithId),
      },
      include: {
        givenGold: true,
        deliveries:{
          include:{
            deduction:true
          }
        },
        received:true,
        total: true,
      },
    });
    res
      .status(200)
      .json({ sucees: "true", message: "JobCard Created", allJobCards });
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
  const { description, givenGold, itemDelivery, receiveSection, total,rawGoldStock } =req.body;
  console.log("update controller", req.body);
  try {
    const goldsmithInfo = await prisma.goldsmith.findUnique({
      where: { id: parseInt(goldSmithId) },
    });

    if (!goldsmithInfo) {
      return res.status(404).json({ error: "Goldsmith not found" });
    }

    if (givenGold.length < 1) {
      return res
        .status(400)
        .json({ error: "GoldSmith information is required" });
    }
    if (!total) {
      return res.status(400).json({ error: "Total information is required" });
    }
    if (itemDelivery.length >= 1) {
      // validation on jobcard stone section
      for (const item of itemDelivery) {
        if (item.deduction) {
          item.deduction.forEach((ded, _) => {
            if (
              !ded.type ||
              !ded.weight ||
              ded.weight < 0 ||
              !/^\d*\.?\d*$/.test(ded.weight)
            ) {
              return res
                .status(400)
                .json({ error: `Give Correct Information in stone section` });
            }
          });
        }
      }
    }

    // update jobCardTotals
    const totalOfJobcard = await prisma.total.update({
      where: {
        id: total?.id,
      },
      data: {
        givenTotal: parseFloat(total?.givenTotal) || 0,
        deliveryTotal: parseFloat(total?.deliveryTotal) || 0,
        stoneTotalWt: parseFloat(total?.stoneTotalWt) || 0,
        jobCardBalance: parseFloat(total?.jobCardBalance) || 0,
        openingBalance: parseFloat(total?.openingBalance) || 0,
        receivedTotal: parseFloat(total?.receivedTotal) || 0,
      },
    });
    // update jobCard Description
    await prisma.jobcard.update({
      where: {
        id: parseInt(jobCardId),
      },
      data: {
        description: description,
      },
    });

    // update given gold information

    await reduceGold.reduceRawGold(givenGold,jobCardId,goldSmithId)
    
    // update itemDelivery information
    if (itemDelivery.length >= 1) {
      for (const item of itemDelivery) {
        if (item?.id) {
          //itemDelivery update if id is there or create

          const updateItemDel = await prisma.itemDelivery.update({
            where: {
              id: item.id,
            },
            data: {
              itemName: item?.itemName,
              itemWeight: parseFloat(item?.itemWeight) || 0,
              count:parseInt(item?.count)||0,
              touch: parseFloat(item?.touch) || 0,
              sealName: item?.sealName,
              netWeight: parseFloat(item?.netWeight) || 0,
              // wastageType: item?.wastageType,
              wastageValue: parseFloat(item?.wastageValue) || 0,
              wastagePure: parseFloat(item?.wastagePure) || 0,
              finalPurity: parseFloat(item.finalPurity) || 0,
            },
          });

          // if dedcution id is there update or create
          if (item.deduction.length >= 1) {
            for (const ded of item.deduction) {
              const data = {
                deliveryId: updateItemDel.id,
                type: ded.type || null,
                weight: parseFloat(ded.weight) || 0,
                stoneWt: parseFloat(ded.stoneWt) || 0,
              };
              if (ded.id) {
                await prisma.deduction.update({
                  where: {
                    id: ded.id,
                  },
                  data,
                });
              } else {
                await prisma.deduction.create({ data });
              }
            }
          }
        } else {
          // itemDelivery create
          let deductionArr = [];

          if (item.deduction && item.deduction.length >= 1) {
            deductionArr = item.deduction.map((dely) => ({
              weight: parseFloat(dely.weight) || 0,
              type: dely.type || null,
            }));
          }

          await prisma.itemDelivery.create({
            data: {
              goldsmithId: parseInt(goldSmithId),
              jobcardId: parseInt(jobCardId),
              itemName: item?.itemName,
              count:parseInt(item?.count)||0,
              itemWeight: parseFloat(item?.itemWeight) || 0,
              touch: parseFloat(item?.touch) || 0,
              sealName: item?.sealName,
              netWeight: parseFloat(item?.netWeight) || 0,
              // wastageType: item?.wastageType,
              wastageValue: parseFloat(item?.wastageValue) || 0,
              wastagePure: parseFloat(item?.wastagePure) || 0,
              finalPurity: parseFloat(item.finalPurity) || 0,
              ...(deductionArr.length > 0 && {
                deduction: {
                  create: deductionArr,
                },
              }),
            },
          });
        }
      }
      await itemToStock(); // product stock
    }
    // receive section update and create
    await addRawGold.jobCardtoRawGoldStock(receiveSection, goldSmithId, jobCardId);

    await updateNextJobBalance(totalOfJobcard.id, goldSmithId); // update nextJobCardNBalance

    if (
      totalOfJobcard.jobCardBalance === 0 ||
      totalOfJobcard.jobCardBalance < 0
    ) {
      const lastJobCard = await prisma.total.findFirst({
        where: {
          id: total?.id,
          goldsmithId: parseInt(goldSmithId),
          isFinished: "false",
        },
      });
      if (lastJobCard !== null) {
        await prisma.total.updateMany({
          where: {
            id: { lte: lastJobCard.id },
            goldsmithId: parseInt(goldSmithId),
          },
          data: { isFinished: "true" },
        });
      }
    }
     
    const allJobCards = await prisma.jobcard.findMany({
      where: {
        goldsmithId: parseInt(goldSmithId),
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

    res
      .status(200)
      .json({ sucees: "true", message: "jobCard Updated", allJobCards });
  } catch (error) {
    console.error("Error creating jobcard:", error);
    res.status(500).json({
      message: "Server error during jobcard creation",
      error: error.message,
    });
  }
};

// main controllers
// getAllJobCard By GoldSmithId

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
        .json({ status: "balance", balance: jobCard.jobCardBalance });
    } else {
      res.status(200).json({ status: "nobalance", balance: 0 });
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
        received:true,
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
