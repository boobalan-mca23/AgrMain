const {PrismaClient}=require('@prisma/client')
const prisma=new PrismaClient()

const getAllProductStock=async(req,res)=>{
     
      try{
        const allStock=await prisma.productStock.findMany()
        return res.status(200).json({allStock})

      }catch(err){
        console.log(err.message)
        res.status(500).json({err:err.message})
      }
     
}
module.exports={
    getAllProductStock
}
