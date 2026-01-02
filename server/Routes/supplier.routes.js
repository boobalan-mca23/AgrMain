const express = require("express");
const router = express.Router();
const controller = require("../Controllers/supplier.controller");

router.post("/create", controller.createSupplier);
router.get("/", controller.getSuppliers);
router.get("/:id", controller.getSupplierById);
router.put("/:id", controller.updateSupplier);
router.delete("/:id", controller.deleteSupplier);

module.exports = router;
