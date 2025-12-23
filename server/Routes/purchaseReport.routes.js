const express = require("express");
const router = express.Router();
const controller = require("../Controllers/purchaseReport.controller");

router.get("/entries-report", controller.entriesReport); // supports query params: from,to,supplierId
module.exports = router;
