const express = require("express");
const router = express.Router();
const transactionController = require("../Controllers/transaction.controller");

router.post("/", transactionController.createTransaction);
router.get("/:customerId", transactionController.getAllTransactions);
router.put("/:id", transactionController.updateTransaction);
router.delete("/:id", transactionController.deleteTransaction);

module.exports = router;
