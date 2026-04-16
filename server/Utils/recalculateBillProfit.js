const recalculateBillProfit = async (billId, tx) => {
  const items = await tx.orderItems.findMany({
    where: { billId }
  });

  let billDetailsProfit = 0;
  let stoneProfit = 0;

  for (const item of items) {
    // We only calculate profit for items that are still "active" on the bill
    // If an item was fully returned or repaired to stock (weight 0), its contribution is 0
    const weight = Number(item.weight) || 0;
    if (weight <= 0) continue;

    let purchaseWastage = 0;
    let purchaseTouch = 0;

    if (item.stockId) {
      if (item.stockType === "ITEM_PURCHASE") {
        const stock = await tx.itemPurchaseEntry.findUnique({
          where: { id: item.stockId }
        });
        if (stock) {
          purchaseWastage = Number(stock.wastage) || 0;
          purchaseTouch = Number(stock.touch) || 0;
        }
      } else {
        const stock = await tx.productStock.findUnique({
          where: { id: item.stockId }
        });
        if (stock) {
          purchaseWastage = Number(stock.wastageValue) || 0;
          purchaseTouch = Number(stock.touch) || 0;
        }
      }
    }

    const awt = Number(item.afterWeight) || 0;
    const fwt = Number(item.finalWeight) || 0;
    const eStWt = Number(item.enteredStoneWeight) || 0;
    const aStWt = Number(item.stoneWeight) || 0;

    // Formula: fwt - (awt * purchaseWastage) / 100
    const rowBillProfit = fwt - (awt * purchaseWastage) / 100;
    billDetailsProfit += rowBillProfit;

    // Formula: (eStWt - aStWt) * purchaseTouch / 100
    const rowStoneProfit = Math.max(0, eStWt - aStWt) * purchaseTouch / 100;
    stoneProfit += rowStoneProfit;
  }

  const totalProfit = billDetailsProfit + stoneProfit;

  await tx.bill.update({
    where: { id: billId },
    data: {
      billDetailsprofit: Number(billDetailsProfit.toFixed(3)),
      Stoneprofit: Number(stoneProfit.toFixed(3)),
      Totalprofit: Number(totalProfit.toFixed(3))
    }
  });
};

module.exports = recalculateBillProfit;
