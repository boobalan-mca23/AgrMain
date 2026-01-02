const express = require("express");
const router = express.Router();

const repair = require("../Controllers/repairStock.controller");

router.get("/", repair.getAllRepairStock);

router.post("/send", repair.sendToRepair);

router.post("/return", repair.returnFromRepair);

module.exports = router;
