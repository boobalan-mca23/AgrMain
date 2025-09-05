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
  const [billId] = useState(1);
  const [date] = useState(new Date().toLocaleDateString("en-IN"));
  const [time] = useState(
    new Date().toLocaleTimeString("en-IN", {  
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );

  // Track weight allocations for each product using unique product ID
  const [weightAllocations, setWeightAllocations] = useState({});
  
  // Filter state
  const [selectedFilter, setSelectedFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Enhanced fieldErrors state for comprehensive form validation
  const [fieldErrors, setFieldErrors] = useState({});

  const initialProductWeights = {
    Chain: 400,
    Ring: 300,
  };

  // Remove default rows - start with empty arrays
  const [rows, setRows] = useState([]);

  const [billDetailRows, setBillDetailRows] = useState([]);

  const [billHallmark, setBillHallmark] = useState("");

  // Enhanced validation function for all input types
  const validateInput = (value, fieldName, rowIndex, fieldType, inputType = 'number') => {
    const fieldKey = `${fieldType}_${rowIndex}_${fieldName}`;
    
    // Clear any existing error for this field
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldKey];
      return newErrors;
    });

    // If empty, no validation error (unless required)
    if (value === "") {
      return value;
    }

    // Validate based on input type
    switch (inputType) {
      case 'number':
        const numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue < 0) {
          setFieldErrors(prev => ({
            ...prev,
            [fieldKey]: "Please enter a valid positive number"
          }));
          return value;
        }
        break;
      
      case 'text':
        if (typeof value !== 'string' || value.trim() === '') {
          setFieldErrors(prev => ({
            ...prev,
            [fieldKey]: "This field cannot be empty"
          }));
          return value;
        }
        break;
      
      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          setFieldErrors(prev => ({
            ...prev,
            [fieldKey]: "Please enter a valid date"
          }));
          return value;
        }
        break;
      
      default:
        break;
    }

    return value;
  };

  // Add the missing validateAllFields function
  const validateAllFields = () => {
    let isValid = true;

    // Validate bill detail rows
    billDetailRows.forEach((row, index) => {
      if (!row.productName || row.productName.trim() === '') {
        setFieldErrors(prev => ({
          ...prev,
          [`billDetail_${index}_productName`]: "Product name is required"
        }));
        isValid = false;
      }
      
      if (!row.wt || parseFloat(row.wt) <= 0) {
        setFieldErrors(prev => ({
          ...prev,
          [`billDetail_${index}_wt`]: "Weight must be greater than 0"
        }));
        isValid = false;
      }
    });

    // Validate received detail rows
    rows.forEach((row, index) => {
      if (!row.date) {
        setFieldErrors(prev => ({
          ...prev,
          [`receivedDetail_${index}_date`]: "Date is required"
        }));
        isValid = false;
      }
    });

    return isValid;
  };

  // Handle numeric input only (prevent non-numeric characters)
  const handleNumericInput = (e, callback) => {
    const value = e.target.value;
    // Allow only numbers, decimal point, and backspace/delete
    const numericPattern = /^[0-9]*\.?[0-9]*$/;
    
    if (numericPattern.test(value) || value === '') {
      callback(e);
    }
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        date: new Date().toISOString().slice(0, 10),
        goldRate: "",
        givenGold: "",
        touch: "",
        purityWeight: "",
        amount: "",
        hallmark: "",
      },
    ]);
  };

  const handleDeleteRow = (index) => {
    const updated = [...rows];
    updated.splice(index, 1);
    setRows(updated);
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
        fwt: "" 
      },
    ]);
  };

  const handleDeleteBillDetailRow = (index) => {
    const rowToDelete = billDetailRows[index];
    
    // Remove weight allocation for this specific product using productId
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
  };

  const handleBillDetailChange = (index, field, value) => {
    // Validate the input
    const validatedValue = validateInput(value, field, index, 'billDetail', field === 'productName' ? 'text' : 'number');
    
    const updated = [...billDetailRows];
    const currentRow = updated[index];
    const oldWeight = parseFloat(currentRow.wt) || 0;
    
    updated[index][field] = validatedValue;

    const wt = parseFloat(updated[index].wt) || 0;
    const stWt = parseFloat(updated[index].stWt) || 0;
    const percent = parseFloat(updated[index].percent) || 0;

    const awt = wt - stWt;
    updated[index].awt = awt.toFixed(3);
    updated[index].fwt = ((awt * percent) / 100).toFixed(3);

    // Update weight allocations when weight changes
    if (field === 'wt' && currentRow.productId) {
      const newAllocations = { ...weightAllocations };
      if (!newAllocations[currentRow.productId]) {
        newAllocations[currentRow.productId] = {};
      }
      newAllocations[currentRow.productId][currentRow.id] = wt;
      setWeightAllocations(newAllocations);
    }

    // Update weight allocations when product name changes
    if (field === 'productName') {
      const newAllocations = { ...weightAllocations };
      
      // Remove old allocation if it exists
      if (currentRow.productId) {
        if (newAllocations[currentRow.productId] && newAllocations[currentRow.productId][currentRow.id]) {
          delete newAllocations[currentRow.productId][currentRow.id];
          if (Object.keys(newAllocations[currentRow.productId]).length === 0) {
            delete newAllocations[currentRow.productId];
          }
        }
      }
      
      // Find the selected item to get its ID
      const selectedItem = items.find(item => item.itemName === value);
      if (selectedItem) {
        updated[index].productId = selectedItem._id;
        
        // Add new allocation if product is selected and has weight
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
    // Validate the input based on field type
    let inputType = 'number';
    if (field === 'date') inputType = 'date';
    
    const validatedValue = validateInput(value, field, index, 'receivedDetail', inputType);
    
    const updatedRows = [...rows];
    updatedRows[index][field] = validatedValue;

    const goldRate = parseFloat(updatedRows[index].goldRate) || 0;
    const givenGold = parseFloat(updatedRows[index].givenGold) || 0;
    const touch = parseFloat(updatedRows[index].touch) || 0;
    const amount = parseFloat(updatedRows[index].amount) || 0;

    let calculatedPurity = 0;

    if (goldRate > 0 && amount > 0) {
      calculatedPurity = amount / goldRate;
    } else if (givenGold > 0 && touch > 0) {
      calculatedPurity = givenGold * (touch / 100);
    }

    updatedRows[index].purityWeight = calculatedPurity.toFixed(3);
    if (field === "hallmark") {
      updatedRows[index].hallmark = value;
    }

    setRows(updatedRows);
  };

  // Calculate remaining weight for each specific product using productId
  const getRemainingWeight = (productId, originalWeight) => {
    if (!weightAllocations[productId]) {
      return originalWeight;
    }
    
    const totalAllocated = Object.values(weightAllocations[productId])
      .reduce((sum, weight) => sum + (parseFloat(weight) || 0), 0);
    
    return Math.max(0, originalWeight - totalAllocated);
  };

  // Handle product click from available products table
  const handleProductClick = (product) => {
    // Create a unique productId using the product's index or unique identifier
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
    
    // Update weight allocations
    const newAllocations = { ...weightAllocations };
    if (!newAllocations[productId]) {
      newAllocations[productId] = {};
    }
    newAllocations[productId][newRow.id] = remainingWeight;
    setWeightAllocations(newAllocations);
    
    setBillDetailRows([...billDetailRows, newRow]);
  };

  // Enhanced save function with validation and backend request
  const handleSave = async () => {
    // Check if customer is selected
    if (!selectedCustomer) {
      alert('Please select a customer before saving.');
      return;
    }

    // Validate all existing fields (will show red borders and error messages)
    const isFormValid = validateAllFields();
    
    if (!isFormValid) {
      alert('Please fill in all required fields (marked in red) before saving.');
      return;
    }

    try {
      // Prepare the bill data for backend
      const billData = {
        billId: billId,
        date: date,
        time: time,
        customerId: selectedCustomer._id,
        customerName: selectedCustomer.name,
        previousBalance: previousBalance,
        billHallmark: parseFloat(billHallmark) || 0,
        
        // Bill details
        billDetails: billDetailRows.map(row => ({
          productId: row.productId,
          productName: row.productName,
          weight: parseFloat(row.wt) || 0,
          stoneWeight: parseFloat(row.stWt) || 0,
          actualWeight: parseFloat(row.awt) || 0,
          percentage: parseFloat(row.percent) || 0,
          finalWeight: parseFloat(row.fwt) || 0
        })),
        
        // Received details
        receivedDetails: rows.map(row => ({
          date: row.date,
          goldRate: parseFloat(row.goldRate) || 0,
          givenGold: parseFloat(row.givenGold) || 0,
          touch: parseFloat(row.touch) || 0,
          purityWeight: parseFloat(row.purityWeight) || 0,
          amount: parseFloat(row.amount) || 0,
          hallmark: parseFloat(row.hallmark) || 0
        })),
        
        // Calculated totals
        totals: {
          totalFWT: totalFWT,
          totalReceivedPurity: totalReceivedPurity,
          pureBalance: pureBalance,
          cashBalance: parseFloat(cashBalance),
          hallmarkBalance: hallmarkBalance
        },
        
        // Weight allocations for tracking
        weightAllocations: weightAllocations
      };

      console.log('Sending bill data to backend:', billData);

      // Make POST request to backend
      const response = await fetch(`${BACKEND_SERVER_URL}/api/bill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Bill saved successfully:', result);
      
      alert('Bill saved successfully!');
      
      // Optional: Reset form after successful save
      // setBillDetailRows([]);
      // setRows([]);
      // setSelectedCustomer(null);
      // setBillHallmark("");
      // setWeightAllocations({});
      // setFieldErrors({});
      
    } catch (error) {
      console.error('Error saving bill:', error);
      alert(`Error saving bill: ${error.message}`);
    }
  };

  const totalFWT = billDetailRows.reduce(
    (total, row) => total + (parseFloat(row.fwt) || 0),
    0
  );

  const totalReceivedPurity = rows.reduce(
    (acc, row) => acc + (parseFloat(row.purityWeight) || 0),
    0
  );

  const pureBalance = totalFWT - totalReceivedPurity;
  const lastGoldRate = [...rows]
    .reverse()
    .find((row) => parseFloat(row.goldRate))?.goldRate;

  const cashBalance = lastGoldRate
    ? (parseFloat(lastGoldRate) * pureBalance).toFixed(2)
    : "0.00";

  const totalBillHallmark = parseFloat(billHallmark) || 0;

  const totalReceivedHallmark = rows.reduce(
    (total, row) => total + (parseFloat(row.hallmark) || 0),
    0
  );

  const hallmarkBalance = totalBillHallmark - totalReceivedHallmark;
  
  // Enhanced search function that includes touch value
  const handleSearch = (e) => {
    const searchValue = e.target.value.toLowerCase();
    setSearchTerm(searchValue);
    applyFilters(searchValue, selectedFilter);
  };

  // Filter function
  const handleFilterChange = (e) => {
    const filterValue = e.target.value;
    setSelectedFilter(filterValue);
    applyFilters(searchTerm, filterValue);
  };

  // Combined filter and search function
  const applyFilters = (search, filter) => {
    if (!originalProducts) return;

    let filtered = originalProducts.allStock;

    // Apply product name filter
    if (filter) {
      filtered = filtered.filter(product => product.itemName === filter);
    }

    // Apply search (item name or touch value)
    if (search) {
      filtered = filtered.filter(product => 
        product.itemName.toLowerCase().includes(search) || 
        product.touch.toString().toLowerCase().includes(search)
      );
    }

    setAvailableProducts({ allStock: filtered });
  };

  // Get unique product names for filter dropdown
  const getUniqueProductNames = () => {
    if (!originalProducts) return [];
    const uniqueNames = [...new Set(originalProducts.allStock.map(product => product.itemName))];
    return uniqueNames.sort();
  };

  const inputStyle = {
    minWidth: "130px",
    padding: "15px",
    fontSize: "15px",
    height: "35px",
  };

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/customers`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Customers fetched:", data);
        setCustomers(data);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };

    const fecthItems = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/master-items`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setItems(data);
        console.log("Items fetched:", data);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    }

    const fetchProductStock = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/productStock`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAvailableProducts(data);
        setOriginalProducts(data);
        console.log("Available Products fetched:", data);
      } catch (error) {
        console.error("Error fetching Available Products:", error);
      }
    }

    fetchProductStock();
    fecthItems();
    fetchCustomers();
  }, []);

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
                if (newValue) {
                  setPreviousBalance(newValue.balance);
                } else {
                  setPreviousBalance(0);
                }
              }}
              value={selectedCustomer}
              renderInput={(params) => (
                <TextField
                  {...params}
                  style={{ width: "15rem" }}
                  label="Select Customer"
                  variant="outlined"
                  size="small"
                />
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
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>Bill Details:</h3>
{/*             <IconButton onClick={handleAddBillDetailRow} className="no-print">
                <AddCircleOutlineIcon />
            </IconButton> */}
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
                    <TextField
                      size="small"
                      value={row.productName}
                      onChange={(e) =>
                        handleBillDetailChange(
                          index,
                          "productName",
                          e.target.value
                        )
                      }
                      inputProps={{ style: inputStyle }}
                      error={!!fieldErrors[`billDetail_${index}_productName`]}
                      helperText={fieldErrors[`billDetail_${index}_productName`] || ""}
                    >
                      {items.map((item)=>(
                        <MenuItem key={`item_${item._id}`} value={item.itemName}>
                          {item.itemName}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="text"
                      value={row.wt}
                      onChange={(e) => handleNumericInput(e, (e) =>
                        handleBillDetailChange(index, "wt", e.target.value)
                      )}
                      inputProps={{ style: inputStyle }}
                      error={!!fieldErrors[`billDetail_${index}_wt`]}
                      helperText={fieldErrors[`billDetail_${index}_wt`] || ""}
                    />
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="text"
                      value={row.stWt}
                      onChange={(e) => handleNumericInput(e, (e) =>
                        handleBillDetailChange(index, "stWt", e.target.value)
                      )}
                      inputProps={{ style: inputStyle }}
                      error={!!fieldErrors[`billDetail_${index}_stWt`]}
                      helperText={fieldErrors[`billDetail_${index}_stWt`] || ""}
                    />
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="text"
                      value={row.awt}
                      disabled
                      inputProps={{ style: inputStyle }}
                    />
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="text"
                      value={row.percent}
                      onChange={(e) => handleNumericInput(e, (e) =>
                        handleBillDetailChange(index, "percent", e.target.value)
                      )}
                      inputProps={{ style: inputStyle }}
                      error={!!fieldErrors[`billDetail_${index}_percent`]}
                      helperText={fieldErrors[`billDetail_${index}_percent`] || ""}
                    />
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="text"
                      value={row.fwt}
                      disabled
                      inputProps={{ style: inputStyle }}
                    />
                  </TableCell>
                  <TableCell className="td no-print">
                    <IconButton onClick={() => handleDeleteBillDetailRow(index)}>
                      <MdDeleteForever style={{color:"red", fontSize:'20px'}} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))) : (
                  <TableRow>
                    <TableCell colSpan={8} className="no-products-message">
                      No Bill details added
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>

          {/* Hallmark */}
          <Box sx={{  display: "flex", alignItems: "center", marginTop: 0, flexDirection:"column", position:"relative", left:"30%", top:"70px" }}>
            <TextField
              size="small"
              type="text"
              label="Hallmark"
              value={billHallmark}
              onChange={(e) => handleNumericInput(e, (e) => {
                const validatedValue = validateInput(e.target.value, 'billHallmark', 0, 'hallmark', 'number');
                setBillHallmark(validatedValue);
              })}
              style={{ width: "130px" }}
              error={!!fieldErrors['hallmark_0_billHallmark']}
              helperText={fieldErrors['hallmark_0_billHallmark'] || ""}
            /> 

            <Box style={{ marginTop: 10, fontWeight: "bold"}}>
               Prev Hallmark : {selectedCustomer ? (selectedCustomer.hallmark ? selectedCustomer.hallmark.toFixed(3) : "0.000") : "0.000"}
            </Box>
          </Box>

          <Box sx={{ textAlign: "right", marginTop: 1, fontWeight: "bold" }}>
                {previousBalance > 0 ? (
                  <span style={{ color: "red" }}>
                    Excess Balance: {previousBalance.toFixed(3)}
                  </span>
                ) : previousBalance < 0 ? (
                  <span style={{ color: "green" }}>
                    Opening Balance: {Math.abs(previousBalance).toFixed(3)}
                  </span>
                ) : (
                  <span style={{ color: "green" }}>Balance: 0.000</span>
                )}
            </Box>

            <Box sx={{ textAlign: "right", marginTop: 1, fontWeight: "bold" }}>
               FWT: {totalFWT.toFixed(3)}
            </Box>

            <Box sx={{ textAlign: "right", marginTop: 1, fontWeight: "bold" }}>
               Total FWT: {(totalFWT - previousBalance).toFixed(3)}
            </Box>

          <Box className="items-section" sx={{ marginTop: 2 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>Received Details:</h3>
              <IconButton onClick={handleAddRow} className="no-print">
                <AddCircleOutlineIcon />
              </IconButton>
            </div>

            <Table className="table received-details-table" style={{ marginTop: "10px"}}>
              <TableHead>
                <TableRow>
                  <TableCell className="th">S.No</TableCell>
                  <TableCell className="th">Date</TableCell>
                  <TableCell className="th">Gold Rate</TableCell>
                  <TableCell className="th">Gold</TableCell>
                  <TableCell className="th">Touch</TableCell>
                  <TableCell className="th">Purity WT</TableCell>
                  <TableCell className="th">Amount</TableCell>
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
                        <TextField
                          size="small"
                          type="date"
                          value={row.date}
                          onChange={(e) =>
                            handleRowChange(index, "date", e.target.value)
                          }
                          inputProps={{ style: inputStyle }}
                          error={!!fieldErrors[`receivedDetail_${index}_date`]}
                          helperText={fieldErrors[`receivedDetail_${index}_date`] || ""}
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="text"
                          value={row.goldRate}
                          onChange={(e) => handleNumericInput(e, (e) =>
                            handleRowChange(index, "goldRate", e.target.value)
                          )}
                          inputProps={{ style: inputStyle }}
                          error={!!fieldErrors[`receivedDetail_${index}_goldRate`]}
                          helperText={fieldErrors[`receivedDetail_${index}_goldRate`] || ""}
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="text"
                          value={row.givenGold}
                          onChange={(e) => handleNumericInput(e, (e) =>
                            handleRowChange(index, "givenGold", e.target.value)
                          )}
                          inputProps={{ style: inputStyle }}
                          error={!!fieldErrors[`receivedDetail_${index}_givenGold`]}
                          helperText={fieldErrors[`receivedDetail_${index}_givenGold`] || ""}
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="text"
                          value={row.touch}
                          onChange={(e) => handleNumericInput(e, (e) =>
                            handleRowChange(index, "touch", e.target.value)
                          )}
                          inputProps={{ style: inputStyle }}
                          error={!!fieldErrors[`receivedDetail_${index}_touch`]}
                          helperText={fieldErrors[`receivedDetail_${index}_touch`] || ""}
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          value={row.purityWeight}
                          disabled
                          inputProps={{ style: inputStyle }}
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="text"
                          value={row.amount}
                          onChange={(e) => handleNumericInput(e, (e) =>
                            handleRowChange(index, "amount", e.target.value)
                          )}
                          inputProps={{ style: inputStyle }}
                          error={!!fieldErrors[`receivedDetail_${index}_amount`]}
                          helperText={fieldErrors[`receivedDetail_${index}_amount`] || ""}
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="text"
                          value={row.hallmark}
                          onChange={(e) => handleNumericInput(e, (e) =>
                            handleRowChange(index, "hallmark", e.target.value)
                          )}
                          inputProps={{ style: inputStyle }}
                          error={!!fieldErrors[`receivedDetail_${index}_hallmark`]}
                          helperText={fieldErrors[`receivedDetail_${index}_hallmark`] || ""}
                        />
                      </TableCell>
                      <TableCell className="td no-print">
                        <IconButton onClick={() => handleDeleteRow(index)}>
                          <MdDeleteForever style={{color:"red"}} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="no-products-message">
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
              <strong>Pure Balance: {pureBalance.toFixed(3)}</strong>
              <strong>Hallmark Balance: {hallmarkBalance.toFixed(3)}</strong>
            </div>
          </Box>

          <Button
            variant="contained"
            color="primary"
            className="save-button no-print"
            onClick={handleSave}
          >
            Save
          </Button>
        </Box>
      </Box>

      <Box className="right-panel no-print">
        <h3 className="heading">Available Products</h3>
        
        {/* Enhanced Search and Filter Section */}
        <Box sx={{ display: "flex", gap: 1, marginBottom: "10px" }}>
          <TextField
            style={{ width: "12rem" }}
            label="Search by Name/Touch"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search name or touch value"
          />
          
          <FormControl size="small" style={{ width: "10rem" }}>
            <InputLabel>Filter by Product</InputLabel>
            <Select
              value={selectedFilter}
              label="Filter by Product"
              onChange={handleFilterChange}
            >
              <MenuItem value="">All Products</MenuItem>
              {getUniqueProductNames().map((productName) => (
                <MenuItem key={productName} value={productName}>
                  {productName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Table className="table" style={{ marginTop: "10px" }}>
          <TableHead>
            <TableRow>
              <TableCell className="th">S.No</TableCell>
              <TableCell className="th">ProductName</TableCell>
              <TableCell className="th">Original Weight</TableCell>
              <TableCell className="th">Remaining Weight</TableCell>
              <TableCell className="th">Count</TableCell>
              <TableCell className="th">Touch</TableCell>
            </TableRow>
          </TableHead>
        <TableBody>
            {availableproducts &&
              availableproducts.allStock.map((prodata, index) => {
                // Create unique productId for each product
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
                      opacity: isFullyAllocated ? 0.6 : 1
                    }} 
                    onClick={() => {
                      if (!isFullyAllocated) {
                        handleProductClick(prodata);
                      }
                    }}
                  >
                    <TableCell className="td">{index + 1}</TableCell>
                    <TableCell className="td">{prodata.itemName}</TableCell>
                    <TableCell className="td">{prodata.itemWeight}</TableCell>
                    <TableCell className="td" style={{ 
                      color: remainingWeight <= 0 ? 'red' : 'green',
                      fontWeight: 'bold'
                    }}>
                      {remainingWeight.toFixed(3)}
                    </TableCell>
                    <TableCell className="td">{prodata.count}</TableCell>           
                    <TableCell className="td">{prodata.touch}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        <ToastContainer />
      </Box>
    </Box>
  );
};

export default Billing;
