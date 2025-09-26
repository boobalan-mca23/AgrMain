const goldRowValidation = (givenGold, setGivenGoldErrors) => {
  const errors = givenGold.map((row) => {
    const rowErrors = {};
    if (!row.weight) rowErrors.weight = "weight";
    if (row.weight < 0) rowErrors.weight = "negative value";
    if (!/^\d*\.?\d*$/.test(row.weight)) {
      rowErrors.weight = "Valid weight";
    }
    if (row.touch < 0) rowErrors.touch = "negative";
    if (!row.touch) rowErrors.touch = "touch";
    if (!/^\d*\.?\d*$/.test(row.touch)) {
      rowErrors.touch = "valid touch";
    }
    return rowErrors;
  });

  setGivenGoldErrors(errors);

  // Return true if no errors found
  return errors.every((err) => Object.keys(err).length === 0);
};

const itemValidation = (itemDelivery,setItemDeliveryErrors) => {
  const errors = itemDelivery.map((row) => {
    const rowErrors = {};
    if (!row.itemName) rowErrors.itemName = "Item Name";
    if (!row.itemWeight) rowErrors.itemWeight = "weight";
    if (row.itemWeight < 0) rowErrors.itemWeight = "negative value";

    if (!/^\d*\.?\d*$/.test(row.itemWeight)) {
      rowErrors.itemWeight = "Enter valid weight";
    }
     if (row.count <= 0) rowErrors.count = "negative value";


    if (row.touch < 0) rowErrors.touch = "negative";
    if (!row.touch) rowErrors.touch = "touch";
    if (!/^\d*\.?\d*$/.test(row.touch)) {
      rowErrors.touch = "valid touch";
    }
      if (!row.wastageType) rowErrors.wastageType = "wastage Type";
      if (!row.wastageValue) rowErrors.wastageValue = "weight";
      if (row.wastageValue < 0) rowErrors.wastageValue = "negative value";

    if (!/^\d*\.?\d*$/.test(row.wastageValue)) {
      rowErrors.wastageValue = "Enter valid weight";
    }

    return rowErrors;
  });

  setItemDeliveryErrors(errors);

  // Return true if no errors found
  return errors.every((err) => Object.keys(err).length === 0);
};


const receiveRowValidation = (received, setReceivedErrors) => {
  const errors = received.map((row) => {
    const rowErrors = {};
    if (!row.weight) rowErrors.weight = "Weight";
    if (row.weight < 0) rowErrors.weight = "negative value";
    if (!/^\d*\.?\d*$/.test(row.weight)) {
      rowErrors.weight = "Enter valid weight";
    }
    if (!row.touch) rowErrors.touch = "Touch";
    if (!/^\d*\.?\d*$/.test(row.touch)) {
      rowErrors.touch = "Enter valid touch";
    }
    return rowErrors;
  });

  setReceivedErrors(errors);

  // Return true if no errors found
  return errors.every((err) => Object.keys(err).length === 0);
};

const checkAvailabilityStock = (rawGoldStock) => {
  return rawGoldStock.find((item) => item.remainingWt < 0) ||{stock:"ok"};
};

export {
  goldRowValidation,
  itemValidation,
  receiveRowValidation,
  checkAvailabilityStock

};