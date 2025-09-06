const express=require('express')
const router=express.Router()

const bill=require("../Controllers/bill.controllers")

router.post('/',bill.createBill)
router.put('/updateBill/:customerId/:billId',bill.updateBill)
router.get('/customerBill/:customerId',bill.getBillByCustomer)
router.get('/:billId',bill.getBillById)
router.get('/',bill.geAllBill)


module.exports=router