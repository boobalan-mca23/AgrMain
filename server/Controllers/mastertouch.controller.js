const prisma = require("../prismaClient");
const { getOrSetCache, invalidateCache } = require("../Utils/cache");

const createTouch = async (req, res) => {
  const { touch } = req.body;

  const parsedTouch = parseFloat(touch);
  
   if (isNaN(parsedTouch)) {
      return res.status(400).json({ error: "Invalid number" });
    }
    const ifExist=await prisma.masterTouch.findFirst({
      where:{
        touch:parsedTouch
        
      }
    })
    if(ifExist){
      return res.status(400).json({msg:"Touch Already Exist"})
    }

       const newTouch = await prisma.masterTouch.create({
      data: { touch: parsedTouch ,
        rawGoldStock:{
          create:{
            weight:0,
            remainingWt:0,
            touch:parsedTouch
          }
        }
        
      },
      
    });
    invalidateCache("master_touches");
      
    return res.status(201).json(newTouch);
};

const getTouch = async (req, res) => {
  try {
    const touches = await getOrSetCache("master_touches", () =>
      prisma.masterTouch.findMany()
    );
    res.json(touches);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateTouch =  async (req, res) => {
  const { id } = req.params;
  const { touch } = req.body;
 
  try {
   
    const updated = await prisma.masterTouch.update({
      where: { id: parseInt(id) },
      data: { touch: parseFloat(touch) },
    });
    invalidateCache("master_touches");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Touch Already Exist" });
  }
}

const deleteTouch = async (req, res) => {
  const { id } = req.params;
  try {
    const touchId = parseInt(id);

    // Delete associated RawgoldStock records first
    await prisma.rawgoldStock.deleteMany({
      where: { touchId: touchId },
    });

    // Then delete the masterTouch record
    await prisma.masterTouch.delete({
      where: { id: touchId },
    });

    invalidateCache("master_touches");

    res.json({ message: "Touch value deleted" });
  } catch (err) {
    console.error("Error deleting touch:", err);
    res.status(500).json({ error: "Failed to delete touch value. It might be in use." });
  }
};
module.exports = {
  createTouch,
  getTouch,
  updateTouch,
  deleteTouch,
};
