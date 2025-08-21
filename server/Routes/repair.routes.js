const express = require("express");
const router = express.Router();

const {
  createRepair,
  getAllRepairs,
} = require("../Controllers/repair.controller");


router.post("/", createRepair);
router.get("/", getAllRepairs);

module.exports = router;
