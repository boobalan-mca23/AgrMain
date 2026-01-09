const express = require("express");
const router = express.Router();

const returns = require("../Controllers/returnStock.controller");

router.post("/customer-item-return", returns.returnCustomerItem);
router.post("/customer-bill-return", returns.returnCustomerBill);
router.get("/logs", returns.getReturnedProducts);
router.get("/return-stock", returns.getReturnedStock);

module.exports = router;
