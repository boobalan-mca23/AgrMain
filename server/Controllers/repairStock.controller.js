const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const recalculateBillProfit = require("../Utils/recalculateBillProfit");

const getAllRepairStock = async (req, res) => {
  try {
    const { status, goldsmith, from, to, search, source, page = 1, limit = 50 } = req.query;

    const where = { AND: [] };

    if (status && status !== "All") {
      where.AND.push({ status: { equals: status } });
    }

    if (source) {
      where.AND.push({ source });
    }

    if (goldsmith) {
      where.AND.push({ goldsmithId: Number(goldsmith) });
    }

    if (from || to) {
      const range = {};
      if (from) range.gte = new Date(from + "T00:00:00");
      if (to) range.lte = new Date(to + "T23:59:59");
      where.AND.push({ sentDate: range });
    }

    if (search?.trim()) {
      where.AND.push({
        OR: [
          { itemName: { contains: search } },
          { product: { is: { itemName: { contains: search } } } }
        ]
      });
    }

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const total = await prisma.repairStock.count({ where });

    const repairs = await prisma.repairStock.findMany({
      where,
      include: {
        product: true,
        itemPurchase: true,
        goldsmith: true,
        bill: {
          include: {
            customers: true
          }
        }
      },
      orderBy: { sentDate: "desc" },
      skip,
      take
    });

    res.json({ success: true, total, repairs });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const combineStatus = (current, action) => {
  if (!current || current === "NONE" || current === "SOLD") return action;
  if (current.includes(action)) return current;
  return `${action} (${current})`;
};


const sendToRepair = async (req, res) => {
  const { productId, goldsmithId, reason, source, repairProduct } = req.body;

  try {

    if (!productId) throw new Error("productId is required");

    if (!source || !["CUSTOMER", "GOLDSMITH", "ITEM_PURCHASE"].includes(source))
      throw new Error("Invalid source");

    const result = await prisma.$transaction(async (tx) => {

      // =================================
      // PRODUCT STOCK
      // =================================

      if (source === "GOLDSMITH") {

        const product =
          await tx.productStock.findUnique({
            where: { id: Number(productId) }
          });

        if (!product) throw new Error("Product not found");

        if (!product.isActive)
          throw new Error("Product already in repair");

        const g =
          await tx.goldsmith.findUnique({
            where: { id: Number(goldsmithId) }
          });

        if (!g) throw new Error("Invalid goldsmith");

        const existing =
          await tx.repairStock.findFirst({
            where: { productId: product.id, status: "InRepair" }
          });

        if (existing)
          throw new Error("Already in repair");

        const reqCount = Number(repairProduct?.count) || product.count;
        const reqWeight = Number(repairProduct?.weight) || product.itemWeight;
        const reqStoneWeight = Number(repairProduct?.stoneWeight) || product.stoneWeight;
        const reqNetWeight = reqWeight - reqStoneWeight;

        // Helper to calculate purity (delta)
        const getPurity = (netWt, touch, wType, wVal) => {
          const actual = (netWt * touch) / 100;
          let final = 0;
          if (wType === "Touch") final = (netWt * wVal) / 100;
          else if (wType === "%") final = (netWt + (netWt * wVal / 100)) * touch / 100;
          else if (wType === "+") final = (netWt + wVal) * touch / 100;
          else final = actual;
          return { actual, wastage: final - actual, final };
        };

        let targetProductId = product.id;

        if (reqCount < product.count) {
          // Partial Repair: Split Stock
          const remCount = product.count - reqCount;
          const remWeight = product.itemWeight - reqWeight;
          const remStone = product.stoneWeight - reqStoneWeight;
          const remNet = remWeight - remStone;
          const remPurity = getPurity(remNet, product.touch, product.wastageType, product.wastageValue);

          // Update original with remaining
          await tx.productStock.update({
            where: { id: product.id },
            data: {
              count: remCount,
              itemWeight: remWeight,
              stoneWeight: remStone,
              netWeight: remNet,
              wastagePure: remPurity.wastage,
              finalPurity: remPurity.final
            }
          });

          // Create new record for repair portion
          const repairPartPurity = getPurity(reqNetWeight, product.touch, product.wastageType, product.wastageValue);
          const repairProdRecord = await tx.productStock.create({
            data: {
              ...product,
              id: undefined,
              count: reqCount,
              itemWeight: reqWeight,
              stoneWeight: reqStoneWeight,
              netWeight: reqNetWeight,
              wastagePure: repairPartPurity.wastage,
              finalPurity: repairPartPurity.final,
              isActive: false,
              createdAt: undefined
            }
          });
          targetProductId = repairProdRecord.id;
        } else {
          // Full Repair
          await tx.productStock.update({
            where: { id: product.id },
            data: { isActive: false }
          });
        }

        const repairProductFinal = await tx.productStock.findUnique({ where: { id: targetProductId } });

        const repair = await tx.repairStock.create({
          data: {
            product: { connect: { id: targetProductId } },
            goldsmith: goldsmithId ? { connect: { id: Number(goldsmithId) } } : undefined,
            source,
            reason: reason || null,
            itemName: repairProductFinal.itemName,
            grossWeight: repairProductFinal.itemWeight,
            netWeight: repairProductFinal.netWeight,
            purity: repairProductFinal.finalPurity
          }
        });

        await tx.repairLogs.create({

          data: {

            repairId: repair.id,

            action: "SENT_TO_REPAIR",

            note: reason || null

          }

        });

        const goldsmith =
          await tx.goldsmith.findUnique({
            where: { id: Number(goldsmithId) }
          });

        await tx.goldsmith.update({

          where: { id: Number(goldsmithId) },

          data: {

            balance:
              goldsmith.balance +
              Number(product.finalPurity)

          }

        });

        return repair;
      }


      // =================================
      // ITEM PURCHASE STOCK
      // =================================

      if (source === "ITEM_PURCHASE") {

        const item =
          await tx.itemPurchaseEntry.findUnique({
            where: { id: Number(productId) }
          });

        if (!item)
          throw new Error("Item purchase entry not found");

        const g =
          await tx.goldsmith.findUnique({
            where: { id: Number(goldsmithId) }
          });

        if (!g)
          throw new Error("Invalid goldsmith");

        const reqCount = Number(repairProduct?.count) || item.count;
        const reqWeight = Number(repairProduct?.weight || repairProduct?.itemWeight) || item.grossWeight;
        const reqStoneWeight = Number(repairProduct?.stoneWeight) || item.stoneWeight;
        const reqNetWeight = reqWeight - reqStoneWeight;

        // Recalculate purity for the updated item purchase entry
        const getPurity = (netWt, touch, wType, wVal) => {
          const actual = (netWt * touch) / 100;
          let final = 0;
          if (wType === "Touch") final = (netWt * wVal) / 100;
          else if (wType === "%") final = (netWt + (netWt * wVal / 100)) * touch / 100;
          else if (wType === "+") final = (netWt + wVal) * touch / 100;
          else final = actual;
          return { actual, wastage: final - actual, final };
        };

        const updatedPurity = getPurity(reqNetWeight, item.touch, item.wastageType, item.wastage);

        let targetItemId = item.id;

        if (reqCount < item.count) {
          // Partial Repair: Split Item Purchase Entry
          const remCount = item.count - reqCount;
          const remGross = item.grossWeight - reqWeight;
          const remStone = item.stoneWeight - reqStoneWeight;
          const remNet = remGross - remStone;
          const remPurity = getPurity(remNet, item.touch, item.wastageType, item.wastage);

          // Update original with remaining
          await tx.itemPurchaseEntry.update({
            where: { id: item.id },
            data: {
              count: remCount,
              grossWeight: remGross,
              stoneWeight: remStone,
              netWeight: remNet,
              actualPure: remPurity.actual,
              wastagePure: remPurity.wastage,
              finalPurity: remPurity.final,
              // advanceGold and goldBalance are NOT changed by repair:
              // goldBalance only changes when supplier receives gold (receiveGold)
            }
          });

          // Create new record for repair portion
          const repairPartPurity = getPurity(reqNetWeight, item.touch, item.wastageType, item.wastage);
          const repairItemRecord = await tx.itemPurchaseEntry.create({
            data: {
              ...item,
              id: undefined,
              count: reqCount,
              grossWeight: reqWeight,
              stoneWeight: reqStoneWeight,
              netWeight: reqNetWeight,
              actualPure: repairPartPurity.actual,
              wastagePure: repairPartPurity.wastage,
              finalPurity: repairPartPurity.final,
              // advanceGold and goldBalance carry over from original (not recalculated per repair)
              advanceGold: item.advanceGold,
              goldBalance: item.goldBalance,
              isInRepair: true,
              isSold: false,
              isBilled: false,
              // Mark as repair split so it does NOT appear in the main entry list
              moveTo: "REPAIR_SPLIT",
              createdAt: undefined
            }
          });
          targetItemId = repairItemRecord.id;
        } else {
          // Full Repair — only mark as inRepair, don't touch goldBalance
          await tx.itemPurchaseEntry.update({
            where: { id: item.id },
            data: {
              grossWeight: reqWeight,
              stoneWeight: reqStoneWeight,
              netWeight: reqNetWeight,
              actualPure: updatedPurity.actual,
              wastagePure: updatedPurity.wastage,
              finalPurity: updatedPurity.final,
              // goldBalance stays unchanged — repair doesn't affect supplier debt
              isInRepair: true,
              isSold: false,
              isBilled: false
            }
          });
        }

        const repairItemFinal = await tx.itemPurchaseEntry.findUnique({ where: { id: targetItemId } });

        const repair =
          await tx.repairStock.create({

            data: {

              itemPurchase: { connect: { id: targetItemId } },

              goldsmith: goldsmithId ? { connect: { id: Number(goldsmithId) } } : undefined,

              source: "ITEM_PURCHASE",

              reason: reason || null,

              itemName: repairItemFinal.itemName,

              grossWeight: repairItemFinal.grossWeight,

              netWeight: repairItemFinal.netWeight,

              purity: repairItemFinal.finalPurity

            }

          });

        await tx.repairLogs.create({

          data: {

            repairId: repair.id,

            action: "ITEM_PURCHASE_SENT_TO_REPAIR",

            note: reason || null

          }

        });

        const goldsmith =
          await tx.goldsmith.findUnique({
            where: { id: Number(goldsmithId) }
          });

        await tx.goldsmith.update({

          where: { id: Number(goldsmithId) },

          data: {

            balance:
              goldsmith.balance +
              Number(repair.purity)

          }

        });

        return repair;
      }

    });

    res.json({ success: true, repair: result });

  } catch (err) {

    console.error(err.message);

    res.status(400).json({ error: err.message });

  }
};

const returnFromRepair = async (req, res) => {

  const {
    repairId,
    itemWeight,
    stoneWeight,
    wastagePure,
    wastageDelta,
    wastageValue,
    wastageType,
    returnedTo // "STOCK" or "CUSTOMER" (for order items)
  } = req.body;

  try {

    if (!repairId)
      throw new Error("repairId required");

    const result = await prisma.$transaction(async (tx) => {

      const repair =
        await tx.repairStock.findUnique({

          where: { id: Number(repairId) },

          include: {
            product: true,
            itemPurchase: true,
            goldsmith: true
          }

        });

      if (!repair)
        throw new Error("Repair not found");

      if (repair.status !== "InRepair")
        throw new Error("Already returned");

      // Define weights for comparison and split logic at the start
      const originalWeight = (Number(repair.product?.itemWeight || repair.itemPurchase?.grossWeight) || 0).toFixed(3);
      const returnedWeight = (Number(itemWeight) || 0).toFixed(3);

      const itemWt = Number(itemWeight);
      const stoneWt = Number(stoneWeight);

      if (itemWt < stoneWt)
        throw new Error("Item weight cannot be less than stone weight");


      const netWeight = itemWt - stoneWt;

      const touch =
        repair.product?.touch ??
        repair.itemPurchase?.touch ??
        0;

      const actualPurity =
        (netWeight * touch) / 100;

      const updatedWastagePure =
        Number(wastagePure);

      const computedFinalPurity =
        actualPurity + updatedWastagePure;


      // =================================
      // PRODUCT STOCK RETURN
      // =================================

      if (repair.productId) {
        // Create a NEW ProductStock record instead of updating original
        const originalProduct = await tx.productStock.findUnique({ where: { id: repair.productId } });
        
        await tx.productStock.create({
          data: {
            itemName: originalProduct?.itemName || repair.itemName,
            count: originalProduct?.count || 1,
            itemWeight: itemWt,
            stoneWeight: stoneWt,
            netWeight,
            touch: Number(touch) || 0,
            wastagePure: updatedWastagePure,
            wastageValue: Number(wastageValue) || 0,
            wastageType: wastageType || null,
            finalPurity: computedFinalPurity,
            isActive: true,
            source: "REPAIR_RETURN",
            categoryId: originalProduct?.categoryId,
            itemGroupId: originalProduct?.itemGroupId,
            unitId: originalProduct?.unitId,
          }
        });

        // Deactivate the original product that was sent to repair
        await tx.productStock.update({
          where: { id: repair.productId },
          data: { isActive: false, isBillProduct: false }
        });
      }


      // =================================
      // ITEM PURCHASE RETURN
      // =================================

      if (repair.itemPurchaseId) {
        const goldBalance = (repair.itemPurchase.advanceGold || 0) - computedFinalPurity;

        // Create a NEW ItemPurchaseEntry record instead of updating original
        await tx.itemPurchaseEntry.create({
          data: {
            itemName: repair.itemPurchase.itemName || repair.itemName,
            supplierId: repair.itemPurchase.supplierId,
            categoryId: repair.itemPurchase.categoryId,
            itemGroupId: repair.itemPurchase.itemGroupId,
            unitId: repair.itemPurchase.unitId,
            count: repair.itemPurchase.count || 1,
            touch: repair.itemPurchase.touch || 0,
            grossWeight: itemWt,
            stoneWeight: stoneWt,
            netWeight,
            actualPure: actualPurity,
            wastagePure: updatedWastagePure,
            wastage: Number(wastageValue) || 0,
            wastageType: wastageType || null,
            finalPurity: computedFinalPurity,
            goldBalance: goldBalance,
            advanceGold: repair.itemPurchase.advanceGold || 0,
            isInRepair: false,
            isSold: false,
            isBilled: false,
            source: "REPAIR_RETURN",
            moveTo: "REPAIR_RETURN",
            createdAt: new Date()
          }
        });

        // Mark the original entry as completed/sold so it doesn't show in stock
        await tx.itemPurchaseEntry.update({
          where: { id: repair.itemPurchaseId },
          data: {
            isInRepair: false,
            isSold: true,
            isBilled: true,
            moveTo: "PROCESSED_BY_REPAIR"
          }
        });
      }


      // =================================
      // UPDATE REPAIR STATUS
      // =================================

      await tx.repairStock.update({
        where: { id: repair.id },
        data: {
          status: "Returned",
          receivedDate: new Date()
        }
      });

      // Update OrderItem data if linked (Customer Item)
      // Update OrderItem status only (No weight restoration per user request)
      if (repair.orderItemId) {
        const orderItem = await tx.orderItems.findUnique({
          where: { id: repair.orderItemId },
          include: { bill: true }
        });

        if (orderItem) {
          const currentStatus = orderItem.repairStatus || "";
          let nextStatus;
          
          if (currentStatus.includes("PARTIALLY_IN_REPAIR")) {
            nextStatus = currentStatus.replace("PARTIALLY_IN_REPAIR", "PARTIALLY_REPAIRED");
          } else if (currentStatus.includes("IN_REPAIR")) {
            nextStatus = currentStatus.replace("IN_REPAIR", "REPAIRED");
          } else {
            nextStatus = combineStatus(currentStatus, "REPAIRED");
          }

          await tx.orderItems.update({
            where: { id: repair.orderItemId },
            data: { repairStatus: nextStatus }
          });
          // No customer balance update here. Customer will be billed separately for the repaired item.
        }
      }


      // =================================
      // REPAIR LOG
      // =================================

      await tx.repairLogs.create({

        data: {

          repairId: repair.id,

          action: "RETURNED_WITH_RECALCULATION"

        }

      });


      // =================================
      // GOLDsmith BALANCE UPDATE
      // =================================

      if (repair.goldsmithId) {

        const goldsmith =
          await tx.goldsmith.findUnique({

            where: { id: repair.goldsmithId }

          });

        // Goldsmith debt is reduced by the total pure gold weight returned (computedFinalPurity).
        // computedFinalPurity already includes any wastage adjustment (wastageDelta).
        const updatedBalance = goldsmith.balance - computedFinalPurity;

        await tx.goldsmith.update({
          where: { id: repair.goldsmithId },
          data: {
            balance: updatedBalance
          }
        });

      }


      return tx.repairStock.findUnique({

        where: { id: repair.id },

        include: {

          product: true,

          itemPurchase: true,

          goldsmith: true

        }

      });

    });


    res.json({

      success: true,

      repair: result

    });

  }

  catch (err) {

    console.error(err);

    res.status(400).json({

      error: err.message

    });

  }

};

const sendCustomerItemToRepair = async (req, res) => {
  const {
    billId,
    orderItemId,
    goldsmithId,
    repairProduct,
    reason
  } = req.body;

  try {
    if (!billId || !orderItemId)
      throw new Error("billId and orderItemId are required");

    const result = await prisma.$transaction(async (tx) => {

      const orderItem = await tx.orderItems.findUnique({
        where: { id: Number(orderItemId) },
        include: { bill: true }
      });

      if (!orderItem) throw new Error("Order item not found");

      // Define weights for comparison and split logic at the start
      const originalWeight = (Number(orderItem.weight) || 0).toFixed(3);
      const sentWeight = (Number(repairProduct.weight) || 0).toFixed(3);

      const repairNetWeight = Number(repairProduct.netWeight) || (Number(repairProduct.weight) - Number(repairProduct.stoneWeight));
      const repairTouch = Number(repairProduct.touch);
      const repairWastageValue = Number(repairProduct.wastageValue);
      const repairWastageType = repairProduct.wastageType;
      const actualPurityDelta = (repairNetWeight * repairTouch) / 100;

      let wastagePureDelta = 0;
      let finalPurityDelta = 0;

      if (repairWastageType === "Touch") {
        finalPurityDelta = (repairNetWeight * repairWastageValue) / 100;
        wastagePureDelta = finalPurityDelta - actualPurityDelta;

      } else if (repairWastageType === "%") {
        const wastageWeight = (repairNetWeight * repairWastageValue) / 100;
        const finalWastewt = repairNetWeight + wastageWeight;
        finalPurityDelta = (finalWastewt * repairTouch) / 100;
        wastagePureDelta = finalPurityDelta - actualPurityDelta;

      } else if (repairWastageType === "+") {
        const wastageWeight = repairNetWeight + repairWastageValue;
        finalPurityDelta = (wastageWeight * repairTouch) / 100;
        wastagePureDelta = finalPurityDelta - actualPurityDelta;
      } else {
        // Fallback or "None" case
        finalPurityDelta = actualPurityDelta;
        wastagePureDelta = 0;
      }

      let productStock;
      let repair;
      let targetOrderItemId = Number(orderItemId);

      if (orderItem.stockType === "ITEM_PURCHASE") {
        // Fetch original item purchase entry to get supplierId
        let supplierId = 1;
        let supplierName = "Unknown";

        if (orderItem.stockId) {
          const originalEntry = await tx.itemPurchaseEntry.findUnique({
            where: { id: orderItem.stockId }
          });
          if (originalEntry) {
            supplierId = originalEntry.supplierId;
            supplierName = originalEntry.supplierName;
          }
        }

        // Verify if the supplierId exists, otherwise fallback to first available
        const existingSupplier = await tx.supplier.findUnique({ where: { id: supplierId } });
        if (!existingSupplier) {
          const firstSupplier = await tx.supplier.findFirst();
          if (firstSupplier) {
            supplierId = firstSupplier.id;
            supplierName = firstSupplier.name;
          }
        }

        let targetStockId = orderItem.stockId;

        // Fallback lookup if stockId is missing (e.g. manual entry)
        if (!targetStockId) {
          const lookup = await tx.itemPurchaseEntry.findFirst({
            where: {
              itemName: orderItem.productName,
              supplierId: supplierId,
              isSold: true
            },
            orderBy: { createdAt: "desc" }
          });
          if (lookup) targetStockId = lookup.id;
        }

        if (targetStockId) {
          productStock = await tx.itemPurchaseEntry.update({
            where: { id: targetStockId },
            data: {
              isInRepair: true,
              isSold: false,
              isBilled: false,
              moveTo: "IN_REPAIR",
              // Update weights if needed
              grossWeight: Number(repairProduct.weight || repairProduct.itemWeight),
              stoneWeight: Number(repairProduct.stoneWeight),
              netWeight: Number(repairProduct.netWeight) || (Number(repairProduct.weight) - Number(repairProduct.stoneWeight)),
              actualPure: actualPurityDelta,
              wastagePure: wastagePureDelta,
              finalPurity: finalPurityDelta,
            }
          });
          console.log("SUCCESS: Linked CUSTOMER repair to existing ItemPurchaseEntry ID:", targetStockId);
        } else {
          console.log("WARNING: No original stock record found for CUSTOMER repair. Creating NEW.");
          productStock = await tx.itemPurchaseEntry.create({
            data: {
              supplierId: supplierId,
              supplierName: supplierName,
              itemName: repairProduct.productName,
              grossWeight: Number(repairProduct.weight),
              stoneWeight: Number(repairProduct.stoneWeight),
              netWeight: Number(repairProduct.netWeight) || Number(repairProduct.weight),
              finalPurity: finalPurityDelta,
              touch: Number(repairProduct.touch),
              wastageType: repairProduct.wastageType || "None",
              wastage: Number(repairProduct.wastageValue) || 0,
              wastagePure: wastagePureDelta,
              actualPure: actualPurityDelta,
              isSold: false,
              isInRepair: true,
              source: "REPAIR",
            }
          });
        }

        repair = await tx.repairStock.create({
          data: {
            itemPurchase: { connect: { id: productStock.id } },
            bill: { connect: { id: Number(billId) } },
            orderItem: { connect: { id: targetOrderItemId } },
            goldsmith: goldsmithId ? { connect: { id: Number(goldsmithId) } } : undefined,
            source: "CUSTOMER",
            reason: reason || null,
            itemName: productStock.itemName,
            grossWeight: productStock.grossWeight,
            netWeight: productStock.netWeight,
            purity: productStock.finalPurity,
          }
        });
      } else {
        productStock = await tx.productStock.create({
          data: {
            itemName: repairProduct.productName,
            itemWeight: Number(repairProduct.weight),
            stoneWeight: Number(repairProduct.stoneWeight),
            netWeight: Number(repairProduct.netWeight) || Number(repairProduct.weight),
            finalPurity: finalPurityDelta,
            count: Number(repairProduct.count) || 0,
            touch: Number(repairProduct.touch),
            wastageType: repairProduct.wastageType,
            wastageValue: Number(repairProduct.wastageValue),
            wastagePure: wastagePureDelta,
            isBillProduct: true,
            isActive: false,
            source: "REPAIR_RETURN",
          }
        });

        repair = await tx.repairStock.create({
          data: {
            product: { connect: { id: productStock.id } },
            bill: { connect: { id: Number(billId) } },
            orderItem: { connect: { id: targetOrderItemId } },
            goldsmith: goldsmithId ? { connect: { id: Number(goldsmithId) } } : undefined,
            source: "CUSTOMER",
            reason: reason || null,
            itemName: productStock.itemName,
            grossWeight: productStock.itemWeight,
            netWeight: productStock.netWeight,
            purity: productStock.finalPurity,
          }
        });
      }

      // Determine next status and weight reduction
      const isFullRepair = Number(repairProduct.count || 1) >= Number(orderItem.count) && Number(sentWeight) >= Number(originalWeight);
      const nextStatus = isFullRepair ? combineStatus(orderItem.repairStatus, "IN_REPAIR") : combineStatus(orderItem.repairStatus, "PARTIALLY_IN_REPAIR");
      
      const newWeight = Math.max(0, Number(originalWeight) - Number(sentWeight));
      const newCount = Math.max(0, (Number(orderItem.count) || 0) - (Number(repairProduct.count) || 1));
      const newStoneWeight = Math.max(0, (Number(orderItem.stoneWeight) || 0) - (Number(repairProduct.stoneWeight) || 0));
      const newNetWeight = Math.max(0, (Number(orderItem.netWeight) || 0) - Number(repairNetWeight));
      const newFinalWeight = (newNetWeight * (Number(orderItem.percentage || 0))) / 100;

      await tx.orderItems.update({
        where: { id: Number(orderItemId) },
        data: {
          repairStatus: nextStatus,
          count: newCount,
          weight: Number(newWeight.toFixed(3)),
          stoneWeight: Number(newStoneWeight.toFixed(3)),
          netWeight: Number(newNetWeight.toFixed(3)),
          afterWeight: Number(newNetWeight.toFixed(3)),
          finalWeight: Number(newFinalWeight.toFixed(3))
        }
      });

      await tx.repairLogs.create({
        data: {
          repairId: repair.id,
          action: "CUSTOMER_SENT_TO_REPAIR",
          note: reason || null
        }
      });

      // Update Bill Hallmark Quantity proportional to the count being repaired
      const hallmarkQtyInBill = Number(orderItem.bill.hallmarkQty) || 0;
      const reductionCount = Math.min(Number(repairProduct.count || 1), hallmarkQtyInBill);
      
      if (reductionCount > 0) {
        await tx.bill.update({
          where: { id: Number(billId) },
          data: { hallmarkQty: { decrement: reductionCount } }
        });
      }

      const goldsmith = await tx.goldsmith.findUnique({
        where: { id: Number(goldsmithId) }
      });

      // console.log("goldsmith-Details", goldsmith,"goldsmith-balnce", goldsmith.balance);

      // =================================
      // CUSTOMER BALANCE UPDATE
      // =================================
      const customerId = orderItem.bill.customer_id;
      if (customerId) {
        const customerBalance = await tx.customerBillBalance.findUnique({
          where: { customer_id: customerId }
        });

        if (customerBalance) {
          // Hallmark is only reduced if the product is FULLY sent for repair.
          // For ITEM_PURCHASE, it's always a full repair.
          // For Product Stock, it's full if original weight matches sent weight (isFull check).
          const isFull = orderItem.stockType === "ITEM_PURCHASE" || (Number(originalWeight) <= Number(sentWeight));

          const hallmarkRate = Number(orderItem.bill.hallMark) || 0;
          const hallmarkReduction = hallmarkRate * reductionCount;
          
          // Use finalPurity as fallback if finalWeight is not set (typical for Item Purchase items with default UI values)
          const itemFwt = Number(orderItem.finalWeight) || Number(orderItem.finalPurity) || 0;
          const repairFwt = Number(repairProduct.finalWeight) || Number(repairProduct.finalPurity) || 0;
          const fwtReduction = isFull ? itemFwt : repairFwt;

          await tx.customerBillBalance.update({
            where: { customer_id: customerId },
            data: {
              balance: customerBalance.balance - fwtReduction,
              hallMarkBal: customerBalance.hallMarkBal - hallmarkReduction
            }
          });
        }
      }

      await tx.goldsmith.update({
        where: { id: Number(goldsmithId) },
        data: {
          balance: goldsmith.balance + Number(finalPurityDelta),
        }
      });

      const updatedOrderItem = await tx.orderItems.findUnique({
        where: { id: Number(orderItemId) }
      });

      // Recalculate Bill Profits
      await recalculateBillProfit(Number(billId), tx);

      return { repair, updatedOrderItem };
    });

    res.json({
      success: true,
      msg: "Customer item sent to repair",
      repair: result.repair,
      updatedOrderItem: result.updatedOrderItem
    });

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// const sendCustomerBillToRepair = async (req, res) => {
//   const { billId, reason, goldsmithId } = req.body;

//   if (!billId) {
//     return res.status(400).json({ error: "billId is required" });
//   }

//   try {
//     await prisma.$transaction(async (tx) => {
//       const items = await tx.orderItems.findMany({
//         where: {
//           billId: Number(billId),
//           repairStatus: { not: "IN_REPAIR" }
//         }
//       });

//       if (items.length === 0) {
//         throw new Error("No items available for repair");
//       }

//       for (const item of items) {
//         let productStock;
//         let repair;

//         if (item.stockType === "ITEM_PURCHASE") {
//           productStock = await tx.itemPurchaseEntry.create({
//             data: {
//               supplierId: 1,
//               itemName: item.productName,
//               grossWeight: item.weight,
//               stoneWeight: item.stoneWeight,
//               netWeight: item.afterWeight || item.weight,
//               finalPurity: item.percentage,
//               touch: item.touch || 0,
//               wastageType: item.wastageType || "None",
//               wastage: item.wastageValue || 0,
//               wastagePure: item.wastagePure || 0,
//               actualPure: item.actualPurity || 0,
//               isSold: false,
//               isInRepair: true,
//             }
//           });

//           repair = await tx.repairStock.create({
//             data: {
//               itemPurchaseId: productStock.id,
//               goldsmithId: goldsmithId ? Number(goldsmithId) : null,
//               source: "CUSTOMER",
//               reason: reason || null,
//               itemName: productStock.itemName,
//               grossWeight: productStock.grossWeight,
//               netWeight: productStock.netWeight,
//               purity: productStock.finalPurity
//             }
//           });
//         } else {
//           productStock = await tx.productStock.create({
//             data: {
//               itemName: item.productName,
//               itemWeight: item.weight,
//               stoneWeight: item.stoneWeight,
//               netWeight: item.afterWeight || item.weight,
//               finalPurity: item.percentage,
//               count: item.count || 1,
//               touch: item.touch,
//               wastageType: item.wastageType,
//               wastageValue: item.wastageValue,
//               wastagePure: item.wastagePure,
//               isBillProduct: true,
//               isActive: false,
//               source: "REPAIR_RETURN",
//             }
//           });

//           repair = await tx.repairStock.create({
//             data: {
//               productId: productStock.id,
//               goldsmithId: goldsmithId ? Number(goldsmithId) : null,
//               source: "CUSTOMER",
//               reason: reason || null,
//               itemName: productStock.itemName,
//               grossWeight: productStock.itemWeight,
//               netWeight: productStock.netWeight,
//               purity: productStock.finalPurity
//             }
//           });
//         }

//         await tx.orderItems.update({
//           where: { id: item.id },
//           data: { repairStatus: "IN_REPAIR" }
//         });

//         await tx.repairLogs.create({
//           data: {
//             repairId: repair.id,
//             action: "CUSTOMER_BILL_SENT_TO_REPAIR",
//             note: reason || null
//           }
//         });
//       }
//     });

//     res.json({ success: true, msg: "Entire bill sent to repair" });

//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };
const sendCustomerBillToRepair = async (req, res) => {
  res.status(400).json({ error: "Full bill repair is currently disabled" });
};


module.exports = { sendCustomerBillToRepair, sendCustomerItemToRepair, getAllRepairStock, sendToRepair, returnFromRepair };
