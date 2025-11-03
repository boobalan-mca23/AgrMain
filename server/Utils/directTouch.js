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

const directTouchJobReceive=async(received)=>{
    const dbtouch = await prisma.masterTouch.findMany({
     select: {touch: true }
  });
  
  const dbtouchs = dbtouch .map(w => Number(w.touch));

  const requestTouch = [...new Set(
  
    received
    .filter(item => item.touch !== undefined && item.touch !== null)
    .map(item => Number(item.touch))
)];


const newTouches = requestTouch.filter(
  w => !dbtouchs.includes(w)
);

console.log('newTouches',newTouches)

if (newTouches.length > 0) {
  await prisma.$transaction(
    newTouches.map((val) =>
      prisma.masterTouch.create({
        data: {
          touch: val,
          rawGoldStock: {
            create: {
              weight: 0,
              remainingWt: 0,
              touch: val, // assign same touch
            },
          },
        },
      })
    )
  );
}

}
module.exports={
   directTouch,
   directTouchJobReceive
}