const {PrismaClient}=require('@prisma/client')
const prisma=new PrismaClient()

const directWatageValue=async(itemDelivery)=>{

  const dbWastages = await prisma.masterWastage.findMany({
  select: { wastage: true }
});
const dbWastageValues = dbWastages.map(w => Number(w.wastage));


const requestWastageValues = [...new Set(
  itemDelivery
    .filter(item => item.wastageValue !== undefined && item.wastageValue !== null)
    .map(item => Number(item.wastageValue))
)];


const newWastageValues = requestWastageValues.filter(
  w => !dbWastageValues.includes(w)
);

console.log('newWatageValues',newWastageValues)

if (newWastageValues.length > 0) {
  await prisma.masterWastage.createMany({
    data: newWastageValues.map(val => ({ wastage: val }))
  });
}
   
}

module.exports={
    directWatageValue,
    
}