 const { PrismaClient } = require("@prisma/client");
 const prisma = new PrismaClient();

 const changeJobCardBalance= async(id,balance)=>{
       const jobCards = await prisma.total.findMany({
      where: {
        goldsmithId: parseInt(id),
      },
    });

    if (jobCards.length >= 1) { // if goldSmith have more than one job card we need to update balance
       const jobCard = jobCards.at(-1);
       await prisma.total.update({
         where:{
            id:jobCard.id
         },
         data:{
            balanceOption:true,
            goldSmithBalance:parseFloat(balance)
         }
       }) 
     }
}

const getGoldSmithBalance= async(id)=>{
    
    const goldSmith = await prisma.goldsmith.findUnique({
      where: {
        id: parseInt(id),
      },
      select:{
        balance:true
      }
    });
    return goldSmith.balance
}
const updateGoldSmithBalance=async(id)=>{

     const jobCards = await prisma.total.findMany({
      where: {
        goldsmithId: parseInt(id),
      },
    });
    const jobCard = jobCards.at(-1);
    // we always set last job card balance to goldsmith balance
    await prisma.goldsmith.update({
      where:{
        id:parseInt(id)
      },
      data:{
        balance:jobCard.jobCardBalance||0
      }
    })
}

module.exports={
    changeJobCardBalance,
    getGoldSmithBalance,
    updateGoldSmithBalance
}
