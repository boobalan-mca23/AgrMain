const checkCashOrGold=(payload,setGoldCashError)=>{
    const errors={}

    if(payload.type==="Gold"){
      
        if(payload.goldValue<=0){
        errors.goldValue="Gold Value must be Greater than 0 !"
      }
       if(payload.touch<=0){
        errors.touch="Touch must be Greater than 0 !"
      }
       if (!/^\d+(\.\d+)?$/.test(payload.touch)) {
        errors.touch = "Only positive numeric values allowed !";
       }

    }else{
     
      if(payload.cashAmount<=0){
        errors.cashAmount="cashAmount must be Greater than 0 !"
      }
      if(payload.goldRate<=0){
         errors.goldRate="goldRate must be Greater than 0 !"
      }
      }
    setGoldCashError(errors)
    return errors
}

const checkTransaction=(payload,setGoldCashError)=>{
    const errors={}

    if(payload.type==="Gold"){
      
        if(payload.gold<=0){
        errors.gold="Gold Value must be Greater than 0 !"
      }
    }else{
     
      if(payload.amount<=0){
        errors.amount="cashAmount must be Greater than 0 !"
      }
      if(payload.goldRate<=0){
         errors.goldRate="goldRate must be Greater than 0 !"
      }
      }
    setGoldCashError(errors)
    return errors
}


const checkExpense=(dataToValidate,setExpenseError)=>{
  
   const errors={}
     
    if(!dataToValidate.expenseDate) errors.expenseDate="Date is Required"
    if(!dataToValidate.gold) errors.gold="Gold Value is Required"
    if(dataToValidate.gold<=0) errors.gold="Gold Value Should be Greater Than 0"
    if(!dataToValidate.touch) errors.touch="Touch is Required"

    setExpenseError(errors)
    return errors
}
export{
    checkCashOrGold,
    checkExpense,
    checkTransaction
}