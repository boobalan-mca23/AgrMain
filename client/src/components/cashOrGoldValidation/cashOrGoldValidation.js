const checkCashOrGold=(payload,setGoldCashError)=>{
    const errors={}

    if(payload.type==="Gold"){
      
        if(payload.goldValue<=0){
        errors.goldValue="Gold Value must be Greater than 0"
      }
    }else{
     
      if(payload.cashAmount<=0){
        errors.cashAmount="cashAmount must be Greater than 0"
      }
      if(payload.goldRate<=0){
         errors.goldRate="goldRate must be Greater than 0"
      }
     
    }

    setGoldCashError(errors)
    return errors
}
export{
    checkCashOrGold
}