const express=require('express')
const router=express.Router()

const receipt=require("../Controllers/receipt.controller")

router.post('/',receipt.createReceipt)
router.get("/:id/report",receipt.receiptFilter);
module.exports=router