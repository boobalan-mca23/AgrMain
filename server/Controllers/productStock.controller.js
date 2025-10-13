const {PrismaClient}=require('@prisma/client')
const prisma=new PrismaClient()

const getAllProductStock = async (req, res) => {
  try {
    const allStock = await prisma.productStock.findMany();

    // Find items with itemWeight <= 0.05 and still active
    const inactiveItems = allStock.filter(
      (item) => item.itemWeight <= 0.05 && item.isActive
    );


    if (inactiveItems.length > 0) {
      const updatePromises = inactiveItems.map((item) =>
        prisma.productStock.update({
          where: { id: item.id },
          data: { isActive: false, isBillProduct: false },
        })
      );
      await Promise.all(updatePromises);
    }

    const activeStock = allStock.filter((item) => item.isActive);

    return res.status(200).json({ allStock: activeStock });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ err: err.message });
  }
};

const updateProductStock = async(req,res)=>{
  const {id}=req.params
  const {isBillProduct,isActive}=req.body
  try{
    const updatedStock=await prisma.productStock.update({
      where:{id:parseInt(id)},
      data:{isBillProduct,isActive}
    })
    console.log("Updated stock:", updatedStock);
    return res.status(200).json({updatedStock})
  }catch(err){
    console.log(err.message)
    res.status(500).json({err:err.message})
  } 

}

module.exports={
    getAllProductStock,
    updateProductStock,
}
