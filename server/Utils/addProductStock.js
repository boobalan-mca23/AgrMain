const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();


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
      
      (sum, d) => sum + (d.stoneWt || 0),
      0
    );
    

    return acc;
  }, {});

  let stockInformation = Object.values(grouped);
   console.log('stock information',stockInformation)
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
          finalWeight: stockItem.totalStoneWeight,
        },
      });
    }
  }
};



const addProductStock= async(goldSmithId,jobCardId,itemDelivery)=>{
    if (itemDelivery.length >= 1) {
        await prisma.$transaction(async (tx)=>{
          for (const item of itemDelivery) {
        if (item?.id) {
          
         // Fisrt Update to productStock Log 

      const updateProductStock = await tx.productStockLog.update({
            where: {
              id: item.productlogID,
            },
            data: {
              itemName: item?.itemName,
              itemWeight: parseFloat(item?.itemWeight) || 0,
              count:parseInt(item?.count)||0,
              touch: parseFloat(item?.touch) || 0,
              sealName: item?.sealName,
              netWeight: parseFloat(item?.netWeight) || 0,
              wastageType: item?.wastageType,
              wastageValue: parseFloat(item?.wastageValue) || 0,
              wastagePure: parseFloat(item?.wastagePure) || 0,
              finalPurity: parseFloat(item.finalPurity) || 0,
            },
          });

          if (item.deduction.length >= 1) {
            for (const ded of item.deduction) {
              const data = {
                productlogID:updateProductStock.id,
                type: ded.type || null,
                weight: parseFloat(ded.weight) || 0,
                stoneWt: parseFloat(ded.stoneWt) || 0,
              };
              if (ded.id) {
                await tx.ProductStockdedLog.update({
                  where: {
                    id: ded.productStockdedId,
                  },
                  data,
                });
              } else {
                await prisma.deduction.create({ data });
              }
            }
          }
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
              wastageType: item?.wastageType,
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
         
         // First Create log then Connect log id to itemdelivery
         const productStockLog=await tx.productStockLog.create({
            data:{
              goldsmithId: parseInt(goldSmithId),
              jobcardId: parseInt(jobCardId),
              itemName: item?.itemName,
              count:parseInt(item?.count)||0,
              itemWeight: parseFloat(item?.itemWeight) || 0,
              touch: parseFloat(item?.touch) || 0,
              sealName: item?.sealName,
              netWeight: parseFloat(item?.netWeight) || 0,
              wastageType: item?.wastageType,
              wastageValue: parseFloat(item?.wastageValue) || 0,
              wastagePure: parseFloat(item?.wastagePurity) || 0,
              finalPurity: parseFloat(item.finalPurity) || 0,
             
            }
         })


           const newItem=await tx.itemDelivery.create({
              data: {
              productLogID:productStockLog.id,
              goldsmithId: parseInt(goldSmithId),
              jobcardId: parseInt(jobCardId),
              itemName: item?.itemName,
              count:parseInt(item?.count)||0,
              itemWeight: parseFloat(item?.itemWeight) || 0,
              touch: parseFloat(item?.touch) || 0,
              sealName: item?.sealName,
              netWeight: parseFloat(item?.netWeight) || 0,
              wastageType: item?.wastageType,
              wastageValue: parseFloat(item?.wastageValue) || 0,
              wastagePure: parseFloat(item?.wastagePurity) || 0,
              finalPurity: parseFloat(item.finalPurity) || 0,
             },
          });

         if (item.deduction.length >= 1) {
            for (const ded of item.deduction) {
              const data = {
                productlogID:productStockLog.id,
                type: ded.type || null,
                weight: parseFloat(ded.weight) || 0,
                stoneWt: parseFloat(ded.stoneWt) || 0,
              };
              
              const productdedlog = await prisma.deduction.create({ data });
              await tx.deduction.create({...data,productStockdedId:productdedlog.id})

              
            }
          }
        

          
        }
      }
        })
      
      await itemToStock(); // product stock
    }
}

module.exports={
    addProductStock
}