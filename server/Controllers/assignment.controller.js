const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// helper function to update nextJobCardBalance

const updateNextJobBalance=async(id,goldsmithId)=>{
   let goldSmithJob=await prisma.total.findMany({
      where:{
        id:{gte:id},
        goldsmithId:parseInt(goldsmithId)
      }
    })
  
    while(goldSmithJob.length!=1){
         const prevJob=goldSmithJob[0]
        const currentJob=goldSmithJob[1]
   
       await prisma.total.update({
              where:{
                id:currentJob.id,
                goldsmithId:parseFloat(goldsmithId)
              },
           data:{ 
             openingBalance:prevJob.jobCardBalance,
             jobCardBalance:(currentJob.givenTotal+prevJob.jobCardBalance)-currentJob.deliveryTotal
            }
        })
    
       goldSmithJob=await prisma.total.findMany({
         where:{
          id:{gt:prevJob.id},
          goldsmithId:parseFloat(goldsmithId)
      }
    })
      
    }
} 


const createJobcard = async (req, res) => {
  try {
    const { goldSmithId, description, givenGold, total } = req.body;
     console.log('createController',req.body)
    const goldsmithInfo = await prisma.goldsmith.findUnique({
      where: { id: parseInt(goldSmithId) },
    });

    if (!goldsmithInfo) {
      return res.status(404).json({ error: "Goldsmith not found" });
    }
    if (givenGold.length < 1) {
      return res.status(400).json({ error: "Given gold data is required" });
    }
    const givenGoldArr = givenGold.map((item) => ({
      goldsmithId: parseInt(goldSmithId),
      weight: parseFloat(item.weight) || null,
      touch: parseFloat(item.touch) || null,
      purity: parseFloat(item.purity) || null,
    }));

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

    await prisma.jobcard.create({
      data: {
        goldsmithId: parseInt(goldSmithId),
        description,
        givenGold: {
          create: givenGoldArr,
        },
        total: {
          create: jobCardTotal,
        },
      },
    });

    const allJobCards = await prisma.jobcard.findMany({
      where: {
        goldsmithId: parseInt(goldSmithId),
      },
      include: {
        givenGold: true,
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

const updateJobCard = async (req, res) => {
  const { goldSmithId, jobCardId } = req.params;
  const { description, givenGold, itemDelivery, receiveSection, total } =
    req.body;
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
    for (const gold of givenGold) {
      const data = {
        goldsmithId: parseInt(goldSmithId),
        jobcardId: parseInt(jobCardId),
        weight: parseFloat(gold.weight) || 0,
        touch: parseFloat(gold.touch) || 0,
        purity: parseFloat(gold.purity) || 0,
      };
      if (gold?.id) {
        //if id is there update or create
        await prisma.givenGold.update({
          where: {
            id: gold.id,
          },
          data,
        });
      } else {
        await prisma.givenGold.create({
          data,
        });
      }
    }

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
              touch: parseFloat(item?.touch) || 0,
              sealName: item?.sealName,
              netWeight: parseFloat(item?.netWeight) || 0,
              wastageType: item?.wastageType,
              wastageValue: parseFloat(item?.wastageValue) || 0,
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
              itemWeight: parseFloat(item?.itemWeight) || 0,
              touch: parseFloat(item?.touch) || 0,
              sealName: item?.sealName,
              netWeight: parseFloat(item?.netWeight) || 0,
              wastageType: item?.wastageType,
              wastageValue: parseFloat(item?.wastageValue) || 0,
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
    }
    // receive section update and create
    if (receiveSection.length >= 1) {
      for (const receive of receiveSection) {
        const data = {
          goldsmithId: parseInt(goldSmithId),
          jobcardId: parseInt(jobCardId),
          weight: parseFloat(receive.weight) || 0,
          touch: parseFloat(receive.touch) || null,
          purity: parseFloat(receive.purity) || 0,
        };
        if (receive.id) {
          await prisma.receivedsection.update({
            where: { id: parseInt(receive.id) },
            data,
          });
        } else {
          await prisma.receivedsection.create({ data });
        }
      }
    }
    await updateNextJobBalance(totalOfJobcard.id,goldSmithId) // update nextJobCardNBalance

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
        givenGold:true,
        deliveries:{
          include:{
            deduction:true
          }
        },
        received:true,
        total:true,

      },
     
    });
    let jobCardLength=await prisma.jobcard.findMany()
    
    
 return res.status(200).json({
      goldsmith: {
        id: goldsmithInfo.id,
        name: goldsmithInfo.name,
        address:goldsmithInfo.address,
        phoneNo:goldsmithInfo.phone,
        
      },
      jobCards: allJobCards,
      jobCardLength:jobCardLength.length+1,
      
    });
  } catch (err) {
    console.error("Error fetching job card info:", err);
    return res.status(500).json({ error: "Server Error" });
  }
};

// getJobCardBy Id

const getJobCardById=async(req,res)=>{
    const {id}=req.params
   try{
    
      const goldSmithInfo = await prisma.jobcard.findUnique({where:{id:parseInt(id)}}); 

        if (!goldSmithInfo) {
         return res.status(404).json({ error: "Job Card not found" }); 
        }
      
      
        const jobCardInfo=await prisma.jobcard.findMany({
          where:{
            id:parseInt(id)
          },
          include:{
            goldsmith:true,
            givenGold:true,
            deliveries:{
              include:{
                deduction:true
              }
            },
            received:true,
            total:true
           }
        })
      
       
    
      let lastJobCard=(await prisma.total.findMany({where:{goldsmithId:goldSmithInfo.goldsmithId}})).at(-1)
       
       return res.status(200).json({"jobcard":jobCardInfo,lastJobCard:lastJobCard})

      } catch(err){
      return res.status(500).json({err:"Server Error"})
   }
  }

  const getPreviousJobCardBal=async(req,res)=>{
       const{id}=req.params
       
       try{
          const jobCards = await prisma.total.findMany({
              where:{
              goldsmithId:parseInt(id)
             } 
          });
         
          if(jobCards.length>=1){
             const jobCard=jobCards.at(-1)
             
              res.status(200).json({"status":"balance",balance:jobCard.jobCardBalance})
          }else{
            res.status(200).json({"status":"nobalance",balance:0})
          }
          
        }catch(err){
           console.error("Previous Balance Error:", err);
           return res.status(500).json({ error: err.message });
        
       }
       
     
  }
module.exports = {
  createJobcard,
  updateJobCard,
  getAllJobCardsByGoldsmithId,
  getJobCardById,
  getPreviousJobCardBal
};
