const {PrismaClient}=require('@prisma/client')
const prisma =new PrismaClient()
const reduce=require('../Utils/reduceRawGold')


exports.createExpense=async(req,res)=>{
   try{
       const {expenseDate,description,gold,touch,purity}=req.body
        console.log('Date',expenseDate)

       if(!gold||!touch){
          return res.status(400).json({err:"Missing Required Fields"})
       }
       await reduce.expenseGoldReduce(new Date(expenseDate),gold,touch,purity,description)

       const allExpense=await prisma.expenseTracker.findMany({
         orderBy:{
            id:"desc"
         }
       })

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

exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { expenseDate, description, gold, touch, purity } = req.body;

        const expense = await prisma.expenseTracker.findUnique({
            where: { id: parseInt(id) }
        });

        if (!expense) return res.status(404).json({ err: "Expense not found" });

        // Update rawGoldLog if it exists
        if (expense.logId) {
            const stock = await prisma.rawgoldStock.findFirst({
                where: { touch: touch || 0 },
                select: { id: true }
            });

            if (stock) {
                await prisma.rawGoldLogs.update({
                    where: { id: expense.logId },
                    data: {
                        rawGoldStockId: stock.id,
                        weight: -(parseFloat(purity) || 0),
                        amount: -(parseFloat(gold) || 0),
                        touch: parseFloat(touch) || 0,
                        purity: -(parseFloat(purity) || 0)
                    }
                });
            }
        }

        const updatedExpense = await prisma.expenseTracker.update({
            where: { id: parseInt(id) },
            data: {
                expenseDate: new Date(expenseDate),
                description,
                gold: parseFloat(gold),
                touch: parseFloat(touch),
                purity: parseFloat(purity)
            }
        });

        await reduce.setTotalRawGold();

        const allExpense = await prisma.expenseTracker.findMany({
            orderBy: { id: "desc" }
        });

        return res.status(200).json({ allExpense, message: "Expense Updated Successfully" });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ err: err.message });
    }
}

exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await prisma.expenseTracker.findUnique({
            where: { id: parseInt(id) }
        });

        if (!expense) return res.status(404).json({ err: "Expense not found" });

        // Delete associated log if exists
        if (expense.logId) {
            await prisma.rawGoldLogs.delete({
                where: { id: expense.logId }
            });
        }

        await prisma.expenseTracker.delete({
            where: { id: parseInt(id) }
        });

        await reduce.setTotalRawGold();

        const allExpense = await prisma.expenseTracker.findMany({
            orderBy: { id: "desc" }
        });

        return res.status(200).json({ allExpense, message: "Expense Deleted Successfully" });
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({ err: err.message });
    }
}