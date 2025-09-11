const receiptValidation = (receipt, setReceiptErrors) => {
    // helper function
  const validateField = (value, name) => {
    if (!value) return name;
    if (value < 0) return "negative value";
    if (!/^\d*\.?\d*$/.test(value)) return `valid ${name}`;
    return null;
  };

  const errors = receipt.map((item) => {
    const rowErrors = {};
    if (!item.date) rowErrors.date = "date";
    if (!item.type) rowErrors.type = "type";

    if (item.type === "Cash") {
      ["goldRate", "amount", "hallMark"].forEach((field) => {
        const err = validateField(item[field], field);
        if (err) rowErrors[field] = err;
      });
    }

    if (item.type === "Gold") {
      ["gold", "touch", "hallMark"].forEach((field) => {
        const err = validateField(item[field], field);
        if (err) rowErrors[field] = err;
      });
    }

    return rowErrors;
  });

  setReceiptErrors(errors);
  return errors.every((err) => Object.keys(err).length === 0);
};

export {
   receiptValidation
};