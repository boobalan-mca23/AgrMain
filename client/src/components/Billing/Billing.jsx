import React, { useEffect, useMemo, useState } from "react";
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
  Typography,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Modal,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PrintIcon from "@mui/icons-material/Print";
import { MdBorderBottom, MdDeleteForever } from "react-icons/md";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import SaveIcon from "@mui/icons-material/Save";
import "./Billing.css";

// Helper utilities
const toNumber = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const toFixedStr = (v, d = 3) => {
  return (
    Math.round((toNumber(v) + Number.EPSILON) * Math.pow(10, d)) /
    Math.pow(10, d)
  ).toFixed(d);
};

const Billing = () => {
  // === State ===
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [availableProducts, setAvailableProducts] = useState(null);
  const [originalProducts, setOriginalProducts] = useState(null);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [prevHallmark, setPrevHallmark] = useState(0);

  const [billId, setBillId] = useState(0);
  const [date] = useState(new Date().toLocaleDateString());
  const [time] = useState(
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
  const [billTime,setBillTime]=useState("")
  const [weightAllocations, setWeightAllocations] = useState({});
  const [stoneAllocations, setStoneAllocations] = useState({});
  const [countAllocations, setCountAllocations] = useState({});

  const [selectedFilter, setSelectedFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [viewMode, setViewMode] = useState(false);

  const [rows, setRows] = useState([]); // Received details
  const [billDetailRows, setBillDetailRows] = useState([]); // Bill items
  const [billHallmark, setBillHallmark] = useState("");
  const [isModal, setIsModal] = useState(false);
  const [bills, setBills] = useState([]);
  const [currentBill, setCurrentBill] = useState(null);
  const [touch, setTouch] = useState([]);

  // === Validation helpers ===
  const validateInput = (
    value,
    fieldName,
    rowIndex,
    fieldType,
    inputType = "number"
  ) => {
    const fieldKey = `${fieldType}_${rowIndex}_${fieldName}`;
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[fieldKey];
      return copy;
    });

    if (value === "") return value;

    switch (inputType) {
      case "number": {
        const numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue < 0) {
          setFieldErrors((prev) => ({
            ...prev,
            [fieldKey]: "Please enter a valid positive number",
          }));
          return value;
        }break;
      }
      case "text":
        if (typeof value !== "string" || value.trim() === "") {
          setFieldErrors((prev) => ({
            ...prev,
            [fieldKey]: "This field cannot be empty",
          }));
          return value;
        }break;
      case "date": {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          setFieldErrors((prev) => ({
            ...prev,
            [fieldKey]: "Please enter a valid date",
          }));
          return value;
        }  break;
      }
      default:
        break; }
    return value;
  };

  const validateAllFields = () => {
    let isValid = true;
    const newErrors = {};

    if (billDetailRows.length === 0) {
      alert( "Please add at least one Bill Detail or Received Detail before saving.");
      return false;
    }

    billDetailRows.forEach((row, index) => {
      if (!row.productName || row.productName.trim() === "") {
        newErrors[`billDetail_${index}_productName`] = "Product name is required";
        isValid = false;
      }
      if (!row.wt || toNumber(row.wt) <= 0) {
        newErrors[`billDetail_${index}_wt`] = "Weight is required";
        isValid = false;
      }
      if (!row.percent || toNumber(row.percent) <= 0) {
        newErrors[`billDetail_${index}_percent`] = "Percentage is required";
        isValid = false;
      }
    });

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
        const hasGoldRateCombo = row.goldRate && row.amount;
        const hasGoldCombo = row.givenGold && row.touch;
        if (!hasGoldRateCombo && !hasGoldCombo) {
          newErrors[`receivedDetail_${index}_goldRate`] ="Fill GoldRate & Amount OR select Gold and fill Gold & Touch";
          newErrors[`receivedDetail_${index}_amount`] ="Fill GoldRate & Amount OR select Gold and fill Gold & Touch";
          newErrors[`receivedDetail_${index}_givenGold`] ="Fill Gold & Touch OR select GoldRate and fill GoldRate & Amount";
          newErrors[`receivedDetail_${index}_touch`] ="Fill Gold & Touch OR select GoldRate and fill GoldRate & Amount";
          isValid = false;
        }
      }
      // if (!row.hallmark) {
      //   newErrors[`receivedDetail_${index}_hallmark`] = "Hallmark is required";
      //   isValid = false;
      // }
    });
    setFieldErrors(newErrors);
    return isValid;
  };
  // Allow only numbers + optional dot (no negative in UI)
  const handleNumericInput = (e, callback) => {
    const value = e.target.value;
    const numericPattern = /^[0-9]*\.?[0-9]*$/;
    if (numericPattern.test(value) || value === "") callback(e);
  };

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
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
        isLocked: false,
      },
    ]);
  };

  const handleDeleteRow = (index) => {
    const confirmed = window.confirm("Sure you want to delete this row?");
    if (!confirmed) return console.log("Cancelled deletion");
    setRows((prevRows) => prevRows.filter((_, i) => i !== index));
    setFieldErrors({});
    
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;
    try {
      const res = await fetch(`${BACKEND_SERVER_URL}/api/bill/${id}`, { method: "DELETE",});
      if (!res.ok) throw new Error(`Failed to delete (status ${res.status})`);
      setBills((prev) => prev.filter((bill) => bill.id !== id));
      alert("Bill deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete bill");
    }
  };

  const handleAddBillDetailRow = () => {
    setBillDetailRows((prev) => [
      ...prev,{
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
      if (!isdelete) return console.log("cancelled deletion");
      const rowToDelete = billDetailRows[index];
      if (rowToDelete?.productId && rowToDelete?.id) {
        const newAllocations = { ...weightAllocations };
        if (newAllocations[rowToDelete.productId]) {
          delete newAllocations[rowToDelete.productId][rowToDelete.id];
          if (Object.keys(newAllocations[rowToDelete.productId]).length === 0) {
            delete newAllocations[rowToDelete.productId];
          }
        }
        setWeightAllocations(newAllocations);

        // stone allocations
        const newStone = { ...stoneAllocations };
        if (newStone[rowToDelete.productId]) {
          delete newStone[rowToDelete.productId][rowToDelete.id];
          if (Object.keys(newStone[rowToDelete.productId]).length === 0) {
            delete newStone[rowToDelete.productId];
          }
        }
        setStoneAllocations(newStone);

        // count allocations
        const newCount = { ...countAllocations };
        if (newCount[rowToDelete.productId]) {
          delete newCount[rowToDelete.productId][rowToDelete.id];
          if (Object.keys(newCount[rowToDelete.productId]).length === 0) {
            delete newCount[rowToDelete.productId];
          }
        }
        setCountAllocations(newCount);
      }
      setBillDetailRows((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Error in Deleting Row", err);
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
  const currentRow = { ...updated[index] };
  currentRow[field] = validatedValue;

  // Ensure numeric strings are normalized
  const wt = toNumber(currentRow.wt);
  const stWt = toNumber(currentRow.stWt);
  const percent = toNumber(currentRow.percent);
  // awt and fwt always re-calculated
  const awt = wt - stWt;
  currentRow.awt = awt ? toFixedStr(awt, 3) : "0.000";
  currentRow.fwt = percent ? toFixedStr((awt * percent) / 100, 3) : "0.000";

  updated[index] = currentRow;

  // Update allocations when fields change and productId exists
  const productId = currentRow.productId;

  if (productId) {
    // weight
    if (field === "wt" || field === "productName") {
      const newAlloc = { ...weightAllocations };
      if (!newAlloc[productId]) newAlloc[productId] = {};
      newAlloc[productId][currentRow.id] = toNumber(currentRow.wt);
      setWeightAllocations(newAlloc);
    }

    // stone
    if (field === "stWt" || field === "productName") {
      const newStone = { ...stoneAllocations };
      if (!newStone[productId]) newStone[productId] = {};
      newStone[productId][currentRow.id] = toNumber(currentRow.stWt);
      setStoneAllocations(newStone);
    }

    // count
    if (field === "count" || field === "productName") {
      const newCount = { ...countAllocations };
      if (!newCount[productId]) newCount[productId] = {};
      // default to 0 if empty
      newCount[productId][currentRow.id] = toNumber(currentRow.count || 0);
      setCountAllocations(newCount);
    }

    // If user changed productName (switched product), ensure we remove allocations of old productId handled earlier in productName branch below
  }

  // Special handling when user switches productName: update productId mapping
  if (field === "productName") {
    const selectedItem = items.find((it) => it.itemName === validatedValue);
    const prevProductId = updated[index].productId;
    // remove previous product allocations if switching
    if (prevProductId && prevProductId !== (selectedItem?._id || selectedItem?.id)) {
      const newW = { ...weightAllocations };
      if (newW[prevProductId]) {
        delete newW[prevProductId][currentRow.id];
        if (Object.keys(newW[prevProductId]).length === 0) delete newW[prevProductId];
        setWeightAllocations(newW);
      }
      const newS = { ...stoneAllocations };
      if (newS[prevProductId]) {
        delete newS[prevProductId][currentRow.id];
        if (Object.keys(newS[prevProductId]).length === 0) delete newS[prevProductId];
        setStoneAllocations(newS);
      }
      const newC = { ...countAllocations };
      if (newC[prevProductId]) {
        delete newC[prevProductId][currentRow.id];
        if (Object.keys(newC[prevProductId]).length === 0) delete newC[prevProductId];
        setCountAllocations(newC);
      }
    }

    if (selectedItem) {
      updated[index].productId = selectedItem._id || selectedItem.id || "";
      // ensure allocations exist for new product
      const newW = { ...weightAllocations };
      if (!newW[updated[index].productId]) newW[updated[index].productId] = {};
      newW[updated[index].productId][currentRow.id] = toNumber(currentRow.wt);
      setWeightAllocations(newW);

      const newS = { ...stoneAllocations };
      if (!newS[updated[index].productId]) newS[updated[index].productId] = {};
      newS[updated[index].productId][currentRow.id] = toNumber(currentRow.stWt);
      setStoneAllocations(newS);

      const newC = { ...countAllocations };
      if (!newC[updated[index].productId]) newC[updated[index].productId] = {};
      newC[updated[index].productId][currentRow.id] = toNumber(currentRow.count || 0);
      setCountAllocations(newC);
    } else {
      updated[index].productId = "";
    }
  }

  setBillDetailRows(updated);
};


  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    if (field === "type") {
      updatedRows[index].type = value;

      if (value === "GoldRate") {
        updatedRows[index].givenGold = "";
        updatedRows[index].touch = "";
      } else if (value === "Gold") {
        updatedRows[index].goldRate = "";
        updatedRows[index].amount = "";
      }

      const goldRateVal = toNumber(updatedRows[index].goldRate);
      const givenGoldVal = toNumber(updatedRows[index].givenGold);
      const touchVal = toNumber(updatedRows[index].touch);
      const amountVal = toNumber(updatedRows[index].amount);
      let calculatedPurity = 0;
      if (goldRateVal > 0 && amountVal > 0)
        calculatedPurity = amountVal / goldRateVal;
      else if (givenGoldVal > 0 && touchVal > 0)
        calculatedPurity = givenGoldVal * (touchVal / 100);
      updatedRows[index].purityWeight = toFixedStr(calculatedPurity, 3);
      setRows(updatedRows);
      return;
    }

    const inputType = field === "date" ? "date" : "number";
    const validatedValue = validateInput( value, field, index, "receivedDetail", inputType);
    updatedRows[index][field] = validatedValue;
    const goldRate = toNumber(updatedRows[index].goldRate);
    const givenGold = toNumber(updatedRows[index].givenGold);
    const touch = toNumber(updatedRows[index].touch);
    const amount = toNumber(updatedRows[index].amount);

    let calculatedPurity = 0;
    if (goldRate > 0 && amount > 0) calculatedPurity = amount / goldRate;
    else if (givenGold > 0 && touch > 0)
      calculatedPurity = givenGold * (touch / 100);

    updatedRows[index].purityWeight = toFixedStr(calculatedPurity, 3);
    if (field === "hallmark") updatedRows[index].hallmark = value;
    setRows(updatedRows);
  };

  const getRemainingWeight = (productId, originalWeight) => {
    if (!weightAllocations[productId]) return originalWeight;
    const totalAllocated = Object.values(weightAllocations[productId]).reduce(
      (sum, weight) => sum + (toNumber(weight) || 0),  0);
    return Math.max(0, originalWeight - totalAllocated);
  };

    const getRemainingStone = (productId, originalStone) => {
    if (!stoneAllocations[productId]) return originalStone;
    const totalAllocated = Object.values(stoneAllocations[productId]).reduce(
      (sum, w) => sum + (toNumber(w) || 0), 0
    );
    return Math.max(0, originalStone - totalAllocated);
  };

  const getRemainingCount = (productId, originalCount) => {
    if (!countAllocations[productId]) return originalCount;
    const totalAllocated = Object.values(countAllocations[productId]).reduce(
      (sum, c) => sum + (toNumber(c) || 0), 0
    );
    return Math.max(0, originalCount - totalAllocated);
  };


const handleProductClick = (product) => {
  const productId = product.id || product._id;
  // remaining item weight (total remaining)
  const remainingWeight = getRemainingWeight(productId, product.itemWeight);
  if (remainingWeight <= 0) {
    alert(`No remaining weight available for ${product.itemName}`);
    return;
  }

  // remaining stone and count
  const remainingStone = getRemainingStone(productId, product.stoneWeight);
  const remainingCount = getRemainingCount(productId, product.count);

  // default to selecting 1 item (count) — user can change later
  const defaultCount = remainingCount > 0 ? 1 : 0;
  // If itemWeight is per-unit weight unknown, fallback to allocating equal share:
  // if product.count > 0 assume itemWeight is total and per-unit = itemWeight / count
  let perUnitWeight = toNumber(product.itemWeight);
  if (toNumber(product.count) > 0) perUnitWeight = toNumber(product.itemWeight) / Math.max(1, toNumber(product.count));
  const initialWt = Math.min(remainingWeight, perUnitWeight * defaultCount) || remainingWeight;

  const stWtValue = Math.min(remainingStone, toNumber(product.stoneWeight) || 0);
  // percent default to wastageValue
  const percentVal = product.wastageValue || 0;

  // compute awt and fwt correctly
  const awtVal = toNumber(initialWt) - toNumber(stWtValue);
  const fwtVal = percentVal ? (awtVal * toNumber(percentVal)) / 100 : 0;

  const newRow = {
    id: Date.now() + Math.random(),
    productId: productId,
    productName: product.itemName,
    count: defaultCount.toString(),
    wt: toFixedStr(initialWt, 3),
    stWt: toFixedStr(stWtValue, 3),
    awt: toFixedStr(awtVal, 3),
    percent: percentVal?.toString() || "0",
    fwt: toFixedStr(fwtVal, 3),
  };

  // update allocations for weight / stone / count
  const newWeightAlloc = { ...weightAllocations };
  if (!newWeightAlloc[productId]) newWeightAlloc[productId] = {};
  newWeightAlloc[productId][newRow.id] = toNumber(newRow.wt);
  setWeightAllocations(newWeightAlloc);

  const newStoneAlloc = { ...stoneAllocations };
  if (!newStoneAlloc[productId]) newStoneAlloc[productId] = {};
  newStoneAlloc[productId][newRow.id] = toNumber(newRow.stWt);
  setStoneAllocations(newStoneAlloc);

  const newCountAlloc = { ...countAllocations };
  if (!newCountAlloc[productId]) newCountAlloc[productId] = {};
  newCountAlloc[productId][newRow.id] = toNumber(newRow.count);
  setCountAllocations(newCountAlloc);

  setBillDetailRows((prev) => [...prev, newRow]);
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
      const FWT = billDetailRows.reduce((total, row) => total + (toNumber(row.fwt) || 0),0 );
      const totalReceivedPurity = rows.reduce((acc, row) => acc + (toNumber(row.purityWeight) || 0), 0);
      const TotalFWT = toNumber(FWT) - toNumber(previousBalance);
      const pureBalance = TotalFWT - totalReceivedPurity;
      const now = new Date();

      const billData = {
        date: now.toISOString(),
        time: now.toISOString(),
        customerId: selectedCustomer.id || selectedCustomer._id,
        billTotal: FWT,
        hallMark: toNumber(billHallmark) || 0,
        pureBalance: toFixedStr(pureBalance, 3),
        hallmarkBalance: toNumber(hallmarkBalance) + toNumber(prevHallmark),
        prevHallmark:prevHallmark,
        prevBalance:previousBalance,
        billDetailsprofit:billDetailsProfit,
        Stoneprofit:stoneProfit,
        Totalprofit:totalBillProfit,
      
        orderItems: billDetailRows.map((row) => ({
          stockId: row.productId,
          productName: row.productName,
          weight: toNumber(row.wt),
          stoneWeight: toNumber(row.stWt),
          afterWeight: toNumber(row.awt),
          percentage: toNumber(row.percent),
          finalWeight: toNumber(row.fwt),
        })),
        received: rows.map((row) => ({
          date: row.date,
          cash: toNumber(row.cash),
          gold: toNumber(row.givenGold),
          touch: toNumber(row.touch),
          purity: toNumber(row.purityWeight),
          receiveHallMark: toNumber(row.hallmark),
          amount: toNumber(row.amount),
        })),
      };
      console.log("Payload being sent:", billData);
      const response = await fetch(`${BACKEND_SERVER_URL}/api/bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error( errorData.msg || `HTTP error! status: ${response.status}`);
      }
      await response.json();
      toast.success("Bill saved successfully!");
    
      setBillDetailRows([]);
      setRows([]);
      setSelectedCustomer(null);
      setBillHallmark("");
      setWeightAllocations({});
      setFieldErrors({});
      setPrevHallmark(0);
      setPreviousBalance(0);
    } catch (error) {
      console.error("Error saving bill:", error);
      alert(`Error saving bill: ${error.message}`);
      return;
    }
  };

  // const handleUpdate = async () => {
  //   if (!currentBill || !currentBill.id) {
  //     alert("No bill selected to update.");
  //     return;
  //   }
  //   // const isFrmValid = validateAllFields();
  //   // if (!isFrmValid) {
  //   // alert("Please fill in all required fields");
  //   // return;
  //   // }

  //   try {
  //     const FWT = billDetailRows.reduce(
  //       (total, row) => total + (toNumber(row.fwt) || 0),
  //       0
  //     );
  //     const totalReceivedPurity = rows.reduce(
  //       (acc, row) => acc + (toNumber(row.purityWeight) || 0),
  //       0
  //     );
  //     const TotalFWT = FWT - previousBalance;
  //     const pureBalance = TotalFWT - totalReceivedPurity;

  //     const billData = {
  //       // billno: currentBill.billno,
  //       // date,
  //       // time,
  //       customerId: selectedCustomer.id || selectedCustomer._id,
  //       billTotal: FWT,
  //       hallMark: toNumber(billHallmark) || 0,
  //       pureBalance: toFixedStr(pureBalance, 3),
  //       hallmarkBalance: toNumber(hallmarkBalance) + toNumber(prevHallmark),
  //       // previousBalance,
  //       // prevHallmark,
  //       // currentHallmark: toNumber(billHallmark) || 0,
  //       // orderItems: billDetailRows.map((row) => ({
  //       // productName: row.productName,
  //       // weight: toNumber(row.wt),
  //       // stoneWeight: toNumber(row.stWt),
  //       // afterWeight: toNumber(row.awt),
  //       // percentage: toNumber(row.percent),
  //       // finalWeight: toNumber(row.fwt),
  //       // })),
  //       received: rows
  //         .filter((row) => !row.id || !row.isLocked)
  //         .map((row) => ({
  //           date: row.date,
  //           type: row.type,
  //           goldRate: toNumber(row.goldRate),
  //           gold: toNumber(row.givenGold),
  //           touch: toNumber(row.touch),
  //           purity: toNumber(row.purityWeight),
  //           receiveHallMark: toNumber(row.hallmark),
  //           amount: toNumber(row.amount),
  //         })),
  //     };
  //     console.log("Update Payload:", billData);
  //     const response = await fetch(
  //       `${BACKEND_SERVER_URL}/api/bill/updateBill/${selectedCustomer.id}/${currentBill.id}`,
  //       { method: "PUT",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify(billData), });

  //     if (!response.ok) {
  //       const errorData = await response.json().catch(() => ({}));
  //       throw new Error( errorData.msg || `HTTP error! status: ${response.status}` ); }
  //     toast.success("Bill updated successfully!", { autoClose: 1000 });
  //     alert("Bill updated successfully!");
  //     await response.json();

  //     // reset state after update
  //     setBillDetailRows([]);
  //     setRows([]);
  //     setSelectedCustomer(null);
  //     setBillHallmark("");
  //     setWeightAllocations({});
  //     setFieldErrors({});
  //     setViewMode(false);
  //     setCurrentBill(null);
  //     setPrevHallmark(0);
  //     setPreviousBalance(0);
  //   } catch (error) {
  //     console.error("Error updating bill:", error);
  //     alert(`Error updating bill: ${error.message}`);
  //   }
  // };



  // === derived values ===
  const FWT = useMemo( () =>billDetailRows.reduce( (total, row) => total + (toNumber(row.fwt) || 0), 0), [billDetailRows] );
  const { billDetailsProfit, stoneProfit, totalBillProfit, billProfitPercentage } = useMemo(() => {
    let detailsProfit = 0;
    let stoneProfitCalc = 0;

    console.log('=== PROFIT CALCULATION DEBUG ===');
    console.log('billDetailRows:', billDetailRows);
    console.log('items:', items);
    console.log('availableProducts:', availableProducts);

    billDetailRows.forEach((row, index) => {
      console.log(`\n--- Row ${index + 1}: ${row.productName} ---`);
       // Find the product stock for touch value
      const productStock = availableProducts?.allStock?.find(product => (product.id || product._id) === row.productId);
      if (!productStock) alert('no products available');
      const awt = toNumber(row.awt);
      const fwt = toNumber(row.fwt);
      // const enteredStoneWt = toNumber(row.stWt);
      const enteredPercentage = toNumber(row.percent);
      // console.log('AWT:', awt, 'FWT:', fwt, 'Stone WT:', enteredStoneWt, 'Entered %:', enteredPercentage);
      
      if (productStock) {
        console.log('Found product stock:', productStock);
        
        // Bill Details Profit: (awt × wastage%) - fwt
        // Use the wastage from productStock (availableProducts), not items
        const wastageValue = toNumber(productStock.wastageValue) || 0;
        const purityFromWastage = (awt * wastageValue) / 100;
        const rowBillProfit = purityFromWastage - fwt;
        detailsProfit += rowBillProfit;
        
        console.log('Wastage Value:', wastageValue);
        console.log('Purity from Wastage:', purityFromWastage);
        console.log('Row Bill Profit:', rowBillProfit);
        
        // Stone Profit: stockremaing wieght × product.touch%
        const remainingStone = getRemainingStone(row.productId, productStock.stoneWeight);
        const touchValue = toNumber(productStock.touch) || 0;
        // const rowStoneProfit = (enteredStoneWt * touchValue) / 100;
        const rowStoneProfit = (toNumber(remainingStone) * touchValue) / 100;
        stoneProfitCalc += rowStoneProfit;
        
        console.log('Touch Value:', touchValue);
        console.log('Row Stone Profit:', rowStoneProfit);
      } else {
        console.log('Product stock not found for productId:', row.productId);
      }
    });

    const totalProfit = detailsProfit + stoneProfitCalc;
    const profitPercentage = FWT > 0 ? (totalProfit / FWT) * 100 : 0;

    console.log('\n=== FINAL RESULTS ===');
    console.log('Details Profit:', detailsProfit);
    console.log('Stone Profit:', stoneProfitCalc);
    console.log('Total Profit:', totalProfit);
    console.log('Profit %:', profitPercentage);

    return {
      billDetailsProfit: toFixedStr(detailsProfit, 3),
      stoneProfit: toFixedStr(stoneProfitCalc, 3),
      totalBillProfit: toFixedStr(totalProfit, 3),
      billProfitPercentage: toFixedStr(profitPercentage, 2),
    };
  }, [billDetailRows, items, availableProducts, FWT]);
  const totalReceivedPurity = useMemo(() => rows.reduce((acc, row) => acc + (toNumber(row.purityWeight) || 0), 0),  [rows]  );
  const TotalFWT = FWT - previousBalance;
  const pureBalance = TotalFWT - totalReceivedPurity;
  const lastGoldRate = [...rows].reverse().find((row) => toNumber(row.goldRate))?.goldRate;
  const cashBalance = lastGoldRate  ? (toNumber(lastGoldRate) * pureBalance).toFixed(2) : "0.00";
  const totalBillHallmark = toNumber(billHallmark);
  const totalReceivedHallmark = rows.reduce((total, row) => total + (toNumber(row.hallmark) || 0),  0);
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
    let filtered = originalProducts.allStock || [];
    if (filter)
      filtered = filtered.filter((product) => product.itemName === filter);
    if (search) {
      filtered = filtered.filter((product) =>  product.itemName.toLowerCase().includes(search) ||  product.touch.toString().toLowerCase().includes(search));
    }
    setAvailableProducts({ allStock: filtered });
  };

  const getUniqueProductNames = () => {
    if (!originalProducts) return [];
    const uniqueNames = [...new Set( (originalProducts.allStock || []).map((product) => product.itemName)),];
    return uniqueNames.sort();
  };

  const handleReset = () => {
    setBillDetailRows([]);
    setRows([]);
    setSelectedCustomer(null);
    setBillHallmark("");
    setWeightAllocations({});
    setFieldErrors({});
    setPrevHallmark(0);
    setPreviousBalance(0);
    console.log("Bill Reset Successfully");
    toast.success("Bill Reset Successfully", { autoClose: 1000 });
  };

  const handleExit = () => {
    fetchAllBills();
    setBillDetailRows([]);
    setRows([]);
    setSelectedCustomer(null);
    setBillHallmark("");
    setWeightAllocations({});
    setFieldErrors({});
    setViewMode(false);
    setPrevHallmark(0);
    setPreviousBalance(0);
    toast.info("Exited view mode", { autoClose: 1000 });
  };

  const handleViewBill = (id) => {
    const bill = bills.find((b) => b.id === id);
    setCurrentBill(bill || null);
    if (!bill) return alert("Bill not found");
    setBillId(bill.id)
    setBillDetailRows(
      (bill.orders || []).map((item) => ({
        id: item.id,
        productId: item.stockId,
        productName: item.productName,
        wt: item.weight?.toString() || "",
        stWt: item.stoneWeight?.toString() || "",
        awt: item.afterWeight?.toString() || "",
        percent: item.percentage?.toString() || "",
        fwt: item.finalWeight?.toString() || "",
      }))
    );
    console.log('billReceive',bill.billReceive)
    setRows(
      (bill.billReceive || []).map((item) => ({
        id: item.id,
        date: item.date ,
        type: toNumber(item.cash) > 0 ? "Cash" : "Gold",
        goldRate: item.goldRate?.toString() || "",
        givenGold: item.gold?.toString() || "",
        touch: item.touch?.toString() || "",
        purityWeight: item.purity?.toString() || "",
        amount: item.amount?.toString() || "",
        hallmark: item.receiveHallMark?.toString() || "",
        isLocked: true,
      }))
    );
    console.log();
    setSelectedCustomer(bill.customers || null);
    console.log("BILL VIEW:", bill);
    setBillHallmark(bill.hallMark || "");
    setPreviousBalance(bill.PrevBalance || 0);
    setPrevHallmark(bill.prevHallMark || "");
    setViewMode(true);
    setIsModal(false);
  };

  const inputStyle = {
    minWidth: "70px",
    width: "100%",
    padding: "6px 8px",
    fontSize: "13px",
    height: "32px",
    boxSizing: "border-box",
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 600,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
    borderRadius: "10px",
  };

  const sidebarButtonSX = {
    display: "flex",
    color:"white",
    backgroundColor:"#0a4c9a",
    flexDirection: "row",
    gap: "10px",
    cursor: "pointer",
    marginBottom:"5px",
    padding: "8px 12px",
    borderRadius: "8px",
    "&:hover": { backgroundColor: "#0a4c9a" },
    alignSelf: "center",
    width:80,
  };

   const fetchAllBills = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/bill`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setBillId(data.billId);
        setBills(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        console.error("Error fetching bills:", error);
      }
    };

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/customers`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };

    const fetchItems = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/master-items`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    const fetchProductStock = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/productStock`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setAvailableProducts(data);
        setOriginalProducts(data);
      } catch (error) {
        console.error("Error fetching Available Products:", error);
      }
    };

    const fecthAllEntries = async () => {
      setTouch;
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/master-touch`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log("Touch", data);
        setTouch(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching bills:", error);
      }
    };
    fecthAllEntries();
    fetchAllBills();
    fetchProductStock();
    fetchItems();
    fetchCustomers();
  }, []);

  // Determine which Received columns to show (keeps header + rows aligned)
  const showGoldRateColumn = rows.length === 0  ? true : rows.some((r) => r.type === "" || r.type === "Cash");
  const showGivenGoldColumn = rows.length === 0  ? true  : rows.some((r) => r.type === "" || r.type === "Gold");
  const showTouchColumn = showGivenGoldColumn;
  const showAmountColumn =  rows.length === 0  ? true  : rows.some((r) => r.type === "" || r.type === "Cash");

  const visibleReceivedCols = 1/*S.No*/+ 1/*Date*/+ 1/*Type*/+(showGoldRateColumn ? 1 : 0) + (showGivenGoldColumn ? 1 : 0) + (showTouchColumn ? 1 : 0) + 1/*Purity*/+ (showAmountColumn ? 1 : 0) + 1/*Hallmark*/+1;/*Action*/

  return (
    <Box className="billing-wrapper">
      {/* Left panel */}
      <Box className="left-panel" 
      style={{ maxwidth:'65%',
         position: viewMode ? 'absolute' : '',
         left:viewMode ? '15%' : '',
        }}
      >
        <Tooltip title="View Bills" arrow placement="right">
          <Box onClick={() => setIsModal(true)} sx={sidebarButtonSX}>
            <ReceiptLongIcon /><span>View</span>
          </Box>
      </Tooltip>

      <Box  style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          marginTop: -45,
          gap: "10px",
        }}
      >
        {viewMode && (
          <Box onClick={handleExit} style={sidebarButtonSX}>
            <ExitToAppIcon /><span>Exit</span>
          </Box>  )}

        {!viewMode && ( <Tooltip title="Reset Bill" arrow placement="right">
            <Box
              onClick={handleReset}
              style={{
                display: "flex",
                color: "white",
                backgroundColor: "#0a4c9a",
                flexDirection: "row",
                gap: "10px",
                cursor: "pointer",
                marginBottom: "5px",
                padding: "8px 12px",
                borderRadius: "8px",
                alignSelf: "center",
                width: 80,
              }}
            >
              <RestartAltIcon /><span>Reset</span>
            </Box>
          </Tooltip>
        )}
      </Box>
        <h1 className="heading">Estimate Only</h1>
        <Box className="bill-header">
          {viewMode ? (
            <>
              <Box className="bill-number">
                <p> <strong>Bill No:</strong> {billId} </p>
              </Box>
              <Box className="bill-info">
                <p>
                  <strong>Date:</strong>{" "}
                  {currentBill?.date  ? new Date(currentBill.date).toLocaleDateString("en-IN")  : ""}
                  <br />
                  <br />
                  <strong>Time:</strong>{" "}
                  {currentBill?.time  ? new Date(currentBill.time).toLocaleTimeString("en-IN", {  hour: "2-digit",  minute: "2-digit",  hour12: true,  })  : ""}
                </p>
              </Box>
            </>
          ) : (
            <>
              <Box className="bill-number">
                <p> <strong>Bill No:</strong> {billId} </p>
              </Box>
              <Box className="bill-info">
                <p> <strong>Date:</strong> {date} <br /><br /> <strong>Time:</strong> {time}  </p>
              </Box>
            </>
          )}
        </Box>

        <Box className="search-section no-print">
          <Autocomplete
            options={customers}
            getOptionLabel={(option) => option.name || ""}
            onChange={(_, newValue) => {
              setSelectedCustomer(newValue);
              if (newValue) {
                setPreviousBalance(newValue.customerBillBalance?.balance || 0);
                setPrevHallmark(newValue.customerBillBalance?.hallMarkBal || 0);
              } else {
                setPreviousBalance(0);
                setPrevHallmark(0);
              }
            }}
            value={selectedCustomer}
            disabled={viewMode}
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
            <p> <strong>Name:</strong> {selectedCustomer.name} </p>
          </Box>
        )}

        {/* Bill details table */}
        <Box className="items-section">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>Bill Details:</h3>
          </Box>

          <Table
            className="table"
            style={{
              marginTop: "10px",
              minWidth: "500px",
              width: "100%",
              tableLayout: "fixed",
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell className="th">S.No</TableCell>
                <TableCell className="th">Product Name</TableCell>
                <TableCell className="th">Count</TableCell>
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
                        disabled={viewMode}
                        onChange={(e) => handleBillDetailChange(index, "productName", e.target.value )}
                        inputProps={{ style: inputStyle }}
                        error={!!fieldErrors[`billDetail_${index}_productName`]}
                        helperText={fieldErrors[`billDetail_${index}_productName`] || ""}
                      />
                    </TableCell>

                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.count}
                        disabled={viewMode}
                        onChange={(e) => handleNumericInput(e, (ev) => handleBillDetailChange(index, "count", ev.target.value))}
                        inputProps={{ style: inputStyle }}
                        error={!!fieldErrors[`billDetail_${index}_wt`]}
                        helperText={fieldErrors[`billDetSeletail_${index}_wt`] || ""}
                      />
                    </TableCell>

                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.wt}
                        disabled={viewMode}
                        onChange={(e) => handleNumericInput(e, (ev) => handleBillDetailChange(index, "wt", ev.target.value))}
                        inputProps={{ style: inputStyle }}
                        error={!!fieldErrors[`billDetail_${index}_wt`]}
                        helperText={fieldErrors[`billDetSeletail_${index}_wt`] || ""}
                      />
                    </TableCell>
                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.stWt}
                        disabled={viewMode}
                        onChange={(e) =>handleNumericInput(e, (ev) => handleBillDetailChange(index,"stWt",ev.target.value))}
                        inputProps={{ style: inputStyle }}
                        error={!!fieldErrors[`billDetail_${index}_stWt`]}
                        helperText={ fieldErrors[`billDetail_${index}_stWt`] || "" }
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
                        disabled={viewMode}
                        onChange={(e) => handleNumericInput(e, (ev) =>  handleBillDetailChange(index,"percent",ev.target.value))}
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
                      <IconButton
                        onClick={() => handleDeleteBillDetailRow(index)}
                        disabled={viewMode}
                      >
                        <MdDeleteForever
                          style={{
                            color: viewMode ? "#D25D5D" : "red",
                            fontSize: "20px",
                          }}
                        />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="no-products-message">
                    No Bill details added
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Hallmark / Balance */}
          <Box
            className="hallmark-balance-wrapper"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 4,
              mt: 2,
            }}
          >
            <Box
              className="hallmark-column"
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Box>
                <strong>Hallmark Balance:</strong>{" "}
                {prevHallmark ? toFixedStr(prevHallmark, 3) : "000.000"}
              </Box>
              <TextField
                size="small"
                type="text"
                label="Current Hallmark"
                value={billHallmark}
                disabled={viewMode}
                onChange={(e) =>
                  handleNumericInput(e, (ev) => { const validatedValue = validateInput( ev.target.value,"billHallmark",0,"hallmark","number");
                    setBillHallmark(validatedValue);
                    })
                  }
                  sx={{ width: 150 }}
                  error={!!fieldErrors["hallmark_0_billHallmark"]}
                  helperText={fieldErrors["hallmark_0_billHallmark"] || ""}
                  />
                </Box>

                <Box className="balance-info">
                  {previousBalance > 0 ? (
                      <>
                        <div className="negative">
                          Opening Balance: {toFixedStr(previousBalance, 3)}
                        </div>
                        <div>FWT: {toFixedStr(FWT, 3)}</div>
                        <div>Total FWT: {toFixedStr(toNumber(FWT) + toNumber(previousBalance), 3)}</div>
                      </>
                    ) : previousBalance < 0 ? (
                      <>
                        <div className="positive">
                          Excess Balance: {toFixedStr(Math.abs(previousBalance), 3)}
                        </div>
                        <div>FWT: {toFixedStr(FWT, 3)}</div>
                        <div>Total FWT: {toFixedStr(toNumber(FWT) + toNumber(previousBalance), 3)}</div>
                      </>
                    ) : (
                      <>
                        <div className="neutral">Balance: 0.000</div>
                        <div>FWT: {toFixedStr(FWT, 3)}</div>
                        <div>Total FWT: {toFixedStr(toNumber(FWT), 3)}</div>
                      </>
                    )}
            </Box>
          </Box>

          {/* Received Details */}
          <Box className="items-section" sx={{ marginTop: 2 }}>
            {!viewMode && <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>Received Details:</h3>
              <IconButton onClick={handleAddRow} className="no-print">  <AddCircleOutlineIcon /> </IconButton>
            </div>}

            <Table
              className="table received-details-table"
              style={{
                marginTop: "10px",
                minWidth: "500px",
                width: "100%",
                tableLayout: "fixed",
              }}
            >
                
              <TableHead>
                <TableRow style={{ textAlign: "center" }}>
                  <TableCell className="th">S.No</TableCell>
                  <TableCell className="th">Date</TableCell>
                  <TableCell className="th">Type</TableCell>
                  {showGoldRateColumn && ( <TableCell className="th">Gold Rate</TableCell>)}
                  {showGivenGoldColumn && ( <TableCell className="th">Gold</TableCell>)}
                  {showTouchColumn && (<TableCell className="th">Touch</TableCell> )}
                  <TableCell className="th">Purity WT</TableCell>
                  {showAmountColumn && (<TableCell className="th">Amount</TableCell>)}
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
                          disabled={row.isLocked}
                          onChange={(e) =>handleRowChange(index, "date", e.target.value) }
                          inputProps={{ style: inputStyle }}
                          error={!!fieldErrors[`receivedDetail_${index}_date`]}
                          helperText={fieldErrors[`receivedDetail_${index}_date`] || ""}
                        />
                      </TableCell>

                      <TableCell className="td">
                        <Select
                          size="small"
                          value={row.type}
                          displayEmpty
                          disabled={row.isLocked}
                          onChange={(e) => handleRowChange(index, "type", e.target.value)}
                        >
                          <MenuItem value="" disabled>
                            <em>Select Type</em>
                          </MenuItem>
                          <MenuItem value="Gold">Gold</MenuItem>
                          <MenuItem value="Cash">Cash</MenuItem>
                        </Select>
                        {fieldErrors[`receivedDetail_${index}_type`] && (
                          <div style={{ color: "red", fontSize: "12px" }}>
                            {fieldErrors[`receivedDetail_${index}_type`]}
                          </div>
                        )}
                      </TableCell>

                      {showGoldRateColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Cash") && (
                            <TextField
                              size="small"
                              type="text"
                              value={row.goldRate}
                              disabled={row.isLocked}
                              onChange={(e) =>handleNumericInput(e, (ev) =>handleRowChange(index, "goldRate",ev.target.value )) }
                              inputProps={{ style: inputStyle }}
                              error={ !!fieldErrors[ `receivedDetail_${index}_goldRate` ] }
                              helperText={ fieldErrors[ `receivedDetail_${index}_goldRate`] || ""}
                            />
                          )}
                        </TableCell>
                      )}

                      {showGivenGoldColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Gold") && (
                            <TextField
                              size="small"
                              type="text"
                              value={row.givenGold}
                              disabled={row.isLocked}
                              onChange={(e) => handleNumericInput(e, (ev) =>handleRowChange(index,"givenGold",ev.target.value ))}
                              inputProps={{ style: inputStyle }}
                              error={ !!fieldErrors[ `receivedDetail_${index}_givenGold` ] }
                              helperText={fieldErrors[  `receivedDetail_${index}_givenGold` ] || "" }
                            />
                          )}
                        </TableCell>
                      )}

                      {showTouchColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Gold") && (
                            <TextField
                              size="small"
                              select
                              value={row.touch || ""}
                              disabled={row.isLocked}
                              onChange={(e) => handleNumericInput(e, (ev) => handleRowChange(index,"touch",ev.target.value ))}
                              inputProps={{ style: inputStyle }}
                              error={!!fieldErrors[`receivedDetail_${index}_touch`] }
                              helperText={ fieldErrors[`receivedDetail_${index}_touch`] || ""}
                              sx={{ width: "100%" }}
                            >
                              <MenuItem value=""> <em>Select Touch</em></MenuItem>
                              {touch.map((t) => (
                                <MenuItem key={t.id} value={t.touch}>{t.touch} </MenuItem>
                              ))}
                            </TextField>
                          )}
                        </TableCell>
                      )}

                      <TableCell className="td">
                        <TextField
                          size="small"
                          value={row.purityWeight}
                          disabled
                          inputProps={{ style: inputStyle }}
                        />
                      </TableCell>

                      {showAmountColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Cash") && (
                            <TextField
                              size="small"
                              type="text"
                              value={row.amount}
                              disabled={row.isLocked}
                              onChange={(e) => handleNumericInput(e, (ev) => handleRowChange(index,"amount",ev.target.value))}
                              inputProps={{ style: inputStyle }}
                              error={ !!fieldErrors[`receivedDetail_${index}_amount`]}
                              helperText={fieldErrors[`receivedDetail_${index}_amount`] || ""}
                            />
                          )}
                        </TableCell>
                      )}

                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="text"
                          value={row.hallmark}
                          disabled={row.isLocked}
                          onChange={(e) => handleNumericInput(e, (ev) => handleRowChange(index,"hallmark",  ev.target.value ))}
                          inputProps={{ style: inputStyle }}
                          error={!!fieldErrors[`receivedDetail_${index}_hallmark`]}
                          helperText={fieldErrors[`receivedDetail_${index}_hallmark`] || "" }
                        />
                      </TableCell>

                      <TableCell className="td no-print">
                        <IconButton
                          onClick={() => handleDeleteRow(index)}
                          disabled={row.isLocked}
                        >
                          <MdDeleteForever style={{ color: row.isLocked ? "#D25D5D" : "red" }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleReceivedCols} className="no-products-message" >No Received details added </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "10px",
                padding: "8px 12px",
                backgroundColor: "#f9f9f9",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "bold",
                color: "#333"
              }}
            >
              <div>Bill Details Profit: <span style={{ color: "green" }}>{billDetailsProfit}</span></div>
              <div>Stone Profit: <span style={{ color: "green" }}>{stoneProfit}</span></div>
              <div>Total Profit: <span style={{ color: "#0a4c9a" }}>{totalBillProfit}</span></div>
              {/* <div>Profit %: <span style={{ color: "#d9534f" }}>{billProfitPercentage}%</span></div> */}
            </div>

          <Box className="closing-balance">
            
            <div className="flex">
              <strong>Cash Balance: {cashBalance}</strong>
              <strong> Pure Balance: {toFixedStr(TotalFWT - totalReceivedPurity, 3)}</strong>
              <strong> Hallmark Balance:{" "} {toFixedStr(hallmarkBalance + prevHallmark, 3)} </strong>
            </div>
            
          </Box>
          <Box style={{display:"flex",justifyContent:'center'}}>
            {/* {viewMode ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpdate}
              className="save-button no-print"
            >
              Update</Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              className="save-button no-print"
              onClick={handleSave}
            >
              Save</Button>
          )} */}
          {!viewMode && <Button
              variant="contained"
              color="primary"
              className="save-button no-print"
              onClick={handleSave}
            >
              Save</Button>}

           <Button
              variant="contained"
              color="primary"
              onClick={() => window.print()}
              className="save-button no-print"
           > 
            Print </Button>
            </Box>
        </Box>
      </Box>

      {/* Right panel: available products (hidden in viewMode) */}
      {!viewMode && (
        <Box className="right-panel no-print">
          <h3 className="heading">Available Products</h3>

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
                  <MenuItem key={productName} value={productName}>{productName} </MenuItem>  ))}
              </Select>
            </FormControl>
          </Box>

          <Box className="table-container" sx={{ marginTop: "10px" }}>
            <Table className="table">
              <TableHead
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  backgroundColor: "#06387a",
                  borderRadius: "10px",
                }}
              >
                <TableRow>
                  <TableCell className="th" style={{ textAlign: "center" }}>S.No </TableCell>
                  <TableCell className="th" style={{ textAlign: "center" }}>Item Name</TableCell>
             {/*  <TableCell className="th" style={{ textAlign: "center" }}>Original WT</TableCell>
                  <TableCell className="th" style={{ textAlign: "center" }}>Remaining WT</TableCell> */}
                   <TableCell className="th" style={{ textAlign: "center" }}>Item WT</TableCell>
                   <TableCell className="th" style={{ textAlign: "center" }}>Stone WT</TableCell>
                  <TableCell className="th" style={{ textAlign: "center" }}>Count </TableCell>
                  <TableCell className="th" style={{ textAlign: "center" }}>Wastage</TableCell>
                  <TableCell className="th" style={{ textAlign: "center" }}>Touch</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableProducts &&
                  (availableProducts.allStock || []).map((prodata, index) => {
                    const productId = prodata.id || prodata._id;
                    const remainingWeight = getRemainingWeight( productId,  prodata.itemWeight);
                    const isFullyAllocated = remainingWeight <= 0;
                    return (
                      <TableRow
                        key={index}
                        hover
                        style={{
                          cursor: viewMode || isFullyAllocated ? "not-allowed"  : "pointer",
                          backgroundColor: isFullyAllocated  ? "#f5f5f5"  : "transparent",
                          opacity: viewMode || isFullyAllocated ? 0.6 : 1,
                          textAlign: "center",
                          pointerEvents: viewMode ? "none" : "auto",
                        }}
                        onClick={() => {
                          if (!viewMode && !isFullyAllocated)
                            handleProductClick(prodata);
                        }}                        
                      >
                        <TableCell className="td" style={{ textAlign: "center" }} > {index + 1} </TableCell> 
                        <TableCell className="td" style={{ textAlign: "center" }} > {prodata.itemName} </TableCell> 
                        {/* <TableCell className="td" style={{ textAlign: "center" }} > {prodata.itemWeight}  </TableCell> */}
                        <TableCell className="td" style={{ color: remainingWeight <= 0 ? "red" : "green", fontWeight: "bold",textAlign: "center",}}>{toNumber(remainingWeight).toFixed(3)}</TableCell> 
                        <TableCell className="td" style={{ textAlign: "center" }} >
                          {toNumber(getRemainingStone(productId, prodata.stoneWeight)).toFixed(3)}</TableCell>
                        <TableCell className="td" style={{ textAlign: "center" }} >
                          {toNumber(getRemainingCount(productId, prodata.count)).toString()}</TableCell>
                        <TableCell className="td" style={{ textAlign: "center" }} > {prodata.wastageValue} </TableCell> 
                        <TableCell className="td" style={{ textAlign: "center" }} > {prodata.touch} </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Box>
          <ToastContainer />
        </Box>
      )}

      {/* Modal to view all bills */}
      <Modal open={isModal} onClose={() => setIsModal(false)}>
        <Box sx={modalStyle}>
          <Typography variant="h6" component="h2" gutterBottom>
            All Bills
          </Typography>
          <Button
            style={{
              position: "absolute",
              top: 30,
              right: 20,
              minWidth: "30px",
              height: "30px",
              borderRadius: "50%",
              padding: 0,
              fontSize: "16px",
              lineHeight: 1,
              backgroundColor: "#f44336",
              color: "white",
              cursor: "pointer",
            }}
            onClick={() => setIsModal(false)}
          >
            x </Button>

          <Table
            sx={{
              maxHeight: 700,
              maxWidth: 600,
              overflowY: "auto",
              display: "block",
            }}
          >
            <TableHead>
              <TableRow
                style={{
                  backgroundColor: "#06387a",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                <TableCell style={{ textAlign: "center", color: "white", width: "90px" }}>  ID </TableCell>
                <TableCell style={{ textAlign: "center", color: "white", width: "90px" }} >Customer </TableCell>
                <TableCell style={{ textAlign: "center", color: "white", width: "90px" }}> Amount </TableCell>
                <TableCell style={{ textAlign: "center", color: "white", width: "90px" }} >  Date </TableCell>
                <TableCell style={{ textAlign: "center", color: "white", width: "90px" }}> Actions </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(bills) && bills.length > 0 ? (
                bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell style={{ textAlign: "center" }}>  {bill.id} </TableCell>
                    <TableCell style={{ textAlign: "center" }}> {bill.customers?.name || "N/A"} </TableCell>
                    <TableCell style={{ textAlign: "center" }}>  {bill.billAmount} </TableCell>
                    <TableCell style={{ textAlign: "center" }}>  {new Date(bill.createdAt).toLocaleDateString()} </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleViewBill(bill.id)}
                        sx={{ mr: 1 }}
                      >
                        View </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} style={{ textAlign: "center" }}> No bills found </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Modal>
    </Box>
  );
};

export default Billing;
