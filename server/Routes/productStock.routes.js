const express = require("express");
const router = express.Router();
const productStock = require("../Controllers/productStock.controller");

router.post("/add-weight", productStock.addNetWeightToProduct);

router.get("/", productStock.getAllProductStock);
router.put("/:id", productStock.updateProductStock);



module.exports = router;
