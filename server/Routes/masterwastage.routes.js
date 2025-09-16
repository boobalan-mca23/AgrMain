const express = require("express");
const router = express.Router();
const masterWastageController = require("../Controllers/masterwastage.controller");
 
router.post("/create", masterWastageController.createWastage);
router.get("/", masterWastageController.getWastage);
router.put("/:id", masterWastageController.updateWastage);
router.delete("/:id", masterWastageController.deleteWastage);
 
module.exports = router;