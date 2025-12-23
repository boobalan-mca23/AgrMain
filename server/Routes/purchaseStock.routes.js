const express = require("express");
const router = express.Router();
const controller = require("../Controllers/purchaseStock.controller");

router.get("/", controller.getAll);

router.get("/touch/:touch", controller.getByTouch);

router.get("/touch/:touch/total-wastage", controller.getTotalWastage);

router.get("/:id", controller.getOne);
router.put("/:id", controller.updateStock);
router.delete("/:id", controller.deleteStock);

module.exports = router;
