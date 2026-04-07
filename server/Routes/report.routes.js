const express = require("express");
const router = express.Router();
const controller = require("../Controllers/report.controller");

router.get("/statement/customer/:id", controller.getCustomerStatement);
router.get("/statement/goldsmith/:id", controller.getGoldsmithStatement);
router.get("/statement/supplier/:id", controller.getSupplierStatement);

module.exports = router;
