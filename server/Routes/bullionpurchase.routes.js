const express = require("express");
const router = express.Router();
const controller = require("../Controllers/bullionpurchase.controller");


router.post("/create", controller.createBullionPurchase);
router.put("/given-details/:id", controller.updateGivenDetailsOnly);
router.get("/", controller.getAllBullionPurchases);
router.delete("/delete/:id", controller.deleteBullionPurchase);

module.exports = router;
