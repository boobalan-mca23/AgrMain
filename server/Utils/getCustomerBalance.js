const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.getCustomerBalance=async(customerId)=>{
       const billTotal=await prisma.bill.aggregate({
        _sum:{
            billAmount:true
        },
        where:{
            customer_id:parseInt(customerId)
        }
       })
       const billReceiveTotal=await prisma.billReceived.aggregate({
       _sum:{purity:true},
        where:{
            customer_id:parseInt(customerId)
        }
       })
       const receiptVoucherTotal=await prisma.receiptVoucher.aggregate({
        _sum:{purity:true},
        where:{
            customer_id:parseInt(customerId)
        }
       })
       return billTotal._sum.billAmount-(billReceiveTotal._sum.purity+receiptVoucherTotal._sum.purity)
} 

