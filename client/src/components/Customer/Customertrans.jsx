import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Customertrans.css";
import {
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import "react-toastify/dist/ReactToastify.css";
import { checkTransaction } from "../cashOrGoldValidation/cashOrGoldValidation";
const Customertrans = () => {
  const today = new Date();
  const formattedToday = today.toISOString().split("T")[0]; // "2025-09-16"

  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("id");
  const customerName = searchParams.get("name");

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState("");
  const [goldCashError, setGoldCashError] = useState({});
  const [goldRate, setGoldRate] = useState("");
  const [masterTouch, setMasterTouch] = useState([]);
  const [newTransaction, setNewTransaction] = useState({
    date: formattedToday,
    gold: "",
    type: "Select",
    amount: "",
    goldRate: "",
    touch: "",
    purity: "",
    pureGold: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        if (customerId) {
          const response = await axios.get(
            `${BACKEND_SERVER_URL}/api/transactions/${customerId}`
          );
          setTransactions(response.data);
        }
      } catch (error) {
        console.error("Error fetching transactions:", error);
        toast.error("Failed to load transactions");
      }
    };

    const fetchTouch = async () => {
      try {
        const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
        console.log("masterTouch", res.data);
        setMasterTouch(res.data);
      } catch (err) {
        console.error("Failed to fetch touch values", err);
      }
    };
    fetchTouch();
    fetchTransactions();
  }, [customerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedTransaction = { ...newTransaction, [name]: value };

    if (updatedTransaction.type === "Cash") {
      if (name === "amount") updatedTransaction.value = value;

      const cash = parseFloat(updatedTransaction.amount);
      const rate = parseFloat(goldRate);
      const touch = parseFloat(updatedTransaction.touch);

      if (!isNaN(cash) && !isNaN(rate) && rate > 0) {
        updatedTransaction.purity = (cash / rate).toFixed(3);
        if (!isNaN(touch) && touch > 0) {
          updatedTransaction.pureGold = ((parseFloat(updatedTransaction.purity) / touch) * 100).toFixed(3);
        } else {
          updatedTransaction.pureGold = "";
        }
      } else {
        updatedTransaction.purity = "";
        updatedTransaction.pureGold = "";
      }
    } else if (name === "gold" && updatedTransaction.type === "Gold") {
      updatedTransaction.value = value;
      const touch = parseFloat(updatedTransaction.touch);
      const gold = parseFloat(value);
      if (!isNaN(gold) && !isNaN(touch)) {
        updatedTransaction.purity = ((gold * touch) / 100).toFixed(3);
      }
    } else if (name === "touch" && updatedTransaction.type === "Gold") {
      const gold = parseFloat(updatedTransaction.gold);
      const touch = parseFloat(value);
      if (!isNaN(gold) && !isNaN(touch)) {
        updatedTransaction.purity = ((gold * touch) / 100).toFixed(3);
      }
    }

    setNewTransaction(updatedTransaction);
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError("");

    try {
      if (!newTransaction.date || newTransaction.type === "Select") {
        throw new Error("Date and transaction type are required");
      }
      if (newTransaction.type === "Cash") {
        if (!newTransaction.amount || !goldRate || !newTransaction.touch) {
          throw new Error("Cash value, goldRate, and touch are required");
        }
      }

      if (newTransaction.type === "Gold") {
        if (!newTransaction.gold || !newTransaction.touch) {
          throw new Error("gold value and touch are required");
        }
      }

      if (!customerId) {
        throw new Error("Customer ID is missing");
      }

      const transactionData = {
        date: newTransaction.date,
        type: newTransaction.type,
        amount: parseFloat(newTransaction.amount) || 0,
        gold: parseFloat(newTransaction.gold) || 0,
        purity: parseFloat(newTransaction.purity),
        customerId: parseInt(customerId),
        goldRate: newTransaction.type === "Cash" ? parseFloat(goldRate) : 0,
        touch: parseFloat(newTransaction.touch) || 0,
      };
      let isTrue = checkTransaction(transactionData, setGoldCashError);
      if (Object.keys(isTrue).length === 0) {
        const response = await axios.post(
          `${BACKEND_SERVER_URL}/api/transactions`,
          transactionData
        );

        setTransactions([...transactions, response.data]);
        resetForm();
        setShowPopup(false);
        toast.success("Transaction added successfully!");
      }
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error(error.message || "Error adding transaction");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewTransaction({
      date: formattedToday,
      gold: "",
      type: "Select",
      amount: "",
      goldRate: "",
      touch: "",
      purity: "",
      pureGold: "",
    });
    setError("");
    setGoldRate("");
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const transactionDate = dayjs(transaction.date);
    const from = fromDate ? fromDate.startOf("day") : null;
    const to = toDate ? toDate.endOf("day") : null;

    const matchesFrom = !from || transactionDate.isAfter(from) || transactionDate.isSame(from, "day");
    const matchesTo = !to || transactionDate.isBefore(to) || transactionDate.isSame(to, "day");

    return matchesFrom && matchesTo;
  });

  const totals = filteredTransactions.reduce(
    (acc, transaction) => {
      acc.totalPurity += parseFloat(transaction.purity) || 0;
      return acc;
    },
    { totalPurity: 0 }
  );

  return (
    <div className="customer-transactions">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>
        Customer Transactions{" "}
        {customerName && `for ${decodeURIComponent(customerName)}`}
      </h2>
      <br />
      {error && <div className="error-message">{error}</div>}

      <Box className="filters" sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="From Date"
            value={fromDate}
            format="DD/MM/YYYY"
            onChange={(newValue) => setFromDate(newValue)}
            slotProps={{ textField: { size: "small", sx: { width: 200 } } }}
          />
        </LocalizationProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="To Date"
            value={toDate}
            format="DD/MM/YYYY"
            minDate={fromDate || undefined}
            onChange={(newValue) => setToDate(newValue)}
            slotProps={{ textField: { size: "small", sx: { width: 200 } } }}
          />
        </LocalizationProvider>
        <Button
          variant="contained"
          size="small"
          sx={{
            backgroundColor: "#d32f2f",
            color: "white",
            '&:hover': { backgroundColor: "#c62828" },
            height: "40px"
          }}
          onClick={() => {
            setFromDate(null);
            setToDate(null);
          }}
        >
          Reset
        </Button>
      </Box>

      <button onClick={() => setShowPopup(true)} className="add-btn">
        Add Transaction
      </button>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-cont">
            <h3>Add Transaction</h3>
            <button
              className="close-btn"
              onClick={() => {
                resetForm();
                setShowPopup(false);
              }}
            >
              ×
            </button>
            <form>
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  name="date"
                  value={newTransaction.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Type:</label>
                <select
                  name="type"
                  value={newTransaction.type}
                  onChange={handleChange}
                  required
                >
                  <option value="Select">Select</option>
                  <option value="Cash">Cash</option>
                  <option value="Gold">Gold</option>
                </select>
              </div>

              {newTransaction.type === "Cash" && (
                <>
                  <div className="form-group">
                    <label>Cash Amount (₹):</label>
                    <input
                      type="number"
                      name="amount"
                      value={newTransaction.amount}
                      onChange={handleChange}
                      onWheel={(e) => e.target.blur()}
                      step="0.01"
                      required
                    />
                    {goldCashError.amount && (
                      <p style={{ color: "red" }}>{goldCashError.amount}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Gold Rate (₹/gram):</label>
                    <input
                      type="number"
                      value={goldRate}
                      onWheel={(e) => e.target.blur()}
                      onChange={(e) => {
                        setGoldRate(e.target.value);
                        const cash = parseFloat(newTransaction.amount);
                        const rate = parseFloat(e.target.value);
                        const touch = parseFloat(newTransaction.touch);
                        const updatedTransaction = { ...newTransaction };
                        if (!isNaN(cash) && !isNaN(rate) && rate > 0) {
                          updatedTransaction.purity = (cash / rate).toFixed(3);
                          if (!isNaN(touch) && touch > 0) {
                            updatedTransaction.pureGold = ((parseFloat(updatedTransaction.purity) / touch) * 100).toFixed(3);
                          }
                        } else {
                          updatedTransaction.purity = "";
                          updatedTransaction.pureGold = "";
                        }
                        setNewTransaction(updatedTransaction);
                      }}
                      step="0.01"
                      required
                    />
                    {goldCashError.goldRate && (
                      <p style={{ color: "red" }}>{goldCashError.goldRate}</p>
                    )}
                  </div>
                  <div className="direct-Touch">
                    <label>Touch (%):</label>
                    <Autocomplete
                      freeSolo
                      forcePopupIcon
                      options={masterTouch.map((item) => item.touch.toString())}
                      value={newTransaction.touch ? newTransaction.touch.toString() : ""}
                      onChange={(event, newValue) => {
                        handleChange({
                          target: {
                            name: "touch",
                            value: newValue || "",
                          },
                        });
                      }}
                      noOptionsText=""
                      sx={{
                        width: 400,
                        "& .MuiInputBase-root": {
                          height: 40,
                          padding: "2px !important",
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          name="touch"
                          required
                          size="small"
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) => handleChange(e)}
                          inputProps={{
                            ...params.inputProps,
                            style: { padding: "8px" },
                          }}
                        />
                      )}
                    />
                    {goldCashError.touch && (
                      <p style={{ color: "red" }}>{goldCashError.touch}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Purity (grams):</label>
                    <input
                      type="number"
                      name="purity"
                      value={newTransaction.purity || ""}
                      readOnly
                      className="read-only"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pure Gold (grams):</label>
                    <input
                      type="number"
                      name="pureGold"
                      value={newTransaction.pureGold || ""}
                      readOnly
                      className="read-only"
                    />
                  </div>
                </>
              )}

              {newTransaction.type === "Gold" && (
                <>
                  <div className="form-group">
                    <label>Gold Value (grams):</label>
                    <input
                      type="number"
                      name="gold"
                      value={newTransaction.gold}
                      onChange={handleChange}
                      onWheel={(e) => e.target.blur()}
                      step="0.001"
                      required
                    />
                    {goldCashError.gold && (
                      <p style={{ color: "red" }}>{goldCashError.gold}</p>
                    )}
                  </div>
                  <div className="direct-Touch">
                    <label>Touch (%):</label>
                    <Autocomplete
                      freeSolo
                      forcePopupIcon
                      options={masterTouch.map((item) => item.touch.toString())}
                      value={newTransaction.touch ? newTransaction.touch.toString() : ""}
                      onChange={(event, newValue) => {
                        handleChange({
                          target: {
                            name: "touch",
                            value: newValue || "",
                          },
                        });
                      }}
                      noOptionsText=""
                      sx={{
                        width: 400,
                        "& .MuiInputBase-root": {
                          height: 40,
                          padding: "2px !important",
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          name="touch"
                          required
                          size="small"
                          onWheel={(e) => e.target.blur()}
                          onChange={(e) => handleChange(e)}
                          inputProps={{
                            ...params.inputProps,
                            style: { padding: "8px" },
                          }}
                        />
                      )}
                    />
                    {goldCashError.touch && (
                      <p style={{ color: "red" }}>{goldCashError.touch}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Purity (grams):</label>
                    <input
                      type="number"
                      name="purity"
                      value={newTransaction.purity}
                      readOnly
                      className="read-only"
                    />
                  </div>
                </>
              )}

              <div className="button-group">
                <button
                  type="button"
                  className="submit-btn"
                  onClick={addTransaction}
                  disabled={isSaving}
                  style={{ background: isSaving ? "grey" : "#1DA3A3", marginRight: "10px" }}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowPopup(false);
                  }}
                  style={{
                    backgroundColor: "white",
                    color: "red",
                    border: "1px solid red",
                    padding: "10px 15px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TableContainer component={Paper} elevation={3} sx={{ mt: 3 }}>
        <Table className="customerTrantable">
          <TableHead
            sx={{
              backgroundColor: "#e3f2fd",
              "& th": {
                color: "#0d47a1",
                fontWeight: "bold",
                fontSize: "1rem",
              },
            }}
          >
            <TableRow>
              <TableCell align="center">Date</TableCell>
              <TableCell align="center">Type</TableCell>
              <TableCell align="center">Gold Rate</TableCell>
              <TableCell align="center">Gold</TableCell>
              <TableCell align="center">Purity (grams)</TableCell>
              <TableCell align="center">Pure Gold (grams)</TableCell>
              <TableCell align="center">Amount</TableCell>
              <TableCell align="center">Touch</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell align="center">{new Date(transaction.date).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell align="center">{transaction.type}</TableCell>
                  <TableCell align="center">{transaction.goldRate}</TableCell>
                  <TableCell align="center">{transaction.type === "Cash" ? "-" : `${transaction.gold}gr`}</TableCell>
                  <TableCell align="center">{transaction.purity.toFixed(3)}</TableCell>
                  <TableCell align="center">
                    {transaction.type === "Cash" && transaction.touch && transaction.purity
                      ? ((parseFloat(transaction.purity) / parseFloat(transaction.touch)) * 100).toFixed(3)
                      : "-"}
                  </TableCell>
                  <TableCell align="center">{transaction.amount}</TableCell>
                  <TableCell align="center">
                    {transaction.touch ? `${transaction.touch}%` : "-"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">No details available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totals.totalPurity > 0 && (
        <div className="transaction-totals">
          <h3>Transaction Totals</h3>
          <div className="total-row">
            <span>Total Purity:</span>
            <span>{totals.totalPurity.toFixed(3)} g</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customertrans;
