const prisma = require("../prismaClient");

const getRawGoldStock=async(req,res)=>{
     try{
         const allRawGold=await prisma.rawgoldStock.findMany()
         res.status(200).json({allRawGold})
     }catch(err){
        res.status(500).json({err:err.message})
     }
      
}

module.exports={
    getRawGoldStock
}
