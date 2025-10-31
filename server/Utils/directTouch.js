const {PrismaClient}=require('@prisma/client')
const prisma=new PrismaClient()

const directTouch=async(touch)=>{
    console.log('direct touch ',touch);
    
    if(touch){
    const isExist= await prisma.masterTouch.findFirst({
      where:{
        touch:parseFloat(touch)
      }
   })
   if(!isExist){
  await prisma.masterTouch.create({
      data: { touch:parseFloat(touch) ,
        rawGoldStock:{
          create:{
            weight:0,
            remainingWt:0,
            touch:parseFloat(touch)
          }
        } },
    });
   }   
    }
   
}

module.exports={
   directTouch
}