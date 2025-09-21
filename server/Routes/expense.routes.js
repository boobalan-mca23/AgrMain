const express=require('express')
const router=express.Router()

const expense=require('../Controllers/expenseTracker.controller')

router.post('/',expense.createExpense)
router.get('/',expense.getAllExpense)

module.exports=router