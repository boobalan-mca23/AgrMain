const express = require("express");
const router = express.Router();
const masterItemController = require("../Controllers/masteritem.controller");

router.post("/create", masterItemController.createItem);
router.get("/", masterItemController.getItems);

module.exports = router;
