const express = require("express");
const router = express.Router();
const controller = require("../Controllers/purchaseEntry.controller");

router.post("/create", controller.createEntry);
router.get("/purity-summary", controller.getPuritySummary);
router.get("/", controller.getEntries);
router.get("/:id", controller.getEntryById);
router.put("/:id", controller.updateEntry);
router.delete("/:id", controller.deleteEntry);
router.post("/receive-gold", controller.receiveGold);
router.put("/receive-gold/:id", controller.updateReceivedGold);
router.delete("/receive-gold/:id", controller.deleteReceivedGold);

module.exports = router;
