const recalculateBillProfit = async (billId, tx) => {
  const items = await tx.orderItems.findMany({
    where: { billId }
  });

  let billDetailsProfit = 0;
  let stoneProfit = 0;
  let totalTouchProfit = 0;

  for (const item of items) {
    // We only calculate profit for items that are still "active" on the bill
    // If an item was fully returned or repaired to stock (weight 0), its contribution is 0
    const weight = Number(item.weight) || 0;
    if (weight <= 0) continue;

    let stock = null;
    if (item.stockId) {
      if (item.stockType === "ITEM_PURCHASE") {
        stock = await tx.itemPurchaseEntry.findUnique({
          where: { id: item.stockId }
        });
      } else {
        stock = await tx.productStock.findUnique({
          where: { id: item.stockId }
        });
      }
    }

    const awt = Number(item.afterWeight) || 0;
    const fwt = Number(item.finalWeight) || 0;
    const eStWt = Number(item.enteredStoneWeight) || 0;
    const aStWt = Number(item.stoneWeight) || 0;

    if (stock) {
      const touchValue = Number(stock.touch) || 0;
      const wastageValue =
        item.stockType === "ITEM_PURCHASE"
          ? Number(stock.wastage)
          : Number(stock.wastageValue);

      // Bill Details Profit: Old formula (FWT - AWT * Wastage / 100)
      const rowDetailsProfit = fwt - (awt * wastageValue) / 100;
      billDetailsProfit += rowDetailsProfit;

      // Total Profit Component: Touch-based Margin (FWT - AWT * Touch / 100)
      const rowTouchProfit = fwt - (awt * touchValue) / 100;
      totalTouchProfit += rowTouchProfit;

      // Stone Profit calculation using the same stock's touch
      const rowStoneProfit = Math.max(0, eStWt - aStWt) * touchValue / 100;
      stoneProfit += rowStoneProfit;
    }
  }

  const finalTotalProfit = totalTouchProfit //+ stoneProfit;

  await tx.bill.update({
    where: { id: billId },
    data: {
      billDetailsprofit: Number(billDetailsProfit.toFixed(3)),
      Stoneprofit: Number(stoneProfit.toFixed(3)),
      Totalprofit: Number(finalTotalProfit.toFixed(3))
    }
  });
};

module.exports = recalculateBillProfit;
