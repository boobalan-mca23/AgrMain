 const validateField = (value, name) => {
    if (!value) return name;
    if (value < 0) return "negative value";
    if (!/^\d*\.?\d*$/.test(value)) return `valid ${name}`;
    return null;
  };
  const validatehallmark=(value,name)=>{
  
    if (value < 0) return "negative value";
    if (!/^\d*\.?\d*$/.test(value)) return `valid ${name}`;
    return null;
  }

const receiptValidation = (receipt, setReceiptErrors) => {
    // helper function

    const errors = receipt.map((item) => {
    const rowErrors = {};
    if (!item.date) rowErrors.date = "date";
    if (!item.type) rowErrors.type = "type";

    if (item.type === "Cash") {
      ["goldRate", "amount"].forEach((field) => {
        const err = validateField(item[field], field);
        if (err) rowErrors[field] = err;
      });
    }

    if (item.type === "Gold") {
      ["gold", "touch"].forEach((field) => {
        const err = validateField(item[field], field);
        if (err) rowErrors[field] = err;
      });
    }

    return rowErrors;
  });

  setReceiptErrors(errors);
  return errors.every((err) => Object.keys(err).length === 0);
};

 const receiptVoucherHallMark=(receipt,setHallMarkErrors)=>{
         const errors = receipt.map((item) => {
         const rowErrors = {};

      ["hallMark"].forEach((field) => {
        const err = validatehallmark(item[field], field);
        if (err) rowErrors[field] = err;
      });
    

    return rowErrors;
  });
  setHallMarkErrors(errors);
  return errors.every((err) => Object.keys(err).length === 0);
 }
export {
   receiptValidation,
   receiptVoucherHallMark
};