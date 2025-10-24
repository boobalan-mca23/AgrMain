const safeParse = (val) => (isNaN(parseFloat(val)) ? 0 : parseFloat(val));

export const jobCardBalance=( openingBalance,
    totalInputPurityGiven,
    totalFinishedPurity,
    totalReceivedPurity)=>{
        const balance =
      safeParse(openingBalance) >= 0
        ? safeParse(totalInputPurityGiven) + safeParse(openingBalance)
        : safeParse(openingBalance) + safeParse(totalInputPurityGiven); // we need to add openbalance and givenGold

    let difference = balance - safeParse(totalFinishedPurity); // total item delivery

  
      const totalReceived = totalReceivedPurity;

      difference -= totalReceived;
    
    console.log('diffrence',difference)
    return difference
  }