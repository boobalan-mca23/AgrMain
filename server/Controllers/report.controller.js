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
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

    const filterObj = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};
    const createdAtFilter = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    // Fetch all related transactions
    const [bills, billReceived, receiptVouchers, transactions, returns, adjustments] = await Promise.all([
      prisma.bill.findMany({ where: { customer_id: parseInt(id), ...createdAtFilter }, orderBy: { date: 'asc' } }),
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
        ...createdAtFilter
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
        description: `Bill #${b.billno || b.id}${hmDesc}`,
        debitAmount: b.billAmount || 0,
        creditAmount: 0,
        debitHallmark: originalHallmarkAmt,
        creditHallmark: 0,
        refId: b.id,
        sortPriority: 2
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
            amount: rv.amount,
            goldRate: rv.goldRate,
            goldWeight: rv.gold,
            touch: rv.touch,
            purity: rv.purity,
            hallmark: rv.receiveHallMark
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
            amount: t.amount,
            goldRate: t.goldRate,
            goldWeight: t.gold,
            touch: t.touch,
            purity: t.purity
        }
      });
    });

    // Normalize Returns
    
    returns.forEach(ret => {
        console.log("ret",ret)
        const awtVal = ret.awt ?? ret.weight ?? 0;
        const pureRed = ret.pureGoldReduction ?? 0;
        const hmRed = ret.hallmarkReduction ?? 0;
        
        let desc = `Returned ${ret.productName} (Qty: ${ret.count}, Gross Wt: ${ret.weight}g, AWT: ${awtVal}g)`;
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
                weight: ret.weight,
                count: ret.count,
                stoneWeight: ret.stoneWeight,
                enteredStoneWeight: ret.enteredStoneWeight,
                awt: awtVal,
                percentage: ret.percentage,
                pureGoldReduction: pureRed,
                reason: ret.reason,
                createdAt: ret.createdAt,
                hallmarkReduction: hmRed
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

        let desc = `Sent for Repair: ${rep.itemName} (Gross Wt: ${rep.grossWeight}g, FWT: ${fwtRed.toFixed(3)}g)`;
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
                productName: rep.itemName,
                weight: rep.grossWeight,
                count: rep.orderItem?.count || 1,
                stoneWeight: rep.orderItem?.stoneWeight || 0,
                enteredStoneWeight: rep.orderItem?.enteredStoneWeight || 0,
                awt: rep.netWeight || rep.grossWeight,
                percentage: rep.orderItem?.percentage || 100,
                pureGoldReduction: fwtRed,
                reason: rep.reason,
                createdAt: rep.createdAt || rep.sentDate,
                hallmarkReduction: hmRed
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

    // RE-SORT for display: Latest at top — uses logical date, then createdAt sequence
    const sortedLedger = ledger.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        // Use logic date normalized to Day as primary key (reverse chronological)
        const dayA = Math.floor(dateA / (1000 * 60 * 60 * 24));
        const dayB = Math.floor(dateB / (1000 * 60 * 60 * 24));
        
        if (dayB !== dayA) return dayB - dayA;
        
        // Within same day, use strict entry order (Reverse Chronological: Latest Entry on top)
        const ctA = a.createdAt ? new Date(a.createdAt).getTime() : dateA;
        const ctB = b.createdAt ? new Date(b.createdAt).getTime() : dateB;
        
        if (ctB !== ctA) return ctB - ctA;
        
        // Final fallback: sortPriority
        return (b.sortPriority || 0) - (a.sortPriority || 0);
    });

    res.status(200).json({ 
      customerName: customer.name, 
      ledger: sortedLedger,
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
    if (fromDate) createdAtFilter.gte = new Date(fromDate);
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
        include: { product: true, itemPurchase: true }
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
            jobcardId: gg.jobcardId
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
            jobcardId: rs.jobcardId
        }
      });
    });

    deliveries.forEach(d => {
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
            itemWeight: d.itemWeight,
            count: d.count,
            touch: d.touch,
            netWeight: d.netWeight,
            wastagePure: d.wastagePure,
            finalPurity: d.finalPurity,
            jobcardId: d.jobcardId
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
      const isSentInRange = (!fromDate || rs.sentDate >= new Date(fromDate)) && (!toDate || rs.sentDate <= new Date(toDate));
      if (isSentInRange) {
        ledger.push({
          date: rs.sentDate,
          createdAt: rs.createdAt,
          module: "Repair (Sent)",
          description: `Repair: ${rs.itemName || "Item"} (Source: ${rs.source})`,
          debitGold: rs.purity || 0,
          creditGold: 0,
          refId: rs.id,
          sortPriority: 2,
          metadata: {
            itemName: rs.itemName,
            grossWeight: rs.grossWeight,
            purity: rs.purity,
            reason: rs.reason,
            source: rs.source
          }
        });
      }

      // 2. Returned from Repair (Credit)
      if (rs.status === "Returned" && rs.receivedDate) {
        const isReceivedInRange = (!fromDate || rs.receivedDate >= new Date(fromDate)) && (!toDate || rs.receivedDate <= new Date(toDate));
        if (isReceivedInRange) {
          ledger.push({
            date: rs.receivedDate,
            createdAt: rs.updatedAt, // Use updatedAt as high-resolution time for return
            module: "Repair (Returned)",
            description: `Returned: ${rs.itemName || "Item"}`,
            debitGold: 0,
            creditGold: rs.receivedPurity || 0,
            refId: rs.id,
            sortPriority: 2,
            metadata: {
              itemName: rs.itemName,
              receivedWeight: rs.receivedWeight,
              receivedPurity: rs.receivedPurity,
              status: rs.status
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

    // RE-SORT for display: Latest at top — uses logical date, then createdAt sequence
    const sortedLedger = ledger.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        // Use logic date normalized to Day as primary key (reverse chronological)
        const dayA = Math.floor(dateA / (1000 * 60 * 60 * 24));
        const dayB = Math.floor(dateB / (1000 * 60 * 60 * 24));
        
        if (dayB !== dayA) return dayB - dayA;
        
        // Within same day, use strict entry order (Reverse Chronological: Latest Entry on top)
        const ctA = a.createdAt ? new Date(a.createdAt).getTime() : dateA;
        const ctB = b.createdAt ? new Date(b.createdAt).getTime() : dateB;
        
        if (ctB !== ctA) return ctB - ctA;
        
        // Final fallback: sortPriority
        return (b.sortPriority || 0) - (a.sortPriority || 0);
    });

    res.status(200).json({ 
      goldsmithName: goldsmith.name, 
      ledger: sortedLedger,
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
    if (fromDate) createdAtFilter.gte = new Date(fromDate);
    if (toDate) createdAtFilter.lte = new Date(toDate);

    const filterObj = Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {};

    const [bcPurchases, itemPurchases, bcReceived, itemReceived, adjustments] = await Promise.all([
      prisma.purchaseEntry.findMany({ where: { supplierId: parseInt(id), ...filterObj } }),
      prisma.itemPurchaseEntry.findMany({ where: { supplierId: parseInt(id), ...filterObj } }),
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
      ledger.push({
        date: pe.createdAt,
        createdAt: pe.createdAt,
        module: "BC Purchase",
        description: `Purchase: ${pe.jewelName} (Gross: ${pe.grossWeight}, Prty: ${pe.actualPure})`,
        debitBC: pe.actualPure || 0,
        creditBC: 0,
        refId: pe.id,
        sortPriority: 2
      });
    });

    itemPurchases.forEach(ipe => {
      ledger.push({
        date: ipe.createdAt,
        createdAt: ipe.createdAt,
        module: "Item Purchase",
        description: `Purchase: ${ipe.itemName} (Qty: ${ipe.count}, Prty: ${ipe.actualPure})`,
        debitItem: ipe.actualPure || 0,
        creditItem: 0,
        refId: ipe.id,
        sortPriority: 2
      });
    });

    bcReceived.forEach(prg => {
      ledger.push({
        date: prg.date,
        createdAt: prg.createdAt,
        module: "BC Paid",
        description: `Gold Given to Supplier (${prg.description || "No detail"})`,
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
        description: `Gold Given to Supplier (${iprg.description || "No detail"})`,
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

    // RE-SORT for display: Latest at top — uses logical date, then createdAt sequence
    const sortedLedger = ledger.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        // Use logic date normalized to Day as primary key (reverse chronological)
        const dayA = Math.floor(dateA / (1000 * 60 * 60 * 24));
        const dayB = Math.floor(dateB / (1000 * 60 * 60 * 24));
        
        if (dayB !== dayA) return dayB - dayA;
        
        // Within same day, use strict entry order (Reverse Chronological: Latest Entry on top)
        const ctA = a.createdAt ? new Date(a.createdAt).getTime() : dateA;
        const ctB = b.createdAt ? new Date(b.createdAt).getTime() : dateB;
        
        if (ctB !== ctA) return ctB - ctA;
        
        // Final fallback: sortPriority
        return (b.sortPriority || 0) - (a.sortPriority || 0);
    });
    
    res.status(200).json({ 
      supplierName: supplier.name, 
      ledger: sortedLedger,
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
