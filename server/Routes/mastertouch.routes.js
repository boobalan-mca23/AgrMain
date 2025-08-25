const express = require("express");
const router = express.Router();
const masterTouchController = require("../Controllers/mastertouch.controller");

router.post("/create", masterTouchController.createTouch);
router.get("/", masterTouchController.getTouch);
router.put("/:id", masterTouchController.updateTouch);
router.delete("/:id", masterTouchController.deleteTouch);

module.exports = router;
