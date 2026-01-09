const express = require("express");
const router = express.Router();

const repair = require("../Controllers/repairStock.controller");

router.get("/", repair.getAllRepairStock);

router.post("/customer-send", repair.sendCustomerItemToRepair);
router.post("/customer-bill-send", repair.sendCustomerBillToRepair);
router.post("/send", repair.sendToRepair);

router.post("/return", repair.returnFromRepair);

module.exports = router;
