const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
 
const createWastage = async (req, res) => {
  const { wastage } = req.body;
 
  const parsedWastage = parseFloat(wastage);
  
   if (isNaN(parsedWastage)) {
      return res.status(400).json({ error: "Invalid number" });
    }
    const ifExist=await prisma.masterWastage.findFirst({
      where:{
        wastage:parsedWastage
      }
    })
    if(ifExist){
      return res.status(400).json({msg:"Wastage Already Exist"})
    }
 
       const newWastage  = await prisma.masterWastage.create({
      data: { wastage: parsedWastage },
      
    });
      
    return res.status(201).json(newWastage);
};
 
const getWastage = async (req, res) => {
  try {
    const wastages = await prisma.masterWastage.findMany();
    res.json(wastages);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
 
const updateWastage = async (req, res) => {
  const { id } = req.params;
  const { wastage } = req.body;
 
  try {
    const parsedWastage = parseFloat(wastage);
    if (isNaN(parsedWastage)) {
      return res.status(400).json({ msg: "Invalid number" });
    }
 
    const ifExist = await prisma.masterWastage.findFirst({
      where: {
        wastage: parsedWastage,
        NOT: { id: parseInt(id) },
      },
    });
 
    if (ifExist) {
      return res.status(400).json({ msg: "Wastage Already Exist" });
    }
 
    const updated = await prisma.masterWastage.update({
      where: { id: parseInt(id) },
      data: { wastage: parsedWastage },
    });
 
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update wastage value" });
  }
};
 
 
const deleteWastage =  async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.masterWastage.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "Wastage value deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete Wastage value" });
  }
};
module.exports = {
  createWastage,
  getWastage,
  updateWastage,
  deleteWastage,
};