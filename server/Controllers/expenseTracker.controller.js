const {PrismaClient}=require('@prisma/client')
const prisma =new PrismaClient()
const reduce=require('../Utils/reduceRawGold')


exports.createExpense=async(req,res)=>{
   try{
       const {description,gold,touch,purity}=req.body
        console.log(req.body)

       if(!gold||!touch){
          return res.status(400).json({err:"Missing Required Fields"})
       }
       await reduce.expenseGoldReduce(gold,touch,purity,description)

       const allExpense=await prisma.expenseTracker.findMany()

       return res.status(200).json({allExpense,message:"New Expense Created"})
   }catch(err){
      console.log(err.message)
      return res.status(500).json({err:err.message})
   }
   
}
exports.getAllExpense=async(req,res)=>{
   
    try{
        const allExpense=await prisma.expenseTracker.findMany({
         orderBy:{
            id:"desc"
         }
        })
        res.status(200).json({allExpense})
    }catch(err){
       console.log('err',err.message)
       res.status(500).json({err:err.message})
    }
}