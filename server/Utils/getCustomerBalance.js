const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getCustomerBalance = async (customerId) => {
  const id = parseInt(customerId);

  const billTotal = await prisma.bill.aggregate({
    _sum: { billAmount: true },
    where: { customer_id: id },
  });

  const billReceiveTotal = await prisma.billReceived.aggregate({
    _sum: { purity: true },
    where: { customer_id: id },
  });

  const receiptVoucherTotal = await prisma.receiptVoucher.aggregate({
    _sum: { purity: true },
    where: { customer_id: id },
  });

  const custTranTotal = await prisma.transaction.aggregate({
    _sum: { purity: true },
    where: { customerId: id },
  });

  const customerBalance = await prisma.customerBillBalance.findUnique({
    where: { customer_id: id },
    select: { balance: true },
  });

  const billAmt = billTotal._sum.billAmount || 0;
  const receivedAmt = billReceiveTotal._sum.purity || 0;
  const receiptAmt = receiptVoucherTotal._sum.purity || 0;
  const tranAmt = custTranTotal._sum.purity || 0;
  const prevBalance = customerBalance?.balance || 0;

  console.log({
    billAmt,
    receivedAmt,
    receiptAmt,
    tranAmt,
    prevBalance,
  });

  const totalReceived = receivedAmt + receiptAmt + tranAmt;
  let currentBalance = 0;

  if (prevBalance >= 0) {
    currentBalance = (billAmt + prevBalance) - totalReceived;
  } else {
    currentBalance = billAmt - (totalReceived + Math.abs(prevBalance));
  }

  console.log("Final Calculated Balance:", currentBalance);
  return currentBalance;
};
