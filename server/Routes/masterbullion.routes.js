const express = require("express");
const router = express.Router();
const masterbullion = require("../Controllers/masterbullion.controller");


router.post("/create", masterbullion.createBullion);
router.get("/", masterbullion.getAllBullion);
router.get("/:id", masterbullion.getBullionById);
router.put("/:id",masterbullion.updateBullion);
router.delete("/:id",masterbullion.deleteBullion);

module.exports = router;
