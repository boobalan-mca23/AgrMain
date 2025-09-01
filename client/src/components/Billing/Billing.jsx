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
  const [billId] = useState(1);
  const [date] = useState(new Date().toLocaleDateString("en-IN"));
  const [time] = useState(
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );

  const initialProductWeights = {
    Chain: 400,
    Ring: 300,
  };

  const [rows, setRows] = useState([
    {
      date: new Date().toISOString().slice(0, 10),
      goldRate: "",
      givenGold: "",
      touch: "",
      purityWeight: "",
      amount: "",
      hallmark: "",
    },
  ]);

  const [billDetailRows, setBillDetailRows] = useState([
    { productName: "", wt: "", stWt: "", awt: "", percent: "", fwt: "" },
  ]);

  const [billHallmark, setBillHallmark] = useState("");

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
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
      { productName: "", wt: "", stWt: "", awt: "", percent: "", fwt: "" },
    ]);
  };

  const handleDeleteBillDetailRow = (index) => {
    const updated = [...billDetailRows];
    updated.splice(index, 1);
    setBillDetailRows(updated);
  };

  const handleBillDetailChange = (index, field, value) => {
    const updated = [...billDetailRows];
    updated[index][field] = value;

    const wt = parseFloat(updated[index].wt) || 0;
    const stWt = parseFloat(updated[index].stWt) || 0;
    const percent = parseFloat(updated[index].percent) || 0;

    const awt = wt - stWt;
    updated[index].awt = awt.toFixed(3);
    updated[index].fwt = ((awt * percent) / 100).toFixed(3);

    setBillDetailRows(updated);
  };

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

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
        //  const res= await fecth(`${BACKEND_SERVER_URL}/api/productStock`);
        //  console.log('res from productStock',res.data.allStock)
        //  setAvailableProducts(res.data.allStock)
         try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/productStock`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAvailableProducts(data);
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
      <Box className="left-panel">
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
            onChange={(_, newValue) => setSelectedCustomer(newValue)}
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
            <IconButton onClick={handleAddBillDetailRow} className="no-print">
                <AddCircleOutlineIcon />
            </IconButton>
          </Box>

          <Table className="table">
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
                <TableRow key={index}>
                  <TableCell className="td">{index + 1}</TableCell>
                  <TableCell className="td">
                    <TextField
                      select
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
                    >
                      {items.map((item)=>(
                        <MenuItem key={item._id} value={item.itemName}>
                          {item.itemName}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="number"
                      value={row.wt}
                      onChange={(e) =>
                        handleBillDetailChange(index, "wt", e.target.value)
                      }
                      inputProps={{ style: inputStyle }}
                    />
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="number"
                      value={row.stWt}
                      onChange={(e) =>
                        handleBillDetailChange(index, "stWt", e.target.value)
                      }
                      inputProps={{ style: inputStyle }}
                    />
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="number"
                      value={row.awt}
                      disabled
                      inputProps={{ style: inputStyle }}
                    />
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="number"
                      value={row.percent}
                      onChange={(e) =>
                        handleBillDetailChange(index, "percent", e.target.value)
                      }
                      inputProps={{ style: inputStyle }}
                    />
                  </TableCell>
                  <TableCell className="td">
                    <TextField
                      size="small"
                      type="number"
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
                    <TableCell colSpan={9} className="no-products-message">
                      No Bill details added
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>

          {/* Single Hallmark box chnage*/}
          <Box sx={{ textAlign: "right", marginTop: 1 }}>
            <TextField
              size="small"
              type="number"
              label="Hallmark"
              value={billHallmark}
              onChange={(e) => setBillHallmark(e.target.value)}
              style={{ width: "130px" }}
            />
          </Box>

          <Box sx={{ textAlign: "right", marginTop: 1, fontWeight: "bold" }}>
            Total FWT: {totalFWT.toFixed(3)}
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

            <Table className="table received-details-table">
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
                    <TableRow key={index}>
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
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="number"
                          value={row.goldRate}
                          onChange={(e) =>
                            handleRowChange(index, "goldRate", e.target.value)
                          }
                          inputProps={{ style: inputStyle }}
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="number"
                          value={row.givenGold}
                          onChange={(e) =>
                            handleRowChange(index, "givenGold", e.target.value)
                          }
                          inputProps={{ style: inputStyle }}
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="number"
                          value={row.touch}
                          onChange={(e) =>
                            handleRowChange(index, "touch", e.target.value)
                          }
                          inputProps={{ style: inputStyle }}
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
                          type="number"
                          value={row.amount}
                          onChange={(e) =>
                            handleRowChange(index, "amount", e.target.value)
                          }
                          inputProps={{ style: inputStyle }}
                        />
                      </TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="number"
                          value={row.hallmark}
                          onChange={(e) =>
                            handleRowChange(index, "hallmark", e.target.value)
                          }
                          inputProps={{ style: inputStyle }}
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
          >
            Save
          </Button>
        </Box>
      </Box>

      <Box className="right-panel no-print">
        <h3 className="heading">Available Products</h3>
        {/* //searchbar */}
        <Box>
          <TextField
            style={{ width: "15rem", marginBottom: "10px" }}
            label="Search Product"
            variant="outlined"
            size="small"
            onChange={(e)=>{
              const searchTerm = e.target.value.toLowerCase();
              if(availableproducts){
                const filteredProducts = availableproducts.allStock.filter(product =>
                  product.itemName.toLowerCase().startsWith(searchTerm)
                );
                setAvailableProducts({allStock: filteredProducts});
                
                if(searchTerm === ""){
                  // Reset to original list if search term is empty
                  fetch(`${BACKEND_SERVER_URL}/api/productStock`)
                  .then(response => response.json())
                  .then(data => setAvailableProducts(data))
                  .catch(error => console.error("Error fetching products:", error));
                }
              }
            }}
          />
        </Box>
        <Table className="table">
          <TableHead>
            <TableRow>
              <TableCell className="th">S.No</TableCell>
              <TableCell className="th">ProductName</TableCell>
              <TableCell className="th">ItemWeight</TableCell>
              <TableCell className="th">Count</TableCell>
              <TableCell className="th">Touch</TableCell>

            </TableRow>
          </TableHead>
          <TableBody>
         
            {availableproducts &&
              availableproducts.allStock.map((prodata, index) => {
                return (
                  <TableRow key={index} hover style={{cursor:"pointer"}} onClick={()=>{
                    const productName = prodata.itemName;
                    // const initialWeight = initialProductWeights[productName] || 0; // Default to 100 if not found
                    const initialWeight = prodata.itemWeight || 0; // Default to 100 if not found
                    const newRow = {
                      productName: productName,
                      wt: initialWeight.toString(),
                      stWt: "0",
                      awt: initialWeight.toString(),
                      percent: "100",
                      fwt: initialWeight.toString(),
                    };
                    setBillDetailRows([...billDetailRows, newRow]);
                  }}>
                    <TableCell className="td">{index + 1}</TableCell>
                    <TableCell className="td">{prodata.itemName}</TableCell>
                    <TableCell className="td">{prodata.itemWeight}</TableCell>
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
