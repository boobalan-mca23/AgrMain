const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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


const sendToRepair = async (req, res) => {
  const { productId, goldsmithId, reason, source } = req.body;

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

        await tx.productStock.update({
          where: { id: product.id },
          data: { isActive: false }
        });

        const repair =
          await tx.repairStock.create({

            data: {

              productId: product.id,

              goldsmithId: Number(goldsmithId),

              source,

              reason: reason || null,

              itemName: product.itemName,

              grossWeight: product.itemWeight,

              netWeight: product.netWeight,

              purity: product.finalPurity

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
            where: { id: goldsmithId }
          });

        await tx.goldsmith.update({

          where: { id: goldsmithId },

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

        await tx.itemPurchaseEntry.update({
          where: { id: item.id },
          data: { isInRepair: true }
        });

        const repair =
          await tx.repairStock.create({

            data: {

              itemPurchaseId: item.id,

              goldsmithId: Number(goldsmithId),

              source: "ITEM_PURCHASE",

              reason: reason || null,

              itemName: item.itemName,

              grossWeight: item.grossWeight,

              netWeight: item.netWeight,

              purity: item.finalPurity

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
            where: { id: goldsmithId }
          });

        await tx.goldsmith.update({

          where: { id: goldsmithId },

          data: {

            balance:
              goldsmith.balance +
              Number(item.finalPurity)

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
    wastageDelta
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

        await tx.productStock.update({

          where: { id: repair.productId },

          data: {

            itemWeight: itemWt,

            stoneWeight: stoneWt,

            netWeight,

            wastagePure: updatedWastagePure,

            finalPurity: computedFinalPurity,

            isActive: true

          }

        });

      }


      // =================================
      // ITEM PURCHASE RETURN
      // =================================

      if (repair.itemPurchaseId) {

        await tx.itemPurchaseEntry.update({

          where: { id: repair.itemPurchaseId },

          data: {

            grossWeight: itemWt,

            stoneWeight: stoneWt,

            netWeight,

            wastagePure: updatedWastagePure,

            finalPurity: computedFinalPurity,

            isInRepair: false,

            moveTo: "REPAIR_RETURN"

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

      // Update OrderItem status if linked
      if (repair.orderItemId) {
        await tx.orderItems.update({
          where: { id: repair.orderItemId },
          data: { repairStatus: "REPAIRED" }
        });
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

        repair = await tx.repairStock.create({
          data: {
            itemPurchaseId: productStock.id,
            billId: Number(billId),
            orderItemId: Number(orderItemId),
            goldsmithId: goldsmithId ? Number(goldsmithId) : null,
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
            productId: productStock.id,
            billId: Number(billId),
            orderItemId: Number(orderItemId),
            goldsmithId: goldsmithId ? Number(goldsmithId) : null,
            source: "CUSTOMER",
            reason: reason || null,
            itemName: productStock.itemName,
            grossWeight: productStock.itemWeight,
            netWeight: productStock.netWeight,
            purity: productStock.finalPurity,
          }
        });
      }

      // Split logic to support partial repairs
      let repairOrderItemId = orderItem.id;

      if (orderItem.stockType !== "ITEM_PURCHASE" && Number(originalWeight) > Number(sentWeight)) {
        // Partial Repair: Deduct from original
        const remainingWeight = originalWeight - sentWeight;
        const remainingStoneWeight = (Number(orderItem.stoneWeight) || 0) - (Number(repairProduct.stoneWeight) || 0);
        const remainingNetWeight = (Number(orderItem.netWeight) || 0) - (Number(repairProduct.netWeight) || 0);
        const remainingCount = (Number(orderItem.count) || 0) - (Number(repairProduct.count) || 0);

        // Recalculate purities for the remaining item
        const remActualPurity = (remainingNetWeight * Number(orderItem.touch || 0)) / 100;
        let remWastagePure = 0;  // clear that the item is no longer "active" on that bill.
        let remFinalPurity = 0;

        if (orderItem.wastageType === "Touch") {
          remFinalPurity = (remainingNetWeight * Number(orderItem.wastageValue || 0)) / 100;
          remWastagePure = remFinalPurity - remActualPurity;
        } else if (orderItem.wastageType === "%") {
          const wWeight = (remainingNetWeight * Number(orderItem.wastageValue || 0)) / 100;
          remFinalPurity = ((remainingNetWeight + wWeight) * Number(orderItem.touch || 0)) / 100;
          remWastagePure = remFinalPurity - remActualPurity;
        } else if (orderItem.wastageType === "+") {
          remFinalPurity = ((remainingNetWeight + Number(orderItem.wastageValue || 0)) * Number(orderItem.touch || 0)) / 100;
          remWastagePure = remFinalPurity - remActualPurity;
        }

        let newStatus = "PARTIAL_REPAIR";
        if (orderItem.repairStatus === "PARTIAL_RETURN") {
          newStatus = "PARTIAL_REPAIR_RETURN";
        }

        // 1. Update original item remaining values (keeping to 3 decimal places)
        await tx.orderItems.update({
          where: { id: Number(orderItemId) },
          data: {
            weight: Number(remainingWeight.toFixed(3)),
            stoneWeight: Number(remainingStoneWeight.toFixed(3)),
            netWeight: Number(remainingNetWeight.toFixed(3)),
            afterWeight: Number(remainingNetWeight.toFixed(3)),
            count: remainingCount,
            actualPurity: Number(remActualPurity.toFixed(3)),
            wastagePure: Number(remWastagePure.toFixed(3)),
            finalPurity: Number(remFinalPurity.toFixed(3)),
            finalWeight: Number(((remainingNetWeight * Number(orderItem.percentage || 0)) / 100).toFixed(3)),
            repairStatus: newStatus
          }
        });

      } else {
        // Full Repair
        await tx.orderItems.update({
          where: { id: Number(orderItemId) },
          data: { repairStatus: "IN_REPAIR" }
        });
      }


      await tx.repairLogs.create({
        data: {
          repairId: repair.id,
          action: "CUSTOMER_SENT_TO_REPAIR",
          note: reason || null
        }
      });

      const goldsmith = await tx.goldsmith.findUnique({
        where: { id: goldsmithId }
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
          const hallmarkReduction = isFull ? hallmarkRate : 0;
          const fwtReduction = isFull ? (Number(orderItem.finalWeight) || 0) : Number(repairProduct.finalWeight);

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
        where: { id: goldsmithId },
        data: {
          balance: goldsmith.balance + Number(finalPurityDelta),
        }
      });

      const updatedOrderItem = await tx.orderItems.findUnique({
        where: { id: Number(orderItemId) }
      });

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
