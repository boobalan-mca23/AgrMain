const express=require('express')
const router=express.Router()

const rawGold=require('../Controllers/rawGoldStock.controller')
router.get('/',rawGold.getRawGoldStock)
module.exports=router