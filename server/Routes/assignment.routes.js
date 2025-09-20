const express = require("express");
const router = express.Router();
const {
  createJobcard,updateJobCard,getAllJobCardsByGoldsmithId,getJobCardById,getPreviousJobCardBal,
  jobCardFilter,movetoStock} = require("../Controllers/assignment.controller");

router.post("/create", createJobcard);
router.put("/:goldSmithId/:jobCardId",updateJobCard)
router.get('/:id',getAllJobCardsByGoldsmithId);
router.get('/:id/jobcard',getJobCardById);
router.get('/:id/lastBalance',getPreviousJobCardBal);
router.get("/:id/report",jobCardFilter);

module.exports = router;
