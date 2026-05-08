const express=require('express')
const router=express.Router()

const expense=require('../Controllers/expenseTracker.controller')

router.post('/',expense.createExpense)
router.get('/',expense.getAllExpense)
router.put('/:id', expense.updateExpense)
router.delete('/:id', expense.deleteExpense)

module.exports=router