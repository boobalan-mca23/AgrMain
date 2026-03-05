const express = require("express");

const router = express.Router();

const controller = require("../Controllers/itemPurchaseController");


router.post("/create", controller.createEntry);

router.get("/", controller.getEntries);

router.put("/:id", controller.updateEntry);

router.delete("/:id", controller.deleteEntry);

router.get("/report", controller.getItemPurchaseReport);

router.get("/stock", controller.getItemPurchaseStock);

router.get("/itemstock", controller.itemPurchaseStock);

router.get("/stock/touch/:touch", controller.getStockByTouch);

router.put("/stock/reduce", controller.reduceStockWeight);

router.put("/sold/:id", controller.markItemSold);

module.exports = router;
