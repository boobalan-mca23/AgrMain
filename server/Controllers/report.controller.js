const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getCustomerStatement = async (req, res) => {
  const { id } = req.params;
  const { fromDate, toDate } = req.query;

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: {
        customerBillBalance: true,
      },
    });

    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const dateFilter = {};
    if (toDate) dateFilter.lte = new Date(toDate);

    const filterObj = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};
    const createdAtFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};
    const sentDateFilter = Object.keys(dateFilter).length > 0 ? { sentDate: dateFilter } : {};

    // Fetch all related transactions
    const [bills, billReceived, receiptVouchers, transactions, returns, adjustments] = await Promise.all([
      prisma.bill.findMany({ 
        where: { customer_id: parseInt(id), ...createdAtFilter }, 
        orderBy: { date: 'asc' },
        include: { orders: true }
      }),
      prisma.billReceived.findMany({ where: { customer_id: parseInt(id), ...createdAtFilter } }),
      prisma.receiptVoucher.findMany({ where: { customer_id: parseInt(id), ...createdAtFilter } }),
      prisma.transaction.findMany({ where: { customerId: parseInt(id), ...filterObj } }),
      prisma.returnLogs.findMany({ where: { bill: { customer_id: parseInt(id) }, ...createdAtFilter } }),
      prisma.balanceAdjustment.findMany({ where: { entityType: "CUSTOMER", entityId: parseInt(id), ...createdAtFilter } }),
    ]);

    const repairs = await prisma.repairStock.findMany({
      where: {
        bill: {
          customer_id: parseInt(id)
        },
        ...sentDateFilter
      },
      include: {
        bill: true,
        orderItem: true
      }
    });

    let ledger = [];

    // 1. Initial Balance row - Using fixed Birth values with fallbacks
    const rawInitBal = customer.customerBillBalance?.initialBalance ?? customer.customerBillBalance?.balance ?? 0;
    const rawInitHM = customer.customerBillBalance?.initialHallmark ?? customer.customerBillBalance?.hallMarkBal ?? 0;

    const openingRow = {
      date: customer.createdAt,
      module: (rawInitBal < 0 || rawInitHM < 0) ? "Excess Balance" : "Opening Balance",
      description: "Initial Balance",
      debitAmount: rawInitBal > 0 ? rawInitBal : 0,
      creditAmount: rawInitBal < 0 ? Math.abs(rawInitBal) : 0,
      debitHallmark: rawInitHM > 0 ? rawInitHM : 0,
      creditHallmark: rawInitHM < 0 ? Math.abs(rawInitHM) : 0,
      type: "Opening",
      sortPriority: 0,
      createdAt: customer.createdAt
    };
    
    ledger.push(openingRow);

    // Group returns and repairs by billId for Hallmark correction
    // This allows us to reconstruct the "Original" hallmark amount for the ledger
    const hallmarkReturnMap = returns.reduce((acc, ret) => {
        if (ret.billId) {
            acc[ret.billId] = (acc[ret.billId] || 0) + (Number(ret.hallmarkReduction) || 0);
        }
        return acc;
    }, {});

    const hallmarkRepairMap = repairs.reduce((acc, rep) => {
        if (rep.billId) {
            const hallmarkRate = Number(rep.bill?.hallMark) || 0;
            const reductionCount = Number(rep.count) || 0;
            acc[rep.billId] = (acc[rep.billId] || 0) + (hallmarkRate * reductionCount);
        }
        return acc;
    }, {});

    // Normalize Bills
    bills.forEach(b => {
      const returnedHMAmt = hallmarkReturnMap[b.id] || 0;
      const repairedHMAmt = hallmarkRepairMap[b.id] || 0;
      const currentHallmarkAmt = (Number(b.hallmarkQty) || 0) * (Number(b.hallMark) || 0);
      const originalHallmarkAmt = currentHallmarkAmt + returnedHMAmt + repairedHMAmt;

      const hmDesc = (originalHallmarkAmt > 0) ? `, Hallmark: ${originalHallmarkAmt.toFixed(3)}` : "";
      ledger.push({
        date: b.date || b.createdAt,
        module: "Bill",
        description: `Bill #${b.id}${hmDesc}`,
        debitAmount: b.billAmount || 0,
        creditAmount: 0,
        debitHallmark: originalHallmarkAmt,
        creditHallmark: 0,
        refId: b.id,
        sortPriority: 2,
        metadata: {
            orders: b.orders,
            hallmarkQty: b.hallmarkQty,
            hallMark: b.hallMark
        }
      });
    });

    // Normalize Bill Received
    billReceived.forEach(br => {
      ledger.push({
        date: br.createdAt,
        module: "Bill Receipt",
        description: `Payment Received (Gold: ${br.gold || 0}, Prty: ${br.purity || 0})`,
        debitAmount: 0,
        creditAmount: br.amount || 0,
        debitHallmark: 0,
        creditHallmark: br.receiveHallMark || 0,
        refId: br.id,
        sortPriority: 2,
        metadata: {
            type: br.type,
            amount: br.amount,
            goldRate: br.goldRate,
            purity: br.purity,
            goldWeight: br.gold,
            touch: br.touch,
            hallmark: br.receiveHallMark
        }
      });
    });

    // Normalize Receipt Vouchers
    receiptVouchers.forEach(rv => {
      let desc = rv.type || "Receipt Voucher";
      let val = 0;
      const hmPart = rv.receiveHallMark > 0 ? `, HM: ${rv.receiveHallMark}` : "";

      if (rv.type === "Cash" || rv.type === "Cash RTGS") {
        const purity = rv.purity || 0;
        const touch = rv.touch || 0;
        const pureGold = touch > 0 ? ((purity / touch) * 100) : 0;
        desc = `${rv.type}: Amt: ₹${rv.amount || 0}, Rate: ₹${rv.goldRate || 0}, Touch: ${touch}%, Prty: ${purity.toFixed(3)}g, Pure G: ${pureGold.toFixed(3)}g${hmPart}`;
        val = pureGold;
      } else if (rv.type === "Gold") {
        const purity = rv.purity || 0;
        desc = `${rv.type}: ${rv.gold || 0}g, Touch: ${rv.touch || 0}%, Prty: ${purity.toFixed(3)}g${hmPart}`;
        val = purity;
      } else {
        // Hallmark-only entry
        desc = `Hallmark: ${rv.receiveHallMark || 0}`;
      }

      ledger.push({
        date: rv.date || rv.createdAt, // If logical date is available as string, use it
        createdAt: rv.createdAt, // Physical entry timestamp
        module: "Receipt Voucher",
        description: desc,
        debitAmount: 0,
        creditAmount: val, // For Cash types, val = pureGold. For Gold types, val = purity.
        debitHallmark: 0,
        creditHallmark: rv.receiveHallMark || 0,
        cashCredit: rv.type === "Cash" || rv.type === "Cash RTGS" ? rv.amount : 0, 
        refId: rv.id,
        sortPriority: 2,
        metadata: {
            type: rv.type,
            ...(rv.type === "Cash" || rv.type === "Cash RTGS" ? {
                amount: rv.amount,
                goldRate: rv.goldRate
            } : {
                goldWeight: rv.gold
            }),
            touch: rv.touch,
            purity: rv.purity,
            hallmark: rv.receiveHallMark,
            ...(rv.type === "Cash" || rv.type === "Cash RTGS" ? {
                pureGold: rv.touch > 0 ? ((rv.purity / rv.touch) * 100) : 0
            } : {})
        }
      });
    });

    // Normalize Transactions
    transactions.forEach(t => {
      let desc = t.type || "General Transaction";
      let val = 0;

      if (t.type === "Cash" || t.type === "Cash RTGS") {
        const purity = t.purity || 0;
        const touch = t.touch || 0;
        const pureGold = touch > 0 ? ((purity / touch) * 100) : 0;
        desc = `${t.type}: Amt: ₹${t.amount || 0}, Rate: ₹${t.goldRate || 0}, Touch: ${touch}%, Prty: ${purity.toFixed(3)}g, Pure G: ${pureGold.toFixed(3)}g`;
        val = pureGold;
      } else if (t.type === "Gold") {
        const purity = t.purity || 0;
        desc = `${t.type}: ${t.gold || 0}g, Touch: ${t.touch || 0}%, Prty: ${purity.toFixed(3)}g`;
        val = purity;
      }

      ledger.push({
        date: t.date || t.createdAt,
        createdAt: t.createdAt,
        module: "Transaction",
        description: desc,
        debitAmount: 0,
        creditAmount: val, // For Cash types, val = pureGold. For Gold types, val = purity.
        debitHallmark: 0,
        creditHallmark: 0,
        cashCredit: t.type === "Cash" || t.type === "Cash RTGS" ? t.amount : 0,
        refId: t.id,
        sortPriority: 2,
        metadata: {
            type: t.type,
            ...(t.type === "Cash" || t.type === "Cash RTGS" ? {
                amount: t.amount,
                goldRate: t.goldRate
            } : {
                goldWeight: t.gold
            }),
            touch: t.touch,
            purity: t.purity,
            ...(t.type === "Cash" || t.type === "Cash RTGS" ? {
                pureGold: t.touch > 0 ? ((t.purity / t.touch) * 100) : 0
            } : {})
        }
      });
    });

    // Normalize Returns
    
    returns.forEach(ret => {
        console.log("ret",ret)
        const awtVal = ret.awt ?? ret.weight ?? 0;
        const pureRed = ret.pureGoldReduction ?? 0;
        const hmRed = ret.hallmarkReduction ?? 0;
        
        let reasonStr = ret.reason ? ` - ${ret.reason}` : "";
        let stoneStr = ret.stoneWeight > 0 ? `, St.Wt: ${ret.stoneWeight}g` : "";
        let touchStr = ret.percentage !== undefined && ret.percentage !== null ? `, T: ${ret.percentage}%` : "";
        let desc = `Returned ${ret.productName} (Qty: ${ret.count}, Gross Wt: ${ret.weight}g${stoneStr}, AWT: ${awtVal}g${touchStr})${reasonStr} - Bill #${ret.billId || ret.bill?.id || "N/A"}`;
        if (pureRed > 0) desc += `, Balance Ded: ${pureRed.toFixed(3)}g`;
        if (hmRed > 0) desc += `, HM Ded: ${hmRed}`;

        ledger.push({
            date: ret.createdAt,
            createdAt: ret.createdAt,
            module: "Return",
            description: desc,
            debitAmount: 0,
            creditAmount: pureRed,
            debitHallmark: 0,
            creditHallmark: hmRed,
            refId: ret.id,
            sortPriority: 2,
            metadata: {
                productName: ret.productName,
                count: ret.count,
                weight: ret.weight, 
                stoneWeight: ret.stoneWeight,
                awt: awtVal,
                percentage: ret.percentage,
                pureGoldReduction: pureRed,
                hallmarkReduction: hmRed,
                reason: ret.reason,
                billId: ret.billId || ret.bill?.id,
                createdAt: ret.createdAt
            }
        });
    });

    console.log("repairs",repairs)
    
    // Normalize Repairs
    repairs.forEach(rep => {
        // Use rep.fwt if available, otherwise fallback to rep.purity
        const fwtRed = Number(rep.fwt) || Number(rep.purity) || 0; 
        const hallmarkRate = Number(rep.bill?.hallMark) || 0;
        
        // Fetch hallmark count (reductionCount from stored repair count)
        const reductionCount = Number(rep.count) || 1;
        const hmRed = hallmarkRate * reductionCount;

        let reasonStr = rep.reason ? ` - Reason: ${rep.reason}` : "";
        let stoneWt = rep.stoneWeight || ((Number(rep.grossWeight) || 0) - (Number(rep.netWeight) || 0)) || rep.orderItem?.stoneWeight || 0;
        let stoneStr = stoneWt > 0 ? `, St.Wt: ${stoneWt.toFixed(3)}g` : "";
        let billingTouch = rep.percentage || rep.orderItem?.percentage || 100;
        let desc = `Sent for Repair: ${rep.itemName} (Gross Wt: ${rep.grossWeight}g${stoneStr}, FWT: ${fwtRed.toFixed(3)}g, Qty: ${reductionCount}, T: ${billingTouch}%)${reasonStr} - Bill #${rep.billId || rep.bill?.id || "N/A"}`;
        if (rep.reason) desc += ` - Reason: ${rep.reason}`;
        if (hmRed > 0) desc += ` (HM Red: ${hmRed})`;

        ledger.push({
            date: rep.sentDate || rep.createdAt,
            createdAt: rep.createdAt,
            module: "Repair",
            description: desc,
            debitAmount: 0,
            creditAmount: fwtRed,
            debitHallmark: 0,
            creditHallmark: hmRed,
            refId: rep.id,
            sortPriority: 2,
            metadata: {
                itemName: rep.itemName,
                count: reductionCount,
                grossWeight: rep.grossWeight, 
                stoneWeight: stoneWt,
                netWeight: rep.netWeight,
                percentage: billingTouch,
                fwt: fwtRed,
                hallmarkReduction: hmRed,
                reason: rep.reason,
                status: rep.status,
                billId: rep.billId || rep.bill?.id,
                createdAt: rep.createdAt
            }
        });
    });

    // Normalize Adjustments - Manual Balance adjustments from Master
    adjustments.forEach(a => {
      ledger.push({
        date: a.date,
        createdAt: a.createdAt || a.date, // Use physical entry order to help tie-break same-day adjustments
        module: "Audit Correction",
        description: a.description || "Manual Balance Adjustment",
        debitAmount: (a.cashAmount || 0) >= 0 ? Math.abs(a.cashAmount || 0) : 0,
        creditAmount: (a.cashAmount || 0) < 0 ? Math.abs(a.cashAmount || 0) : 0,
        debitHallmark: (a.hmAmount || 0) >= 0 ? Math.abs(a.hmAmount || 0) : 0,
        creditHallmark: (a.hmAmount || 0) < 0 ? Math.abs(a.hmAmount || 0) : 0,
        refId: a.id,
        sortPriority: 1,
        isManualAdjustment: true
      });
    });

    // Sort for Running Balance Calculation:
    // 1. sortPriority (Opening row first)
    // 2. Date (Logical date of transaction)
    // 3. createdAt (Entry order when dates are same)
    ledger.sort((a, b) => {
      // Always keep Opening row at the very beginning
      if (a.sortPriority === 0) return -1;
      if (b.sortPriority === 0) return 1;

      const d1 = new Date(a.date);
      const d2 = new Date(b.date);

      // Normalize to Start of Day for day-to-day comparison
      const day1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
      const day2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();

      // Primary sort: if different days, sort chronologically
      if (day1 !== day2) return day1 - day2;

      // Secondary sort: use exact physical entry timestamp to sequence same-day actions
      const ctA = a.createdAt ? new Date(a.createdAt).getTime() : d1.getTime();
      const ctB = b.createdAt ? new Date(b.createdAt).getTime() : d2.getTime();
      
      // If physical timestamps are identical, fall back to priority
      if (ctA === ctB && (a.sortPriority || 0) !== (b.sortPriority || 0)) {
         return (a.sortPriority || 0) - (b.sortPriority || 0);
      }
      
      return ctA - ctB;
    });

    // Calculate Running Balance
    let currentCash = 0;
    let currentHallmark = 0;
    
    ledger.forEach(entry => {
      // For the VERY first row (Opening), Before is 0, After is the opening values
      if (entry.type === "Opening") {
        entry.beforeCash = 0;
        entry.beforeHallmark = 0;
        
        currentCash = (entry.debitAmount || 0) - (entry.creditAmount || 0);
        currentHallmark = (entry.debitHallmark || 0) - (entry.creditHallmark || 0);
        
        entry.afterCash = currentCash;
        entry.afterHallmark = currentHallmark;
      } else {
        entry.beforeCash = currentCash;
        entry.beforeHallmark = currentHallmark;
        
        currentCash += (entry.debitAmount || 0) - (entry.creditAmount || 0);
        currentHallmark += (entry.debitHallmark || 0) - (entry.creditHallmark || 0);
        
        entry.afterCash = currentCash;
        entry.afterHallmark = currentHallmark;
      }
      
      entry.runningCash = currentCash;
      entry.runningHallmark = currentHallmark;
    });
    
    // Final Filtering by fromDate:
    // We calculate the full history to ensure running balances are correct,
    // but only return the rows the user requested.
    if (fromDate) {
      const startLimit = new Date(fromDate);
      // Normalize to start of day
      const startLimitTime = new Date(startLimit.getFullYear(), startLimit.getMonth(), startLimit.getDate()).getTime();
      
      ledger = ledger.filter(entry => {
        const entryDate = new Date(entry.date);
        const entryTime = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime();
        return entryTime >= startLimitTime;
      });
    }

    res.status(200).json({ 
      customerName: customer.name, 
      ledger: ledger,
      currentBalances: {
        cash: currentCash,
        hallmark: currentHallmark
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching customer statement", error });
  }
};

exports.getGoldsmithStatement = async (req, res) => {
  const { id } = req.params;
  const { fromDate, toDate } = req.query;

  try {
    const goldsmith = await prisma.goldsmith.findUnique({
      where: { id: parseInt(id) }
    });

    if (!goldsmith) return res.status(404).json({ message: "Goldsmith not found" });

    const createdAtFilter = {};
    if (toDate) createdAtFilter.lte = new Date(toDate);

    const filterObj = Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {};

    const [givenGold, receivedSections, deliveries, repairs, adjustments, repairStock] = await Promise.all([
      prisma.givenGold.findMany({ 
        where: { goldsmithId: parseInt(id), ...filterObj },
        include: { jobcard: true }
      }),
      prisma.receivedsection.findMany({ 
        where: { goldsmithId: parseInt(id), ...filterObj },
        include: { jobcard: true }
      }),
      prisma.itemDelivery.findMany({ 
        where: { goldsmithId: parseInt(id), ...filterObj },
        include: { jobcard: true }
      }),
      prisma.repair.findMany({ 
        where: { goldsmithId: parseInt(id), ...filterObj } 
      }),
      prisma.balanceAdjustment.findMany({ 
        where: { entityType: "GOLDSMITH", entityId: parseInt(id), ...filterObj } 
      }),
      prisma.repairStock.findMany({
        where: { goldsmithId: parseInt(id) }, // We'll filter by date manually for sent/received
        include: { product: true, itemPurchase: true, orderItem: true, bill: true }
      })
    ]);

    let ledger = [];

    // Opening Balance
    const openingBal = (goldsmith.initialBalance !== null) ? goldsmith.initialBalance : (goldsmith.balance || 0);
    ledger.push({
      date: goldsmith.createdAt,
      createdAt: goldsmith.createdAt,
      module: openingBal < 0 ? "Excess Balance" : "Opening Balance",
      description: "Initial Balance",
      debitGold: openingBal > 0 ? openingBal : 0,
      creditGold: openingBal < 0 ? Math.abs(openingBal) : 0,
      type: "Opening",
      sortPriority: 0
    });

    givenGold.forEach(gg => {
      ledger.push({
        date: gg.createdAt,
        createdAt: gg.createdAt,
        module: "Gold Given",
        description: `JC#${gg.jobcardId || gg.id}: Issue to Goldsmith (Touch: ${gg.touch || 0})`,
        debitGold: gg.purity || 0,
        creditGold: 0,
        refId: gg.id,
        jobcardId: gg.jobcardId,
        sortPriority: 2,
        metadata: {
            type: "Gold Issue",
            weight: gg.weight,
            touch: gg.touch,
            purity: gg.purity,
            jobcardId: gg.jobcardId,
            createdAt: gg.createdAt
        }
      });
    });

    receivedSections.forEach(rs => {
      ledger.push({
        date: rs.createdAt,
        createdAt: rs.createdAt,
        module: "Gold Received",
        description: `JC#${rs.jobcardId || rs.id}: Receipt from Goldsmith (Touch: ${rs.touch || 0})`,
        debitGold: 0,
        creditGold: rs.purity || 0,
        refId: rs.id,
        jobcardId: rs.jobcardId,
        sortPriority: 2,
        metadata: {
            type: "Gold Receipt",
            weight: rs.weight,
            touch: rs.touch,
            purity: rs.purity,
            jobcardId: rs.jobcardId,
            createdAt: rs.createdAt
        }
      });
    });

    deliveries.forEach(d => {
      const stoneWt = (d.itemWeight || 0) - (d.netWeight || 0);
      ledger.push({
        date: d.createdAt,
        createdAt: d.createdAt,
        module: "Item Delivery",
        description: `JC#${d.jobcardId || d.id}: Finished Item: ${d.itemName} (Net: ${d.netWeight}, Wastage: ${d.wastagePure})`,
        debitGold: 0,
        creditGold: d.finalPurity || (d.netWeight + d.wastagePure) || 0,
        refId: d.id,
        jobcardId: d.jobcardId,
        sortPriority: 2,
        metadata: {
            itemName: d.itemName,
            itemWeight: d.itemWeight, // Wt
            stoneWeight: stoneWt,
            count: d.count,
            touch: d.touch,
            netWeight: d.netWeight,
            wastageType: d.wastageType,
            wastageValue: d.wastageValue,
            wastagePure: d.wastagePure, // W.Pure
            finalPurity: d.finalPurity,
            jobcardId: d.jobcardId,
            createdAt: d.createdAt
        }
      });
    });

    repairs.forEach(r => {
      ledger.push({
        date: r.createdAt,
        createdAt: r.createdAt,
        module: "Repair",
        description: "Repair Work Done",
        debitGold: 0,
        creditGold: r.netWeight || 0,
        refId: r.id,
        sortPriority: 2,
        metadata: {
            netWeight: r.netWeight,
            totalGiven: r.totalGiven,
            totalItem: r.totalItem,
            stone: r.stone
        }
      });
    });

    // Handle RepairStock (Sent & Returned)
    repairStock.forEach(rs => {
      // 1. Sent to Repair (Debit)
      const isSentInRange = (!toDate || rs.sentDate <= new Date(toDate));
      if (isSentInRange) {
        const stoneWtStr = rs.stoneWeight > 0 ? `, St.Wt: ${rs.stoneWeight}g` : "";
        const sourceLabel = (rs.source === "GOLDSMITH" || rs.source === "ITEM_PURCHASE") ? "Stock" : "Customer";
        const desc = `Repair(Sent): ${rs.itemName || "Item"} [Source: ${sourceLabel}] (Wt: ${rs.grossWeight}g${stoneWtStr}, Qty: ${rs.count || 1}, T: ${rs.orderItem?.percentage || rs.product?.touch || 100}%) ${rs.reason ? `- ${rs.reason}` : ""} - Bill #${rs.billId || rs.bill?.id || "N/A"}`;
        ledger.push({
          date: rs.sentDate,
          createdAt: rs.createdAt,
          module: "Repair (Sent)",
          description: desc,
          debitGold: rs.purity || 0,
          creditGold: 0,
          refId: rs.id,
          sortPriority: 2,
          metadata: {
            itemName: rs.itemName,
            grossWeight: rs.grossWeight,
            netWeight: rs.netWeight,
            stoneWeight: rs.stoneWeight || (rs.product?.stoneWeight) || ((rs.grossWeight || 0) - (rs.netWeight || 0)),
            enteredStoneWeight: rs.orderItem?.enteredStoneWeight || rs.product?.stoneWeight || 0,
            count: rs.count || 1,
            percentage: rs.orderItem?.percentage || rs.product?.touch || 100,
            purity: rs.purity,
            fwt: rs.fwt || rs.purity,
            billNo: rs.billId || rs.bill?.id,
            billId: rs.billId,
            reason: rs.reason,
            source: sourceLabel,
            wastageType: rs.product?.wastageType || rs.itemPurchase?.wastageType || "None",
            wastageValue: rs.product?.wastageValue || rs.itemPurchase?.wastage || 0,
            wastagePure: rs.product?.wastagePure || rs.itemPurchase?.wastagePure || 0,
            netWeight: rs.netWeight || rs.product?.netWeight || rs.itemPurchase?.netWeight || 0,
            finalPurity: rs.purity || rs.product?.finalPurity || rs.itemPurchase?.finalPurity || 0
          }
        });
      }

      // 2. Returned from Repair (Credit)
      if (rs.status === "Returned" && rs.receivedDate) {
        const isReceivedInRange = (!toDate || rs.receivedDate <= new Date(toDate));
        if (isReceivedInRange) {
          const stoneWtStr = rs.stoneWeight > 0 ? `, St.Wt: ${rs.stoneWeight}g` : "";
          const sourceLabel = (rs.source === "GOLDSMITH" || rs.source === "ITEM_PURCHASE") ? "Stock" : "Customer";
          const desc = `Repair(Ret): ${rs.itemName || "Item"} [Source: ${sourceLabel}] (Rec.Wt: ${rs.receivedWeight}g${stoneWtStr}, Qty: ${rs.count || 1}, T: ${rs.orderItem?.percentage || rs.product?.touch || 100}%) ${rs.reason ? `- ${rs.reason}` : ""} - Bill #${rs.billId || rs.bill?.id || "N/A"}`;
          ledger.push({
            date: rs.receivedDate,
            createdAt: rs.updatedAt, // Use updatedAt as high-resolution time for return
            module: "Repair (Returned)",
            description: desc,
            debitGold: 0,
            creditGold: rs.receivedPurity || 0,
            refId: rs.id,
            sortPriority: 2,
            metadata: {
              itemName: rs.itemName,
              receivedWeight: rs.receivedWeight,
              receivedPurity: rs.receivedPurity,
              stoneWeight: rs.stoneWeight || ((rs.grossWeight || 0) - (rs.netWeight || 0)),
              enteredStoneWeight: rs.orderItem?.enteredStoneWeight || rs.product?.stoneWeight || 0,
              count: rs.count || 1,
              percentage: rs.orderItem?.percentage || rs.product?.touch || 100,
              purity: rs.receivedPurity || rs.purity,
              fwt: rs.fwt || rs.receivedPurity || rs.purity,
              billNo: rs.billId || rs.bill?.id,
              billId: rs.billId,
              status: rs.status,
              source: sourceLabel,
              wastageType: rs.product?.wastageType || rs.itemPurchase?.wastageType || "None",
              wastageValue: rs.product?.wastageValue || rs.itemPurchase?.wastage || 0,
              wastagePure: rs.product?.wastagePure || rs.itemPurchase?.wastagePure || 0,
              netWeight: rs.netWeight || rs.product?.netWeight || rs.itemPurchase?.netWeight || 0,
              finalPurity: rs.receivedPurity || rs.product?.finalPurity || rs.itemPurchase?.finalPurity || 0
            }
          });
        }
      }
    });

    // Adjustments are already in 'adjustments' variable from Promise.all
    adjustments.forEach(a => {
      ledger.push({
        date: a.date,
        createdAt: a.createdAt || a.date,
        module: "Audit Correction",
        description: a.description || "Manual Balance Adjustment",
        debitGold: (a.goldAmount || 0) >= 0 ? Math.abs(a.goldAmount || 0) : 0,
        creditGold: (a.goldAmount || 0) < 0 ? Math.abs(a.goldAmount || 0) : 0,
        isManualAdjustment: true,
        sortPriority: 1
      });
    });

    // Sort for Running Balance Calculation: Opening first, then everything by actual date
    ledger.sort((a, b) => {
      if (a.sortPriority === 0) return -1;
      if (b.sortPriority === 0) return 1;

      const d1 = new Date(a.date);
      const d2 = new Date(b.date);

      // Normalize to Start of Day for day-to-day comparison
      const day1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
      const day2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();

      // Primary sort: if different days, sort chronologically
      if (day1 !== day2) return day1 - day2;

      // Secondary sort: use exact physical entry timestamp to sequence same-day actions
      const ctA = a.createdAt ? new Date(a.createdAt).getTime() : d1.getTime();
      const ctB = b.createdAt ? new Date(b.createdAt).getTime() : d2.getTime();
      
      // If physical timestamps are identical, fall back to priority
      if (ctA === ctB && (a.sortPriority || 0) !== (b.sortPriority || 0)) {
         return (a.sortPriority || 0) - (b.sortPriority || 0);
      }
      
      return ctA - ctB;
    });

    let runningGold = 0;
    ledger.forEach(entry => {
      if (entry.type === "Opening") {
        entry.beforeGold = 0;
        runningGold = (entry.debitGold || 0) - (entry.creditGold || 0);
        entry.afterGold = runningGold;
      } else {
        entry.beforeGold = runningGold;
        runningGold += (entry.debitGold || 0) - (entry.creditGold || 0);
        entry.afterGold = runningGold;
      }
      entry.runningGold = runningGold;
    });

    if (fromDate) {
      const startLimit = new Date(fromDate);
      const startLimitTime = new Date(startLimit.getFullYear(), startLimit.getMonth(), startLimit.getDate()).getTime();
      
      ledger = ledger.filter(entry => {
        const entryDate = new Date(entry.date);
        const entryTime = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime();
        return entryTime >= startLimitTime;
      });
    }

    res.status(200).json({ 
      goldsmithName: goldsmith.name, 
      ledger: ledger,
      currentBalances: {
        gold: runningGold
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching goldsmith statement", error });
  }
};

exports.getSupplierStatement = async (req, res) => {
  const { id } = req.params;
  const { fromDate, toDate } = req.query;

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: parseInt(id) }
    });

    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const createdAtFilter = {};
    if (toDate) createdAtFilter.lte = new Date(toDate);

    const filterObj = Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {};

    const [bcPurchases, itemPurchases, bcReceived, itemReceived, adjustments] = await Promise.all([
      prisma.purchaseEntry.findMany({ 
        where: { supplierId: parseInt(id), ...filterObj },
        include: { stock: true }
      }),
      prisma.itemPurchaseEntry.findMany({ 
        where: { supplierId: parseInt(id), ...filterObj } 
      }),
      prisma.purchaseReceivedGold.findMany({ where: { purchaseEntry: { supplierId: parseInt(id) }, ...filterObj } }),
      prisma.itemPurchaseReceivedGold.findMany({ where: { itemPurchaseEntry: { supplierId: parseInt(id) }, ...filterObj } }),
      prisma.balanceAdjustment.findMany({ where: { entityType: "SUPPLIER", entityId: parseInt(id), ...filterObj } }),
    ]);

    let ledger = [];

    const cashBal = supplier.openingBalance || 0;
    ledger.push({
      date: supplier.createdAt,
      createdAt: supplier.createdAt,
      module: cashBal < 0 ? "Excess Balance" : "Opening Balance",
      description: "Initial Balance",
      debitBC: supplier.openingBCBalance || 0,
      debitItem: supplier.openingItemBalance || 0,
      debitCash: cashBal > 0 ? cashBal : 0,
      creditCash: cashBal < 0 ? Math.abs(cashBal) : 0,
      creditBC: 0,
      creditItem: 0,
      type: "Opening",
      sortPriority: 0
    });

    bcPurchases.forEach(pe => {
      // 1. Advance part (if exists)
      if (pe.advanceGold > 0) {
        ledger.push({
          date: pe.createdAt,
          createdAt: pe.createdAt,
          module: "BC Advance",
          description: `Gold Advance Given for ${pe.jewelName}`,
          debitBC: pe.advanceGold || 0,
          creditBC: 0,
          refId: pe.id,
          sortPriority: 1
        });
      }

      // 2. Receipt part
      const wastageStr = pe.wastageType ? `, Wastage: ${pe.wastage}${pe.wastageType === "%" ? "%" : " " + pe.wastageType}` : "";
      ledger.push({
        date: pe.createdAt,
        createdAt: pe.createdAt,
        module: "BC Purchase",
        description: `Purchase: ${pe.jewelName} (Gross: ${pe.grossWeight}${wastageStr}, Purity Value: ${pe.finalPurity})`,
        debitBC: 0,
        creditBC: pe.finalPurity || 0,
        refId: pe.id,
        sortPriority: 2,
        metadata: {
            jewelName: pe.jewelName,
            grossWeight: pe.grossWeight,
            stoneWeight: pe.stoneWeight,
            netWeight: pe.netWeight,
            touch: pe.touch,
            wastage: pe.wastage,
            wastageType: pe.wastageType,
            wastagePure: pe.wastagePure,
            finalPurity: pe.finalPurity,
            items: pe.stock,
            createdAt: pe.createdAt
        }
      });
    });

    itemPurchases.forEach(ipe => {
      // 1. Advance part (if exists)
      if (ipe.advanceGold > 0) {
        ledger.push({
          date: ipe.createdAt,
          createdAt: ipe.createdAt,
          module: "Item Advance",
          description: `Gold Advance Given for ${ipe.itemName}`,
          debitItem: ipe.advanceGold || 0,
          creditItem: 0,
          refId: ipe.id,
          sortPriority: 1
        });
      }

      // 2. Receipt part
      const wastageStr = ipe.wastageType ? `, Wastage: ${ipe.wastage}${ipe.wastageType === "%" ? "%" : " " + ipe.wastageType}` : "";
      ledger.push({
        date: ipe.createdAt,
        createdAt: ipe.createdAt,
        module: "Item Purchase",
        description: `Purchase: ${ipe.itemName} (Qty: ${ipe.count}${wastageStr}, Purity Value: ${ipe.finalPurity})`,
        debitItem: 0,
        creditItem: ipe.finalPurity || 0,
        refId: ipe.id,
        sortPriority: 2,
        metadata: {
            itemName: ipe.itemName,
            count: ipe.count,
            grossWeight: ipe.grossWeight,
            stoneWeight: ipe.stoneWeight,
            netWeight: ipe.netWeight,
            touch: ipe.touch,
            wastage: ipe.wastage,
            wastageType: ipe.wastageType,
            wastagePure: ipe.wastagePure,
            finalPurity: ipe.finalPurity,
            createdAt: ipe.createdAt
        }
      });
    });

    bcReceived.forEach(prg => {
      ledger.push({
        date: prg.date,
        createdAt: prg.createdAt,
        module: "BC Paid",
        description: `Gold Received from Supplier`,
        debitBC: 0,
        creditBC: prg.weight || 0,
        refId: prg.id,
        sortPriority: 2
      });
    });

    itemReceived.forEach(iprg => {
      ledger.push({
        date: iprg.date,
        createdAt: iprg.createdAt,
        module: "Item Paid",
        description: `Gold Received from Supplier`,
        debitItem: 0,
        creditItem: iprg.weight || 0,
        refId: iprg.id,
        sortPriority: 2
      });
    });

    adjustments.forEach(a => {
      ledger.push({
        date: a.date,
        createdAt: a.createdAt || a.date,
        module: "Audit Correction",
        description: a.description || "Manual Balance Adjustment",
        debitBC: (a.bcAmount || 0) >= 0 ? Math.abs(a.bcAmount || 0) : 0,
        creditBC: (a.bcAmount || 0) < 0 ? Math.abs(a.bcAmount || 0) : 0,
        debitItem: (a.itemAmount || 0) >= 0 ? Math.abs(a.itemAmount || 0) : 0,
        creditItem: (a.itemAmount || 0) < 0 ? Math.abs(a.itemAmount || 0) : 0,
        debitCash: (a.cashAmount || 0) >= 0 ? Math.abs(a.cashAmount || 0) : 0,
        creditCash: (a.cashAmount || 0) < 0 ? Math.abs(a.cashAmount || 0) : 0,
        isManualAdjustment: true,
        sortPriority: 1
      });
    });

    // Sort for Running Balance Calculation: Opening first, then everything by actual date
    ledger.sort((a, b) => {
      if (a.sortPriority === 0) return -1;
      if (b.sortPriority === 0) return 1;

      const d1 = new Date(a.date);
      const d2 = new Date(b.date);

      // Normalize to Start of Day for day-to-day comparison
      const day1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
      const day2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();

      // Primary sort: if different days, sort chronologically
      if (day1 !== day2) return day1 - day2;

      // Secondary sort: use exact physical entry timestamp to sequence same-day actions
      const ctA = a.createdAt ? new Date(a.createdAt).getTime() : d1.getTime();
      const ctB = b.createdAt ? new Date(b.createdAt).getTime() : d2.getTime();
      
      // If physical timestamps are identical, fall back to priority
      if (ctA === ctB && (a.sortPriority || 0) !== (b.sortPriority || 0)) {
         return (a.sortPriority || 0) - (b.sortPriority || 0);
      }
      
      return ctA - ctB;
    });

    let runningBC = 0, runningItem = 0, runningCash = 0;
    ledger.forEach(entry => {
      if (entry.type === "Opening") {
        entry.beforeBC = 0; entry.beforeItem = 0; entry.beforeCash = 0;
        runningBC = (entry.debitBC || 0) - (entry.creditBC || 0);
        runningItem = (entry.debitItem || 0) - (entry.creditItem || 0);
        runningCash = (entry.debitCash || 0) - (entry.creditCash || 0);
      } else {
        entry.beforeBC = runningBC; entry.beforeItem = runningItem; entry.beforeCash = runningCash;
        runningBC += (entry.debitBC || 0) - (entry.creditBC || 0);
        runningItem += (entry.debitItem || 0) - (entry.creditItem || 0);
        runningCash += (entry.debitCash || 0) - (entry.creditCash || 0);
      }
      entry.afterBC = runningBC; entry.afterItem = runningItem; entry.afterCash = runningCash;
    });

    if (fromDate) {
      const startLimit = new Date(fromDate);
      const startLimitTime = new Date(startLimit.getFullYear(), startLimit.getMonth(), startLimit.getDate()).getTime();
      
      ledger = ledger.filter(entry => {
        const entryDate = new Date(entry.date);
        const entryTime = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate()).getTime();
        return entryTime >= startLimitTime;
      });
    }

    // RE-SORT for display: Latest at top — uses logical date, then createdAt sequence
    res.status(200).json({ 
      supplierName: supplier.name, 
      ledger: ledger,
      currentBalances: {
        bc: runningBC,
        item: runningItem,
        cash: runningCash
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching supplier statement", error });
  }
};
