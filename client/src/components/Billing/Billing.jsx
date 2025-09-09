import React, { useState, useEffect } from "react";
import {
  Autocomplete,
  TextField,
  Box,
  Button,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { MdDeleteForever } from "react-icons/md";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./Billing.css";

const Billing = () => {
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [availableproducts, setAvailableProducts] = useState(null);
  const [originalProducts, setOriginalProducts] = useState(null);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [prevHallmark, setPrevHallmark] = useState(0);
  const [billId] = useState(1);
  const [date] = useState(new Date().toLocaleDateString("en-IN"));
  const [time] = useState(
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
  const [weightAllocations, setWeightAllocations] = useState({});
  const [selectedFilter, setSelectedFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [rows, setRows] = useState([]);
  const [billDetailRows, setBillDetailRows] = useState([]);
  const [billHallmark, setBillHallmark] = useState("");

  const validateInput = (
    value,
    fieldName,
    rowIndex,
    fieldType,
    inputType = "number"
  ) => {
    const fieldKey = `${fieldType}_${rowIndex}_${fieldName}`;
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldKey];
      return newErrors;
    });

    if (value === "") {
      return value;
    }

    switch (inputType) {
      case "number": {
        const numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue < 0) {
          setFieldErrors((prev) => ({
            ...prev,
            [fieldKey]: "Please enter a valid positive number",
          }));
          return value;
        }
        break;
      }
      case "text":
        if (typeof value !== "string" || value.trim() === "") {
          setFieldErrors((prev) => ({
            ...prev,
            [fieldKey]: "This field cannot be empty",
          }));
          return value;
        }
        break;
      case "date": {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          setFieldErrors((prev) => ({
            ...prev,
            [fieldKey]: "Please enter a valid date",
          }));
          return value;
        }
        break;
      }
      default:
        break;
    }

    return value;
  };

  const validateAllFields = () => {
    let isValid = true;
    let newErrors = {};

    if (billDetailRows.length === 0 && rows.length === 0) {
      alert("Please add at least one Bill Detail or Received Detail before saving.");
      return false;
    }

    if (billDetailRows.length > 0) {
      billDetailRows.forEach((row, index) => {
        if (!row.productName || row.productName.trim() === "") {
          newErrors[`billDetail_${index}_productName`] = "Product name is required";
          isValid = false;
        }
        if (!row.wt || parseFloat(row.wt) <= 0) {
          newErrors[`billDetail_${index}_wt`] = "Weight is required";
          isValid = false;
        }
        if (!row.percent || parseFloat(row.percent) <= 0) {
          newErrors[`billDetail_${index}_percent`] = "Percentage is required";
          isValid = false;
        }
      });
    }

    if (rows.length > 0) {
      rows.forEach((row, index) => {
        if (!row.date) {
          newErrors[`receivedDetail_${index}_date`] = "Date is required";
          isValid = false;
        }

        if (row.type === "GoldRate") {
          if (!row.goldRate) {
            newErrors[`receivedDetail_${index}_goldRate`] = "Gold rate is required";
            isValid = false;
          }
          if (!row.amount) {
            newErrors[`receivedDetail_${index}_amount`] = "Amount is required";
            isValid = false;
          }
        } else if (row.type === "Gold") {
          if (!row.givenGold) {
            newErrors[`receivedDetail_${index}_givenGold`] = "Gold is required";
            isValid = false;
          }
          if (!row.touch) {
            newErrors[`receivedDetail_${index}_touch`] = "Touch is required";
            isValid = false;
          }
        } else {
          // type empty -> require at least one valid combination
          const hasGoldRateCombo = row.goldRate && row.amount;
          const hasGoldCombo = row.givenGold && row.touch;
          if (!hasGoldRateCombo && !hasGoldCombo) {
            newErrors[`receivedDetail_${index}_goldRate`] =
              "Fill GoldRate & Amount OR select Gold and fill Gold & Touch";
            newErrors[`receivedDetail_${index}_amount`] =
              "Fill GoldRate & Amount OR select Gold and fill Gold & Touch";
            newErrors[`receivedDetail_${index}_givenGold`] =
              "Fill Gold & Touch OR select GoldRate and fill GoldRate & Amount";
            newErrors[`receivedDetail_${index}_touch`] =
              "Fill Gold & Touch OR select GoldRate and fill GoldRate & Amount";
            isValid = false;
          }
        }

        if (!row.hallmark) {
          newErrors[`receivedDetail_${index}_hallmark`] = "Hallmark is required";
          isValid = false;
        }
      });
    }

    setFieldErrors(newErrors);
    return isValid;
  };

  const handleNumericInput = (e, callback) => {
    const value = e.target.value;
    const numericPattern = /^[0-9]*\.?[0-9]*$/;
    if (numericPattern.test(value) || value === "") {
      callback(e);
    }
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        type: "Gold",
        goldRate: "",
        givenGold: "",
        touch: "",
        purityWeight: "",
        amount: "",
        hallmark: "",
      },
    ]);
  };

  // const handleDeleteRow = (index)  => {
  //   try {
  //   var x = window.confirm("Sure you want to delete this row?");
  //   if(x){
  //     const updated = [...rows];
  //     updated.splice(index, 1);
  //     setRows(updated);
  //     }else{
  //       console.log("cancelled deletion");
  //     }}catch(err){
  //       console.log("Error in Deleting Row",err);
  //     }
  //   }

    const handleDeleteRow = (index) => {
      const confirmed = window.confirm("Sure you want to delete this row?");
      if (!confirmed) return console.log("Cancelled deletion");

      setRows(prevRows => prevRows.filter((_, i) => i !== index));
    };


  const handleAddBillDetailRow = () => {
    setBillDetailRows([
      ...billDetailRows,
      {
        id: Date.now() + Math.random(),
        productId: "",
        productName: "",
        wt: "",
        stWt: "",
        awt: "",
        percent: "",
        fwt: "",
      },
    ]);
  };

  const handleDeleteBillDetailRow = (index) => {
     try {
    const isdelete = window.confirm("Sure you want to delete this row?");
    if(isdelete){
    const rowToDelete = billDetailRows[index];
    if (rowToDelete.productId && rowToDelete.id) {
      const newAllocations = { ...weightAllocations };
      if (newAllocations[rowToDelete.productId]) {
        delete newAllocations[rowToDelete.productId][rowToDelete.id];
        if (Object.keys(newAllocations[rowToDelete.productId]).length === 0) {
          delete newAllocations[rowToDelete.productId];
        }
      }
      setWeightAllocations(newAllocations);
    }
    const updated = [...billDetailRows];
    updated.splice(index, 1);
    setBillDetailRows(updated);
  }else{
    console.log("cancelled deletion");
  }}catch(err){
    console.log("Error in Deleting Row",err);
  }
  };

  const handleBillDetailChange = (index, field, value) => {
    const validatedValue = validateInput(
      value,
      field,
      index,
      "billDetail",
      field === "productName" ? "text" : "number"
    );
    const updated = [...billDetailRows];
    const currentRow = updated[index];
    updated[index][field] = validatedValue;
    const wt = parseFloat(updated[index].wt) || 0;
    const stWt = parseFloat(updated[index].stWt) || 0;
    const percent = parseFloat(updated[index].percent) || 0;
    const awt = wt - stWt;
    updated[index].awt = awt.toFixed(3);
    updated[index].fwt = ((awt * percent) / 100).toFixed(3);

    if (field === "wt" && currentRow.productId) {
      const newAllocations = { ...weightAllocations };
      if (!newAllocations[currentRow.productId]) {
        newAllocations[currentRow.productId] = {};
      }
      newAllocations[currentRow.productId][currentRow.id] = wt;
      setWeightAllocations(newAllocations);
    }

    if (field === "productName") {
      const newAllocations = { ...weightAllocations };
      if (currentRow.productId) {
        if (newAllocations[currentRow.productId] && newAllocations[currentRow.productId][currentRow.id]) {
          delete newAllocations[currentRow.productId][currentRow.id];
          if (Object.keys(newAllocations[currentRow.productId]).length === 0) {
            delete newAllocations[currentRow.productId];
          }
        }
      }
      const selectedItem = items.find((item) => item.itemName === value);
      if (selectedItem) {
        updated[index].productId = selectedItem._id;
        if (wt > 0) {
          if (!newAllocations[selectedItem._id]) {
            newAllocations[selectedItem._id] = {};
          }
          newAllocations[selectedItem._id][currentRow.id] = wt;
        }
      } else {
        updated[index].productId = "";
      }
      setWeightAllocations(newAllocations);
    }

    setBillDetailRows(updated);
  };

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];

    if (field === "type") {
      updatedRows[index].type = value;

      // clear the opposite fields when type is selected
      if (value === "GoldRate") {
        updatedRows[index].givenGold = "";
        updatedRows[index].touch = "";
      } else if (value === "Gold") {
        updatedRows[index].goldRate = "";
        updatedRows[index].amount = "";
      }
      // recalc purity
      const goldRateVal = parseFloat(updatedRows[index].goldRate) || 0;
      const givenGoldVal = parseFloat(updatedRows[index].givenGold) || 0;
      const touchVal = parseFloat(updatedRows[index].touch) || 0;
      const amountVal = parseFloat(updatedRows[index].amount) || 0;
      let calculatedPurity = 0;
      if (goldRateVal > 0 && amountVal > 0) calculatedPurity = amountVal / goldRateVal;
      else if (givenGoldVal > 0 && touchVal > 0) calculatedPurity = givenGoldVal * (touchVal / 100);
      updatedRows[index].purityWeight = calculatedPurity.toFixed(3);
      setRows(updatedRows);
      return;
    }

    let inputType = "number";
    if (field === "date") inputType = "date";

    const validatedValue = validateInput(value, field, index, "receivedDetail", inputType);
    updatedRows[index][field] = validatedValue;

    const goldRate = parseFloat(updatedRows[index].goldRate) || 0;
    const givenGold = parseFloat(updatedRows[index].givenGold) || 0;
    const touch = parseFloat(updatedRows[index].touch) || 0;
    const amount = parseFloat(updatedRows[index].amount) || 0;

    let calculatedPurity = 0;
    if (goldRate > 0 && amount > 0) calculatedPurity = amount / goldRate;
    else if (givenGold > 0 && touch > 0) calculatedPurity = givenGold * (touch / 100);

    updatedRows[index].purityWeight = calculatedPurity.toFixed(3);
    if (field === "hallmark") updatedRows[index].hallmark = value;

    setRows(updatedRows);
  };

  const getRemainingWeight = (productId, originalWeight) => {
    if (!weightAllocations[productId]) return originalWeight;
    const totalAllocated = Object.values(weightAllocations[productId]).reduce(
      (sum, weight) => sum + (parseFloat(weight) || 0),
      0
    );
    return Math.max(0, originalWeight - totalAllocated);
  };

  const handleProductClick = (product) => {
    const productId = `${product.itemName}_${product.itemWeight}_${product.touch}`;
    const remainingWeight = getRemainingWeight(productId, product.itemWeight);
    if (remainingWeight <= 0) {
      alert(`No remaining weight available for ${product.itemName}`);
      return;
    }
    const newRow = {
      id: Date.now() + Math.random(),
      productId: productId,
      productName: product.itemName,
      wt: remainingWeight.toString(),
      stWt: "0",
      awt: remainingWeight.toString(),
      percent: "100",
      fwt: remainingWeight.toString(),
    };
    const newAllocations = { ...weightAllocations };
    if (!newAllocations[productId]) newAllocations[productId] = {};
    newAllocations[productId][newRow.id] = remainingWeight;
    setWeightAllocations(newAllocations);
    setBillDetailRows([...billDetailRows, newRow]);
  };

    const handleSave = async () => {
      if (!selectedCustomer) {
        alert("Please select a customer before saving.");
        return;
      }
      const isFormValid = validateAllFields();
      if (!isFormValid) {
        alert("Please fill in all required fields");
        return;
      }
      try {
                const billData = {
          customerId: selectedCustomer.id,                     
          billTotal:  FWT,                                 
          hallMark: parseFloat(billHallmark) || 0,
          pureBalance:(TotalFWT - totalReceivedPurity).toFixed(3),
   	      hallmarkBalance:hallmarkBalance + prevHallmark,
          orderItems: billDetailRows.map((row) => ({           
            productName: row.productName,
            weight: parseFloat(row.wt) || 0,
            stoneWeight: parseFloat(row.stWt) || 0,
            afterWeight: parseFloat(row.awt) || 0,
            percentage: parseFloat(row.percent) || 0,
            finalWeight: parseFloat(row.fwt) || 0,
          })),
          received: rows.map((row) => ({                    
            date: row.date,
            goldRate: parseFloat(row.goldRate) || 0,
            gold: parseFloat(row.givenGold) || 0,
            touch: parseFloat(row.touch) || 0,
            purity: parseFloat(row.purityWeight) || 0,
            receiveHallMark: parseFloat(row.hallmark) || 0,
            amount: parseFloat(row.amount) || 0,
          })),
        };


        console.log("Payload being sent:", billData);
        const response = await fetch(`${BACKEND_SERVER_URL}/api/bill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(billData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Bill saved successfully:", result);
        alert("Bill saved successfully!");
        setBillDetailRows([]);
        setRows([]);
        setSelectedCustomer(null);
        setBillHallmark("");
        setWeightAllocations({});
        setFieldErrors({});
      } catch (error) {
        console.error("Error saving bill:", error);
        alert(`Error saving bill: ${error.message}`);
      }
    };

  const FWT = billDetailRows.reduce((total, row) => total + (parseFloat(row.fwt) || 0), 0);
  const totalReceivedPurity = rows.reduce((acc, row) => acc + (parseFloat(row.purityWeight) || 0), 0);
  const TotalFWT = FWT - previousBalance;
  const pureBalance = TotalFWT - totalReceivedPurity;
  const lastGoldRate = [...rows].reverse().find((row) => parseFloat(row.goldRate))?.goldRate;
  const cashBalance = lastGoldRate ? (parseFloat(lastGoldRate) * pureBalance).toFixed(2) : "0.00";
  const totalBillHallmark = parseFloat(billHallmark) || 0;
  const totalReceivedHallmark = rows.reduce((total, row) => total + (parseFloat(row.hallmark) || 0), 0);
  const hallmarkBalance = totalBillHallmark - totalReceivedHallmark;

  const handleSearch = (e) => {
    const searchValue = e.target.value.toLowerCase();
    setSearchTerm(searchValue);
    applyFilters(searchValue, selectedFilter);
  };

  const handleFilterChange = (e) => {
    const filterValue = e.target.value;
    setSelectedFilter(filterValue);
    applyFilters(searchTerm, filterValue);
  };

  const applyFilters = (search, filter) => {
    if (!originalProducts) return;
    let filtered = originalProducts.allStock;
    if (filter) filtered = filtered.filter((product) => product.itemName === filter);
    if (search) {
      filtered = filtered.filter(
        (product) => product.itemName.toLowerCase().includes(search) || product.touch.toString().toLowerCase().includes(search)
      );
    }
    setAvailableProducts({ allStock: filtered });
  };

  const getUniqueProductNames = () => {
    if (!originalProducts) return [];
    const uniqueNames = [...new Set(originalProducts.allStock.map((product) => product.itemName))];
    return uniqueNames.sort();
  };


    const inputStyle = {
      minWidth: "70px",        
      width: "100%",           
      padding: "6px 8px",
      fontSize: "13px",
      height: "32px",
      boxSizing: "border-box",
    };


  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/customers`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };

    const fecthItems = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/master-items`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    const fetchProductStock = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/productStock`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setAvailableProducts(data);
        setOriginalProducts(data);
      } catch (error) {
        console.error("Error fetching Available Products:", error);
      }
    };

    fetchProductStock();
    fecthItems();
    fetchCustomers();
  }, []);

  // Determine which Received columns to show (keeps header + rows aligned)
  const showGoldRateColumn = rows.length === 0 ? true : rows.some((r) => r.type === "" || r.type === "GoldRate");
  const showGivenGoldColumn = rows.length === 0 ? true : rows.some((r) => r.type === "" || r.type === "Gold");
  const showTouchColumn = showGivenGoldColumn;
  const showAmountColumn = rows.length === 0 ? true : rows.some((r) => r.type === "" || r.type === "GoldRate");

  // compute colspan for "no rows" message
  const visibleReceivedCols = 1 /*S.No*/ + 1 /*Date*/ + 1 /*Type*/ + (showGoldRateColumn ? 1 : 0) + (showGivenGoldColumn ? 1 : 0) + (showTouchColumn ? 1 : 0) + 1 /*Purity*/ + (showAmountColumn ? 1 : 0) + 1 /*Hallmark*/ + 1 /*Action*/;

  return (
    <Box className="billing-wrapper">
      <Box className="left-panel" style={{ width: "65%" }}>
        <h1 className="heading">Estimate Only</h1>
        <Box className="bill-header">
          <Box className="bill-number">
            <p>
              <strong>Bill No:</strong> {billId}
            </p>
          </Box>
          <Box className="bill-info">
            <p>
              <strong>Date:</strong> {date}
              <br />
              <br />
              <strong>Time:</strong> {time}
            </p>
          </Box>
        </Box>

        <Box className="search-section no-print">
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option.name || ""}
            onChange={(_, newValue) => {
              setSelectedCustomer(newValue);
              if (newValue){
                // console.log('newValue',newValue)
                // console.log('balance',newValue.customerBillBalance.balance)
                // console.log('hallMarkBal',newValue.customerBillBalance.hallMarkBal)
                setPreviousBalance(newValue.customerBillBalance.balance);
                setPrevHallmark(newValue.customerBillBalance.hallMarkBal || 0);
              } else {
                setPreviousBalance(0);
                setPrevHallmark(0);
              }
            }}
            value={selectedCustomer}
            renderInput={(params) => (
              <TextField {...params} style={{ width: "15rem" }} label="Select Customer" variant="outlined" size="small" />
            )}
          />
        </Box>

        {selectedCustomer && (
          <Box className="customer-details">
            <h3 className="no-print">Customer Details:</h3>
            <p>
              <strong>Name:</strong> {selectedCustomer.name}{" "}
            </p>
          </Box>
        )}

        <Box className="items-section">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Bill Details:</h3>
          </Box>

          <Table className="table" style={{ marginTop: "10px" }}>
            <TableHead>
              <TableRow>
                <TableCell className="th">S.No</TableCell>
                <TableCell className="th">Product Name</TableCell>
                <TableCell className="th">Wt</TableCell>
                <TableCell className="th">St.WT</TableCell>
                <TableCell className="th">AWT</TableCell>
                <TableCell className="th">%</TableCell>
                <TableCell className="th">FWT</TableCell>
                <TableCell className="th no-print">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {billDetailRows.length > 0 ? (
                billDetailRows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="td">{index + 1}</TableCell>
                    <TableCell className="td">
                      <TextField size="small" value={row.productName} onChange={(e) => handleBillDetailChange(index, "productName", e.target.value)} inputProps={{ style: inputStyle }} error={!!fieldErrors[`billDetail_${index}_productName`]} helperText={fieldErrors[`billDetail_${index}_productName`] || ""} />
                    </TableCell>
                    <TableCell className="td">
                      <TextField size="small" type="text" value={row.wt} onChange={(e) => handleNumericInput(e, (e) => handleBillDetailChange(index, "wt", e.target.value))} inputProps={{ style: inputStyle }} error={!!fieldErrors[`billDetail_${index}_wt`]} helperText={fieldErrors[`billDetail_${index}_wt`] || ""} />
                    </TableCell>
                    <TableCell className="td">
                      <TextField size="small" type="text" value={row.stWt} onChange={(e) => handleNumericInput(e, (e) => handleBillDetailChange(index, "stWt", e.target.value))} inputProps={{ style: inputStyle }} error={!!fieldErrors[`billDetail_${index}_stWt`]} helperText={fieldErrors[`billDetail_${index}_stWt`] || ""} />
                    </TableCell>
                    <TableCell className="td">
                      <TextField size="small" type="text" value={row.awt} disabled inputProps={{ style: inputStyle }} />
                    </TableCell>
                    <TableCell className="td">
                      <TextField size="small" type="text" value={row.percent} onChange={(e) => handleNumericInput(e, (e) => handleBillDetailChange(index, "percent", e.target.value))} inputProps={{ style: inputStyle }} error={!!fieldErrors[`billDetail_${index}_percent`]} helperText={fieldErrors[`billDetail_${index}_percent`] || ""} />
                    </TableCell>
                    <TableCell className="td">
                      <TextField size="small" type="text" value={row.fwt} disabled inputProps={{ style: inputStyle }} />
                    </TableCell>
                    <TableCell className="td no-print">
                      <IconButton onClick={() => handleDeleteBillDetailRow(index)}>
                        <MdDeleteForever style={{ color: "red", fontSize: "20px" }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="no-products-message">
                    No Bill details added
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Hallmark */}
            <Box className="hallmark-balance-wrapper" sx={{ display: "flex", justifyContent: "space-between", gap: 4, mt: 2 }}>
              
              {/* Left column: Prev & Current Hallmark */}
              <Box className="hallmark-column" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <strong>Prev Hallmark:</strong> {prevHallmark ? prevHallmark.toFixed(3) : "000.000"}
                </Box>
                <TextField
                  size="small"
                  type="text"
                  label="Current Hallmark"
                  value={billHallmark}
                  onChange={(e) =>
                    handleNumericInput(e, (e) => {
                      const validatedValue = validateInput(
                        e.target.value,
                        "billHallmark",
                        0,
                        "hallmark",
                        "number"
                      );
                      setBillHallmark(validatedValue);
                    })
                  }
                  sx={{ width: 150 }}
                  error={!!fieldErrors["hallmark_0_billHallmark"]}
                  helperText={fieldErrors["hallmark_0_billHallmark"] || ""}
                />
              </Box>
              {/* Balance Info */}
              <Box className="balance-info">
                {previousBalance > 0 ? (
                  <div className="negative">Excess Balance: {previousBalance.toFixed(3)}</div>
                ) : previousBalance < 0 ? (
                  <div className="positive">Opening Balance: {Math.abs(previousBalance).toFixed(3)}</div>
                ) : (
                  <div className="neutral">Balance: 0.000</div>
                )}
                <div>FWT: {FWT.toFixed(3)}</div>
                <div>Total FWT: {(FWT - previousBalance).toFixed(3)}</div>
              </Box>
            </Box>


          <Box className="items-section" sx={{ marginTop: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Received Details:</h3>
              <IconButton onClick={handleAddRow} className="no-print">
                <AddCircleOutlineIcon />
              </IconButton>
            </div>

            <Table className="table received-details-table" style={{ marginTop: "10px" }}>
              <TableHead>
                <TableRow style={{ textAlign: "center" }}>
                  <TableCell className="th">S.No</TableCell>
                  <TableCell className="th">Date</TableCell>
                  <TableCell className="th">Type</TableCell>
                  {showGoldRateColumn && <TableCell className="th">Gold Rate</TableCell>}
                  {showGivenGoldColumn && <TableCell className="th">Gold</TableCell>}
                  {showTouchColumn && <TableCell className="th">Touch</TableCell>}
                  <TableCell className="th">Purity WT</TableCell>
                  {showAmountColumn && <TableCell className="th">Amount</TableCell>}
                  <TableCell className="th">Hallmark Bal</TableCell>
                  <TableCell className="th no-print">Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.length > 0 ? (
                  rows.map((row, index) => (
                    <TableRow key={row.id || index}>
                      <TableCell className="td">{index + 1}</TableCell>
                      <TableCell className="td">
                        <TextField size="small" type="date" value={row.date} onChange={(e) => handleRowChange(index, "date", e.target.value)} inputProps={{ style: inputStyle }} error={!!fieldErrors[`receivedDetail_${index}_date`]} helperText={fieldErrors[`receivedDetail_${index}_date`] || ""} />
                      </TableCell>

                      <TableCell className="td">
                        <Select size="small" value={row.type} displayEmpty onChange={(e) => handleRowChange(index, "type", e.target.value)} style={{ width: "120px" }}>
                          <MenuItem value="">
                            <em>Select Type</em>
                          </MenuItem>
                          <MenuItem value="Gold">Gold</MenuItem>
                          <MenuItem value="GoldRate">GoldRate</MenuItem>
                        </Select>
                        {fieldErrors[`receivedDetail_${index}_type`] && <div style={{ color: "red", fontSize: "12px" }}>{fieldErrors[`receivedDetail_${index}_type`]}</div>}
                      </TableCell>

                      {/* Gold Rate column */}
                      {showGoldRateColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "GoldRate") && (
                            <TextField size="small" type="text" value={row.goldRate} onChange={(e) => handleNumericInput(e, (e) => handleRowChange(index, "goldRate", e.target.value))} inputProps={{ style: inputStyle }} error={!!fieldErrors[`receivedDetail_${index}_goldRate`]} helperText={fieldErrors[`receivedDetail_${index}_goldRate`] || ""} />
                          )}
                        </TableCell>
                      )}

                      {/* Given Gold column */}
                      {showGivenGoldColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Gold") && (
                            <TextField size="small" type="text" value={row.givenGold} onChange={(e) => handleNumericInput(e, (e) => handleRowChange(index, "givenGold", e.target.value))} inputProps={{ style: inputStyle }} error={!!fieldErrors[`receivedDetail_${index}_givenGold`]} helperText={fieldErrors[`receivedDetail_${index}_givenGold`] || ""} />
                          )}
                        </TableCell>
                      )}

                      {/* Touch column */}
                      {showTouchColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Gold") && (
                            <TextField size="small" type="text" value={row.touch} onChange={(e) => handleNumericInput(e, (e) => handleRowChange(index, "touch", e.target.value))} inputProps={{ style: inputStyle }} error={!!fieldErrors[`receivedDetail_${index}_touch`]} helperText={fieldErrors[`receivedDetail_${index}_touch`] || ""} />
                          )}
                        </TableCell>
                      )}

                      <TableCell className="td">
                        <TextField size="small" value={row.purityWeight} disabled inputProps={{ style: inputStyle }} />
                      </TableCell>

                      {/* Amount column */}
                      {showAmountColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "GoldRate") && (
                            <TextField size="small" type="text" value={row.amount} onChange={(e) => handleNumericInput(e, (e) => handleRowChange(index, "amount", e.target.value))} inputProps={{ style: inputStyle }} error={!!fieldErrors[`receivedDetail_${index}_amount`]} helperText={fieldErrors[`receivedDetail_${index}_amount`] || ""} />
                          )}
                        </TableCell>
                      )}

                      <TableCell className="td">
                        <TextField size="small" type="text" value={row.hallmark} onChange={(e) => handleNumericInput(e, (e) => handleRowChange(index, "hallmark", e.target.value))} inputProps={{ style: inputStyle }} error={!!fieldErrors[`receivedDetail_${index}_hallmark`]} helperText={fieldErrors[`receivedDetail_${index}_hallmark`] || ""} />
                      </TableCell>

                      <TableCell className="td no-print">
                        <IconButton onClick={() => handleDeleteRow(index)}>
                          <MdDeleteForever style={{ color: "red" }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleReceivedCols} className="no-products-message">
                      No Received details added
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          <Box className="closing-balance">
            <div className="flex">
              <strong>Cash Balance: {cashBalance}</strong>
              {console.log("testing pureBalance",pureBalance)}
              <strong>Pure Balance: {(TotalFWT - totalReceivedPurity).toFixed(3)}</strong>
              <strong>Hallmark Balance: {(hallmarkBalance + prevHallmark).toFixed(3)}</strong>
            </div>
          </Box>

          <Button variant="contained" color="primary" className="save-button no-print" onClick={handleSave}>
            Save
          </Button>
        </Box>
      </Box>

      <Box className="right-panel no-print">
        <h3 className="heading">Available Products</h3>

        <Box sx={{ display: "flex", gap: 1, marginBottom: "10px" }}>
          <TextField style={{ width: "12rem" }} label="Search by Name/Touch" variant="outlined" size="small" value={searchTerm} onChange={handleSearch} placeholder="Search name or touch value" />
          <FormControl size="small" style={{ width: "10rem" }}>
            <InputLabel>Filter by Product</InputLabel>
            <Select value={selectedFilter} label="Filter by Product" onChange={handleFilterChange}>
              <MenuItem value="">All Products</MenuItem>
              {getUniqueProductNames().map((productName) => (
                <MenuItem key={productName} value={productName}>
                  {productName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box className="table-container" sx={{ marginTop: "10px", }}>
          <Table className="table">
            <TableHead>
              <TableRow>
                <TableCell className="th" style={{textAlign:'center'}}>S.No</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>Pdt Name</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>Original WT</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>Remaining WT</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>Count</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>Touch</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableproducts &&
                availableproducts.allStock.map((prodata, index) => {
                  const productId = `${prodata.itemName}_${prodata.itemWeight}_${prodata.touch}`;
                  const remainingWeight = getRemainingWeight(productId, prodata.itemWeight);
                  const isFullyAllocated = remainingWeight <= 0;
                  return (
                    <TableRow
                      key={index}
                      hover
                      style={{
                        cursor: isFullyAllocated ? "not-allowed" : "pointer",
                        backgroundColor: isFullyAllocated ? "#f5f5f5" : "transparent",
                        opacity: isFullyAllocated ? 0.6 : 1,
                      }}
                      onClick={() => {
                        if (!isFullyAllocated) handleProductClick(prodata);
                      }}
                    >
                      <TableCell className="td">{index + 1}</TableCell>
                      <TableCell className="td">{prodata.itemName}</TableCell>
                      <TableCell className="td">{prodata.itemWeight}</TableCell>
                      <TableCell
                        className="td"
                        style={{
                          color: remainingWeight <= 0 ? "red" : "green",
                          fontWeight: "bold",
                        }}
                      >
                        {remainingWeight.toFixed(3)}
                      </TableCell>
                      <TableCell className="td">{prodata.count}</TableCell>
                      <TableCell className="td">{prodata.touch}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Box>

        <ToastContainer />
      </Box>
    </Box>
  );
};

export default Billing;
