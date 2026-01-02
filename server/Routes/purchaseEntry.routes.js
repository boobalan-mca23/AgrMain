const express = require("express");
const router = express.Router();
const controller = require("../Controllers/purchaseEntry.controller");

router.post("/create", controller.createEntry);
router.get("/", controller.getEntries);
router.get("/:id", controller.getEntryById);
router.put("/:id", controller.updateEntry);
router.delete("/:id", controller.deleteEntry);

module.exports = router;
