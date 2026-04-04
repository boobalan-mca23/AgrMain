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

    // Normalize Bills
    bills.forEach(b => {
      ledger.push({
        date: b.date || b.createdAt,
        module: "Bill",
        description: `Bill #${b.billno || b.id}`,
        debitAmount: b.billAmount || 0,
        creditAmount: 0,
        debitHallmark: b.hallMark || 0,
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
        sortPriority: 2
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
        sortPriority: 2
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
        sortPriority: 2
      });
    });

    // Normalize Returns
    returns.forEach(ret => {
        ledger.push({
            date: ret.createdAt,
            createdAt: ret.createdAt,
            module: "Return",
            description: `Returned ${ret.productName} (Qty: ${ret.count})`,
            debitAmount: 0,
            creditAmount: 0,
            debitHallmark: 0,
            creditHallmark: 0,
            refId: ret.id,
            sortPriority: 2
        });
    });

    // Normalize Adjustments - Manual Balance adjustments from Master
    adjustments.forEach(a => {
      ledger.push({
        date: a.date,
        createdAt: a.date, // Use the adjustment date as sort anchor
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

    // Sort for Running Balance Calculation: Opening first, then everything else purely by date
    ledger.sort((a, b) => {
      // Always keep Opening row at the very beginning
      if (a.sortPriority === 0) return -1;
      if (b.sortPriority === 0) return 1;
      // Everything else: strict chronological order by createdAt (physical entry time)
      const ctA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
      const ctB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
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

    // RE-SORT for display: Latest at top — uses createdAt as physical entry anchor (timezone resilient)
    const sortedLedger = ledger.sort((a, b) => {
        const dA = new Date(a.date);
        const dB = new Date(b.date);
        const dayA = new Date(dA.getFullYear(), dA.getMonth(), dA.getDate()).getTime();
        const dayB = new Date(dB.getFullYear(), dB.getMonth(), dB.getDate()).getTime();
        
        // Different days: newer day first
        if (dayB !== dayA) return dayB - dayA;
        
        // Same day: use physical createdAt timestamp as tie-breaker
        const ctA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const ctB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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

    const [givenGold, receivedSections, deliveries, repairs, adjustments] = await Promise.all([
      prisma.givenGold.findMany({ where: { goldsmithId: parseInt(id), ...filterObj } }),
      prisma.receivedsection.findMany({ where: { goldsmithId: parseInt(id), ...filterObj } }),
      prisma.itemDelivery.findMany({ where: { goldsmithId: parseInt(id), ...filterObj } }),
      prisma.repair.findMany({ where: { goldsmithId: parseInt(id), ...filterObj } }),
      prisma.balanceAdjustment.findMany({ where: { entityType: "GOLDSMITH", entityId: parseInt(id), ...filterObj } }),
    ]);

    let ledger = [];

    // Opening Balance
    const openingBal = (goldsmith.initialBalance !== null) ? goldsmith.initialBalance : (goldsmith.balance || 0);
    ledger.push({
      date: goldsmith.createdAt,
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
        module: "Gold Given",
        description: `Issue to Goldsmith (Touch: ${gg.touch || 0})`,
        debitGold: gg.purity || 0,
        creditGold: 0,
        refId: gg.id,
        sortPriority: 2
      });
    });

    receivedSections.forEach(rs => {
      ledger.push({
        date: rs.createdAt,
        module: "Gold Received",
        description: `Receipt from Goldsmith (Touch: ${rs.touch || 0})`,
        debitGold: 0,
        creditGold: rs.purity || 0,
        refId: rs.id,
        sortPriority: 2
      });
    });

    deliveries.forEach(d => {
      ledger.push({
        date: d.createdAt,
        module: "Item Delivery",
        description: `Finished Item: ${d.itemName} (Net: ${d.netWeight}, Wastage: ${d.wastagePure})`,
        debitGold: 0,
        creditGold: d.finalPurity || (d.netWeight + d.wastagePure) || 0,
        refId: d.id,
        sortPriority: 2
      });
    });

    repairs.forEach(r => {
      ledger.push({
        date: r.createdAt,
        module: "Repair",
        description: "Repair Work Done",
        debitGold: 0,
        creditGold: r.netWeight || 0,
        refId: r.id,
        sortPriority: 2
      });
    });

    // Adjustments are already in 'adjustments' variable from Promise.all
    adjustments.forEach(a => {
      ledger.push({
        date: a.date,
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
      const ctA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
      const ctB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
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

    // RE-SORT for display: Latest at top — uses createdAt as physical entry anchor (timezone resilient)
    const sortedLedger = ledger.sort((a, b) => {
        const dA = new Date(a.date);
        const dB = new Date(b.date);
        const dayA = new Date(dA.getFullYear(), dA.getMonth(), dA.getDate()).getTime();
        const dayB = new Date(dB.getFullYear(), dB.getMonth(), dB.getDate()).getTime();
        if (dayB !== dayA) return dayB - dayA;
        const ctA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const ctB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (ctB !== ctA) return ctB - ctA;
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
      const ctA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
      const ctB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
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

    // RE-SORT for display: Latest at top — uses createdAt as physical entry anchor (timezone resilient)
    const sortedLedger = ledger.sort((a, b) => {
        const dA = new Date(a.date);
        const dB = new Date(b.date);
        const dayA = new Date(dA.getFullYear(), dA.getMonth(), dA.getDate()).getTime();
        const dayB = new Date(dB.getFullYear(), dB.getMonth(), dB.getDate()).getTime();
        if (dayB !== dayA) return dayB - dayA;
        const ctA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const ctB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (ctB !== ctA) return ctB - ctA;
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
