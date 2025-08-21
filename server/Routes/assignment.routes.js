const express = require("express");
const router = express.Router();
const {
  createJobcard,updateJobCard,getAllJobCardsByGoldsmithId,getJobCardById,getPreviousJobCardBal} = require("../Controllers/assignment.controller");

router.post("/create", createJobcard);
router.put("/:goldSmithId/:jobCardId",updateJobCard)
router.get('/:id',getAllJobCardsByGoldsmithId);
router.get('/:id/jobcard',getJobCardById);
router.get('/:id/lastBalance',getPreviousJobCardBal);


module.exports = router;
