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
  Tooltip, Modal,
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
import PrintableBill from "./PrintableBill";
import ReactDOMServer from 'react-dom/server';
import axios from "axios";
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
  const [time,setTime] = useState(
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
  const [cashBalance, setCashBalance] = useState("0.00");
  //only for this display while view mode
  const [BillDetailsProfit,setBillDetailsProfit] =useState([]);
  const [StoneProfit,setStoneProfit] =useState([]);
  const [TotalBillProfit,setTotalBillProfit] =useState([]);
  // const [totalFWT,setTotalFWT] =useState(0);

  //for hallmark rate and qty
  const [hallmarkQty, setHallmarkQty] = useState(0);

  // keep track how many bill rows were added for each productId for css
  const [selectedProductCounts, setSelectedProductCounts] = useState({});

  const [printBill,setPrintBill]=useState([])
  const [isSaving, setIsSaving] = useState(false);
  const [billNo, setBillNo] = useState("");

  const [stockSource, setStockSource] = useState("ALL");

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

  // const handleAddBillDetailRow = () => {
  //   setBillDetailRows((prev) => [
  //     ...prev,{
  //       id: Date.now() + Math.random(),
  //       productId: "",
  //       productName: "",
  //       wt: "",
  //       stWt: "",
  //       awt: "",
  //       percent: "",
  //       fwt: "",
  //     },
  //   ]);
  // };

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
      //css changes
      if (rowToDelete?.productId) {
        setSelectedProductCounts((prev) => {
          const copy = { ...prev };
          const pid = rowToDelete.productId;
          if (!copy[pid]) return copy;
          copy[pid] = copy[pid] - 1;
          if (copy[pid] <= 0) delete copy[pid];
          return copy;
        });
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
      if (field === 'wt' && currentRow.productId) {
      const productStock = availableProducts?.allStock?.find(
        p => (p.id || p._id) === currentRow.productId
      );
      if (productStock) {
        const remaining = getRemainingWeight(currentRow.productId, productStock.itemWeight)
          + toNumber(weightAllocations[currentRow.productId]?.[currentRow.id] || 0); 
        // allow current row’s existing allocation
        // if (toNumber(value) > remaining) {
        //   toast.error(`Entered weight (${value}) exceeds remaining weight (${remaining.toFixed(3)}) for ${currentRow.productName}`, { autoClose: 3000 });
        //   alert(`Entered weight (${value}) exceeds remaining weight (${remaining.toFixed(3)}) for ${currentRow.productName}`);
        //   return;
        // }
      }
    }

    const eStWt = toNumber(currentRow.eStWt);
      if (field === 'eStWt' && currentRow.productId) {
      const productStock = availableProducts?.allStock?.find(
        p => (p.id || p._id) === currentRow.productId
      );
      if (productStock) {
        const remaining = getRemainingStone(currentRow.productId, productStock.stoneWeight)
          + toNumber(stoneAllocations[currentRow.productId]?.[currentRow.id] || 0); 
        // allow current row’s existing allocation
        if (toNumber(value) > remaining) {
          toast.error(`Entered weight (${value}) exceeds remaining stone weight (${remaining.toFixed(3)}) for ${currentRow.productName}`, { autoClose: 3000 });
          alert(`Entered weight (${value}) exceeds remaining stone weight (${remaining.toFixed(3)}) for ${currentRow.productName}`);
          return; // abort update
        }
      }
    }

    const aStWt = toNumber(currentRow.aStWt);
    //   if (field === 'aStWt' && currentRow.productId) {
    //   const productStock = availableProducts?.allStock?.find(
    //     p => (p.id || p._id) === currentRow.productId
    //   );
    //   if (productStock) {
    //     const remaining = getRemainingStone(currentRow.productId, productStock.stoneWeight)
    //       + toNumber(stoneAllocations[currentRow.productId]?.[currentRow.id] || 0); 
    //     // allow current row’s existing allocation
    //     if (toNumber(value) > remaining) {
    //       toast.error(`Entered weight (${value}) exceeds remaining stone weight (${remaining.toFixed(3)}) for ${currentRow.productName}`, { autoClose: 3000 });
    //       alert(`Entered weight (${value}) exceeds remaining stone weight (${remaining.toFixed(3)}) for ${currentRow.productName}`);
    //       return; // abort update
    //     }
    //   }
    // }
    if (field === "aStWt") {
      if (toNumber(value) > toNumber(currentRow.eStWt)) {
        toast.error("Actual stone cannot exceed expected stone");
        alert("Actual stone cannot exceed expected stone");
        return;
      }
    }


    const count = toNumber(currentRow.count);
      if (field === 'count' && currentRow.productId) {
      const productStock = availableProducts?.allStock?.find(
        p => (p.id || p._id) === currentRow.productId
      );
      if (productStock) {
        const remaining = getRemainingCount(currentRow.productId, productStock.count)
          + toNumber(countAllocations[currentRow.productId]?.[currentRow.id] || 0); 
        // allow current row’s existing allocation
        if (toNumber(value) > remaining) {
          toast.error(`Entered count (${value}) exceeds remaining count (${remaining.toFixed(3)}) for ${currentRow.productName}`, { autoClose: 3000 });
          alert(`Entered count (${value}) exceeds remaining count (${remaining}) for ${currentRow.productName}`);
          return; // abort update
        }
      }
    }

    const percent = toNumber(currentRow.percent);
    // awt and fwt always re-calculated
    const awt = wt - aStWt;
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
      if (field === "eStWt" || field === "productName") {
        const newStone = { ...stoneAllocations };
        if (!newStone[productId]) newStone[productId] = {};
        newStone[productId][currentRow.id] = toNumber(currentRow.eStWt);
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
        newS[updated[index].productId][currentRow.id] = toNumber(currentRow.eStWt);
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
    // console.log(updated)
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

    // remaining weight check
    const remainingWeight = getRemainingWeight(productId, product.itemWeight);
    if (remainingWeight <= 0) {
      alert(`No remaining weight available for ${product.itemName}`);
      return;
    }

    const alreadyAdded = billDetailRows.some((row) => row.productId === productId);
    if (alreadyAdded) {
      alert(`${product.itemName} already added!`);
      return;
    }

    // remaining stone and count
    const remainingStone = getRemainingStone(productId, product.stoneWeight);
    const remainingCount = getRemainingCount(productId, product.count);

    const defaultCount = remainingCount > 0 ? 1 : 0;

    let perUnitWeight = toNumber(product.itemWeight);
    if (toNumber(product.count) > 0) {
      perUnitWeight = toNumber(product.itemWeight) / Math.max(1, toNumber(product.count));
    }
    const initialWt = Math.min(remainingWeight, perUnitWeight * defaultCount) || remainingWeight;

    // const stWtValue = Math.min(remainingStone, toNumber(product.stoneWeight) || 0);
    const percentVal = product.wastageValue || 0;
    // const awtVal = toNumber(initialWt) - toNumber(stWtValue);

    const itemWt = toNumber(product.itemWeight);
    const stoneWt = toNumber(product.stoneWeight);
    const stWtValue = isNaN(stoneWt) ? 0 : stoneWt;
    const awtVal = toNumber(itemWt) - stWtValue;

    const fwtVal = percentVal ? (awtVal * toNumber(percentVal)) / 100 : 0;

    const newRow = {
      id: Date.now() + Math.random(),
      productId: productId,
      productName: product.itemName,
      count: product.count.toString(),
      wt: toFixedStr(product.itemWeight, 3),
      eStWt: toFixedStr(stWtValue, 3), // from stock (read-only)
      aStWt: "0.000",
      awt: toFixedStr(awtVal, 3),
      percent: '',
      // fwt: toFixedStr(fwtVal, 3),
      fwt: "0.000",
    };

    // update allocations
    setWeightAllocations((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [newRow.id]: toNumber(newRow.wt) },
    }));

    setStoneAllocations((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [newRow.id]: toNumber(newRow.eStWt) },
    }));

    setCountAllocations((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [newRow.id]: toNumber(newRow.count) },
    }));

    setBillDetailRows((prev) => [...prev, newRow]);

    setSelectedProductCounts((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1,
    }));
  };

  // Creates any touch values present in rows but missing from `touch` master list.
  // Throws if creation fails (so handleSave can abort).
  const createMissingTouches = async () => {
    try {
      const existingSet = new Set((touch || []).map((t) => t.touch?.toString()));
      // collect unique non-empty touch strings from rows
      const rowTouches = Array.from(
        new Set(
          (rows || [])
            .map((r) => (r.touch || "").toString().trim())
            .filter((v) => v !== "")
        )
      );

      const missing = rowTouches.filter((tVal) => !existingSet.has(tVal));
      if (missing.length === 0) return;

      // create all missing touches in parallel
      await Promise.all(
        missing.map((tVal) =>
          axios.post(`${BACKEND_SERVER_URL}/api/master-touch/create`, { touch: tVal })
        )
      );

      // refresh master-touch list after creating
      const refresh = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
      setTouch(Array.isArray(refresh.data) ? refresh.data : []);

      toast.success(`${missing.length} new touch(es) added`);
    } catch (err) {
      console.error("Error creating missing touches:", err);
      toast.error("Failed to create new touch values. Please try again.");
      // rethrow so handleSave can abort the save if needed
      throw err;
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);    

    try {

      if (!selectedCustomer) {
        alert("Please select a customer before saving.");
        toast.error("Please select a customer before saving.");
        return;
      }
      const isFormValid = validateAllFields();
      if (!isFormValid) {
        alert("Please fill in all required fields");
        return;
      }
      try {
        await createMissingTouches();
      } catch (err) {
        // createMissingTouches throws on failure, so abort save
        setIsSaving(false);
        return;
      }

      const FWT = billDetailRows.reduce((total, row) => total + (toNumber(row.fwt) || 0),0 );
      const totalReceivedPurity = rows.reduce((acc, row) => acc + (toNumber(row.purityWeight) || 0), 0);
      // const TotalFWT = toNumber(FWT) - toNumber(previousBalance);
      // const pureBalance = TotalFWT - totalReceivedPurity;
      const now = new Date();

      const billData = {
        date: now.toISOString(),
        time: now.toISOString(),
        customerId: selectedCustomer.id || selectedCustomer._id,
        customername: selectedCustomer.name,
        billTotal: FWT,
        hallMark: toNumber(billHallmark) || 0,
        pureBalance: toFixedStr(pureBalance, 3),
        hallmarkBalance: toNumber(hallmarkBalance),                  
        //  + toNumber(prevHallmark),
        prevHallmark:prevHallmark,
        prevBalance:previousBalance,
        billDetailsprofit:billDetailsProfit,
        Stoneprofit:stoneProfit,
        Totalprofit:totalBillProfit,
        cashBalance: cashBalance,
        hallmarkQty,

        // orderItems: billDetailRows.map((row) => ({
        //   stockId: row.productId,
        //   productName: row.productName,
        //   count: toNumber(row.count || 0), 
        //   weight: toNumber(row.wt),
        //   stoneWeight: toNumber(row.stWt),
        //   afterWeight: toNumber(row.awt),
        //   percentage: toNumber(row.percent),
        //   finalWeight: toNumber(row.fwt),
        // })),
       
       orderItems: billDetailRows.map((row) => {
        const productStock = availableProducts?.allStock?.find(
          p => (p.id || p._id) === row.productId
        );
        const wt = toNumber(row.wt);
        const stWt = toNumber(row.aStWt);
        const eStWt = toNumber(row.eStWt);
        const awt = wt - stWt;

        const touch = toNumber(productStock?.touch || 0);
        const wastageValue = toNumber(productStock?.wastageValue || 0);
        //wastage value and wastage is completely different
        // starts here
        const wastage = (awt * wastageValue) / 100;
        const wastageType = productStock?.wastageType || "None";
        console.log("testing type coming or not",wastageType)
        const wastagePure = (wastage * touch) / 100;

        const actualPurity = (awt * touch) / 100;
        // change this later below is the og final purity and above is actual purity
        const finalPurity = actualPurity + wastagePure
        return {
          stockId: row.productId,
          productName: row.productName,

          // bill data
          count: toNumber(row.count || 0),
          weight: wt,
          //actuall billed value
          stoneWeight: stWt,
          // expected stone weight enter
          enteredStoneWeight: eStWt,

          afterWeight: awt,
          percentage: toNumber(row.percent),
          finalWeight: toNumber(row.fwt),
          wastageType: wastageType,
          touch,
          netWeight: awt,
          wastageValue,
          wastagePure,
          actualPurity,
          finalPurity,
        };
      }),


        received: rows.map((row) => ({
          date: row.date,
          cash: toNumber(row.cash),
          type: row.type,
          goldRate: toNumber(row.goldRate),
          gold: toNumber(row.givenGold),
          touch: toNumber(row.touch),
          purity: toNumber(row.purityWeight),
          receiveHallMark: toNumber(row.hallmark),
          amount: toNumber(row.amount),
        })),
      };
      console.log("Payload being sent:", billData);
      setPrintBill(billData)
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
      
      setBillDetailRows([]);
      setRows([]);
      setSelectedCustomer(null);
      setBillHallmark("");
      setWeightAllocations({});
      setFieldErrors({});
      setPrevHallmark(0);
      setPreviousBalance(0);
      setCashBalance("0.00");
      setHallmarkQty(0)
      //to fecth new bills
      await fetchAllBills();
      await fetchCustomers();
      // await fetchLastBill();
      //much faster but little slower
      // setBills(prev => [resJson.bill, ...(prev || [])]);
      await fetchProductStock();
      toast.success("Bill saved successfully!");
    } catch (error) {
      console.error("Error saving bill:", error);
      alert(`Error saving bill: ${error.message}`);
      return;
    }finally {
    setIsSaving(false);
  }
  };

  const FWT = useMemo( () =>billDetailRows.reduce( (total, row) => total + (toNumber(row.fwt) || 0), 0), [billDetailRows] );
  console.log("FWT Calculation:",FWT);
  const { billDetailsProfit, stoneProfit, totalBillProfit, billProfitPercentage } = useMemo(() => {
    let detailsProfit = 0;
    let stoneProfitCalc = 0;

    billDetailRows.forEach((row, index) => {
      const productStock = availableProducts?.allStock?.find(product => (product.id || product._id) === row.productId);
      // if (!productStock) alert('no products available');
      const awt = toNumber(row.awt);
      const fwt = toNumber(row.fwt);
      const enteredStoneWt = toNumber(row.eStWt);
      const actualStoneWt   = toNumber(row.aStWt); 
      // const enteredStoneWt = toNumber(row.stWt);
      const enteredPercentage = toNumber(row.percent);
      // console.log('AWT:', awt, 'FWT:', fwt, 'Stone WT:', enteredStoneWt, 'Entered %:', enteredPercentage);
      
      if (productStock) {
        // Bill Details Profit: (awt × wastage%) - fwt
        // Use the wastage from productStock (availableProducts), not items
        const wastageValue = toNumber(productStock.wastageValue) || 0;
        const purityFromWastage = (awt * wastageValue) / 100;
        const rowBillProfit =  fwt - purityFromWastage;
        detailsProfit += rowBillProfit;
        // Stone Profit: Stone Profit = (expectedStoneWeight − actualStoneWeight) × touch / 100
        // const remainingStone = getRemainingStone(row.productId, productStock.stoneWeight);
        const touchValue = toNumber(productStock.touch) || 0;
        // const rowStoneProfit = (enteredStoneWt * touchValue) / 100;
        // const rowStoneProfit = (toNumber(enteredStoneWt) * touchValue) / 100;
        const stoneDifference = Math.max(0, enteredStoneWt - actualStoneWt);
        const rowStoneProfit  = (stoneDifference * touchValue) / 100;
        stoneProfitCalc += rowStoneProfit;
      } else {
        console.log('Product stock not found for productId:', row.productId);
      }
    });

    const totalProfit = detailsProfit + stoneProfitCalc;
    const profitPercentage = FWT > 0 ? (totalProfit / FWT) * 100 : 0;

    return {
      billDetailsProfit: toFixedStr(detailsProfit, 3),
      stoneProfit: toFixedStr(stoneProfitCalc, 3),
      totalBillProfit: toFixedStr(totalProfit, 3),
      billProfitPercentage: toFixedStr(profitPercentage, 2),
    };
  }, [billDetailRows, items, availableProducts, FWT]);
    const totalReceivedPurity = useMemo(() => rows.reduce((acc, row) => acc + (toNumber(row.purityWeight) || 0), 0),  [rows]  );
    const TotalFWT =
      previousBalance > 0
        ? toNumber(FWT) + toNumber(previousBalance)
        : previousBalance < 0
        ? toNumber(FWT) - Math.abs(toNumber(previousBalance))
        : toNumber(FWT);

  const pureBalance = TotalFWT - totalReceivedPurity;
  // Replace the existing cashBalance calculation with:
  const hallmarkAmount = useMemo(() => toNumber(hallmarkQty) * toNumber(billHallmark), [hallmarkQty, billHallmark]);
  const totalHallmark = useMemo(() => toNumber(prevHallmark) + toNumber(hallmarkAmount), [prevHallmark, hallmarkAmount]);

  useMemo(() => {
    if (viewMode) return;
    const lastGoldRate = [...rows].reverse().find((row) => toNumber(row.goldRate))?.goldRate;
    const calculatedBalance = lastGoldRate ? (toNumber(lastGoldRate) * pureBalance).toFixed(2) : "0.00";
    setCashBalance(calculatedBalance);
  }, [rows, pureBalance]);
  const totalBillHallmark = toNumber(totalHallmark);
  const totalReceivedHallmark = rows.reduce((total, row) => total + (toNumber(row.hallmark) || 0),  0);
  const hallmarkBalance = totalBillHallmark - totalReceivedHallmark;

  const filteredStock = useMemo(() => {
    if (!availableProducts?.allStock) return [];
    if (stockSource === "ALL") return availableProducts.allStock;

    return availableProducts.allStock.filter(
      p => p.source === stockSource
    );
  }, [availableProducts, stockSource]);


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
    try{
    setBillDetailRows([]);
    setRows([]);
    setSelectedCustomer(null);
    setBillHallmark("");
    setTime(new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }))
    // clear allocations and selection trackers
    setWeightAllocations({});
    setStoneAllocations({});
    setCountAllocations({});
    setCashBalance("0.00");
    // if you implemented the "selected product" badge, clear it too
    if (typeof setSelectedProductCounts === "function") {
      setSelectedProductCounts({});
    }

    // clear validation and balances
    setFieldErrors({});
    setPrevHallmark(0);
    setPreviousBalance(0);
    setHallmarkQty(0);
    // restore availableProducts from the original snapshot (undo any client-side changes)
    if (originalProducts) {
      setAvailableProducts(originalProducts);
    }

    console.log("Bill Reset Successfully");
    toast.success("Bill Reset Successfully", { autoClose: 1000 });
  }catch(err){
    console.error("Error resetting bill:", err);
    toast.error("Error resetting bill");
  }
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
    setCashBalance("0.00");
    setHallmarkQty(0);
    toast.info("Exited view mode", { autoClose: 1000 });
  };

  const handleViewBill = (id) => {
    const bill = bills.find((b) => b.id === id);
    setCurrentBill(bill || null);
    if (!bill) return alert("Bill not found");
    setBillId(bill.id || "-");
    setBillDetailsProfit(bill.billDetailsprofit || "0.000");
    setStoneProfit(bill.Stoneprofit || "0.000");
    setTotalBillProfit(bill.Totalprofit || "0.000");
    setBillDetailRows(
      (bill.orders || []).map((item) => ({
        id: item.id,
        productId: item.stockId,
        productName: item.productName,
        count: item.count?.toString() || 0,
        wt: item.weight?.toString() || "",
        eStWt: item.enteredStoneWeight?.toString() || "0.000",
        aStWt: item.stoneWeight?.toString() || "0.000",
        stWt: item.stoneWeight?.toString() || "",
        awt: item.afterWeight?.toString() || "",
        percent: item.percentage?.toString() || "",
        fwt: item.finalWeight?.toString() || "",
        repairStatus: item.repairStatus || "sold",
      }))
    );
    
    console.log('billReceive',bill.billReceive)
    setRows(
      (bill.billReceive || []).map((item) => ({
        id: item.id,
        date: item.date ,
        // type: toNumber(item.cash) > 0 ? "Cash" : "Gold",
        type: item.type,
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
    setCashBalance(bill.cashBalance || "0.00");
    setHallmarkQty(bill.hallmarkQty || 0);

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

  // const fetchAllBills = async () => {
  //   try {
  //     const response = await fetch(`${BACKEND_SERVER_URL}/api/bill`);
  //     if (!response.ok)
  //       throw new Error(`HTTP error! status: ${response.status}`);

  //     const data = await response.json();
  //     console.log('boo check', data);

  //     if (Array.isArray(data.data) && data.data.length > 0) {
  //       const latestId = data.data[0].id;
  //       setBillNo(latestId + 1);
  //       setBills(data.data);
  //     } else {
  //       setBillNo(1);
  //       setBills([]);
  //     }

  //   } catch (error) {
  //     console.error("Error fetching bills:", error);
  //     setBillNo(1);
  //     setBills([]);
  //   }
  // };
  const fetchAllBills = async () => {
  try {
    const response = await fetch(`${BACKEND_SERVER_URL}/api/bill`);
    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    console.log("Bills fetched:", data);

    setBillNo(data.nextBillNo || 1);
    setBills(Array.isArray(data.data) ? data.data : []);
  } catch (error) {
    console.error("Error fetching bills:", error);
    setBillNo(1);
    setBills([]);
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

  useEffect(() => {
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

      // const fetchLastBill = async () => {
      //   try {
      //     // const response = await fetch(`${BACKEND_SERVER_URL}/api/bill`);
      //     // const data = await response.json();
      //     const bills = data.data || [];
      //     if (bills.length > 0) {
      //       const lastId = bills[bills.length - 1].id;
      //       setBillNo(lastId + 1); 
      //     } else {
      //       setBillNo(1);
      //     }
      //   } catch (error) {
      //     console.error("Error fetching last bill:", error);
      //   }
      // };          
    
    // fetchLastBill();
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
  const showAmountColumn = rows.length === 0  ? true  : rows.some((r) => r.type === "" || r.type === "Cash");

  const visibleReceivedCols = 1/*S.No*/+ 1/*Date*/+ 1/*Type*/+(showGoldRateColumn ? 1 : 0) + (showGivenGoldColumn ? 1 : 0) + (showTouchColumn ? 1 : 0) + 1/*Purity*/+ (showAmountColumn ? 1 : 0) + 1/*Hallmark*/+1;/*Action*/

  const handlePrint = () => {
    const billData = {
      billNo: currentBill?.id,
      date:currentBill?.date  ? new Date(currentBill.date).toLocaleDateString("en-IN")  : date,
      time: currentBill?.time  ? new Date(currentBill.time).toLocaleTimeString("en-IN", {  hour: "2-digit",  minute: "2-digit",  hour12: true,  })  : time,
      selectedCustomer,

      // bill details
      billItems: billDetailRows.map((row) => ({
        productName: row.productName,
        count: row.count,
        weight: row.wt,
        stoneWeight: row.stWt,
        afterWeight: row.awt,
        percentage: row.percent,
        finalWeight: row.fwt,
      })),

      // received details
      rows: rows.map((row) => ({
        date: row.date,
        gold: row.givenGold,
        cash: row.cash,
        goldRate: row.goldRate,
        touch: row.touch,
        purity: row.purityWeight,
        amount: row.amount,
        receiveHallMark: row.hallmark,
      })),

      // balances
      pureBalance,
      hallmarkBalance,
      cashBalance,
      prevHallmark,
      //
      hallmarkAmount,
      totalHallmark,
      FWT,
      TotalFWT,
      //
      prevBalance: previousBalance, 
      hallMark: toNumber(billHallmark) || 0,
      hallmarkQty,
      totalBillHallmark,
      // profits
      billDetailsprofit: billDetailsProfit, 
      Stoneprofit: stoneProfit,        
      Totalprofit: totalBillProfit,
    };

    console.log("Printing bill data:", billData);
    const printContent = (
      <PrintableBill
        {...billData}
        viewMode={viewMode}
        selectedBill={billData}
      />
    );

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill Print</title>
          <link rel="stylesheet" href="./PrintableBill.css">
        </head>
        <body>
          ${ReactDOMServer.renderToString(printContent)}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 200);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1000,height=800");
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const handlePrintWithSave = async () => {
    if (isSaving) return; 
     setIsSaving(true);
    if (viewMode) {
      handlePrint();
      setIsSaving(false);
      return;
    }
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer before printing.");
        return;
      }

      const isValid = validateAllFields();
      if (!isValid) {
        toast.error("Please correct the highlighted fields before printing.");
        return;
      }

      await handleSave();

      setTimeout(() => {
        handlePrint();
      }, 500);
    } catch (error) {
      console.error("Error while saving before print:", error);
      toast.error(`Unable to print: ${error.message}`);
    } finally {
    setIsSaving(false);
  }
  };


  useEffect(() => {
    const handleKeyDown = async (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "p") {
        event.preventDefault();
        
        // Wait for any pending state updates
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Now call handlePrint
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrint]);


  return (
    <Box className="billing-wrapper">
      {/* Left panel */}
      <Box className="left-panel" 
      style={{ maxWidth:'65%',
         position: viewMode ? 'absolute' : '',
         left:viewMode ? '15%' : '',
        }}
      >
         <Tooltip title="View Bills" arrow placement="right">
        <Box
          onClick={() => setIsModal(true)}
          style={{
             zIndex: 10,
             position: "relative",
             display: "flex",
             color: "white",
             backgroundColor: "#0a4c9a",
             gap: "10px",
             cursor: "pointer",
             padding: "8px 12px",
             borderRadius: "8px",
             width: 80,
          }}
        >
         
            <Box sx={{ display: "flex", gap: "10px" }}>
              <ReceiptLongIcon />
              <span>View</span>
            </Box>
          
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
                <p> <strong>Bill No:</strong> {currentBill?.id} </p>
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
                <p> <strong>Bill No:</strong> {billNo} </p>
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
                <TableCell className="th">Entered St.WT</TableCell>
                <TableCell className="th">Actual St.WT</TableCell>
                <TableCell className="th">AWT</TableCell>
                <TableCell className="th">%</TableCell>
                <TableCell className="th">FWT</TableCell>
                <TableCell className="th no-print"> {!viewMode ? "Action" : "Status"}</TableCell>
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
                        disabled
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
                        value={row.eStWt}
                        disabled={viewMode}
                        onChange={(e) =>handleNumericInput(e, (ev) => handleBillDetailChange(index,"eStWt",ev.target.value))}
                        inputProps={{ style: inputStyle }}
                        error={!!fieldErrors[`billDetail_${index}_stWt`]}
                        helperText={ fieldErrors[`billDetail_${index}_stWt`] || "" }
                      />
                    </TableCell>
                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.aStWt}
                        disabled={viewMode}
                        onChange={(e) =>handleNumericInput(e, (ev) => handleBillDetailChange(index,"aStWt",ev.target.value))}
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
                    {!viewMode ? <TableCell className="td no-print">
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
                      : <TableCell className="td">
                         <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            fontWeight: "bold",
                            backgroundColor:
                              row.repairStatus === "IN_REPAIR"
                                ? "#ff9800"
                                : row.repairStatus === "RETURNED"
                                ? "#4caf50"
                                : "#9e9e9e",
                            color: "white",
                          }}
                        >
                          {row.repairStatus === "IN_REPAIR"
                            ? "Repair"
                            : row.repairStatus === "RETURNED"
                            ? "Returned"
                            : "Sold"}
                        </span>
                      </TableCell>
                      }
                      
                    
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="no-products-message">
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
                {prevHallmark > 0 ? (
                  <>
                    <p>Opening Hallmark Balance:{" "}{prevHallmark ? toFixedStr(prevHallmark, 3) : "000.000"}</p>
                
                  </>
                ) : prevHallmark < 0 ? (
                  <>
                    <p>Excess Hallmark Balance:{" "}{prevHallmark ? toFixedStr(prevHallmark, 3) : "000.000"}</p>{" "}
                    
                  </>
                ) : (
                  <p>Hallmark Balance: 0.000</p>
                )}
              </Box>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <TextField
                size="small"
                type="text"
                label="Qty"
                value={hallmarkQty}
                disabled={viewMode}
                onChange={(e) =>
                  handleNumericInput(e, (ev) => { const validatedValue = validateInput( ev.target.value,"billHallmark",0,"hallmark","number");
                    setHallmarkQty(validatedValue);
                    })
                  }
                  sx={{ width: 60 }}
                  error={!!fieldErrors["hallmark_0_billHallmark"]}
                  helperText={fieldErrors["hallmark_0_billHallmark"] || ""}
                  />
                  <p>X</p>
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
                <p>=</p>
                <TextField
                  size="small"
                  type="text"
                  label="Total"
                  value={hallmarkAmount.toFixed(3)}
                  disabled
                  sx={{ width: 130 }}
                />
              </div>
              <TextField
                  size="small"
                  type="text"
                  label="Total Hallmark"
                  value={totalHallmark.toFixed(3)}
                  disabled
                  sx={{ width: 130 }}
                />
                </Box>

                <Box className="balance-info">
                  {previousBalance > 0 ? (
                      <>
                        <div className="negative">
                          Opening Balance: {toFixedStr(previousBalance, 3)}
                        </div>
                        <div>FWT: {toFixedStr(FWT, 3)}</div>
                        <div>Total FWT: {toFixedStr(TotalFWT,3)}</div>
                      </> 
                    ) : previousBalance < 0 ? (
                      <>
                        <div className="positive">
                          Excess Balance: {toFixedStr(Math.abs(previousBalance), 3)}
                        </div>
                        <div>FWT: {toFixedStr(FWT, 3)}</div>
                        <div>Total FWT: {toFixedStr(TotalFWT,3)}</div>
                      </>
                    ) : (
                      <>
                        <div className="neutral">Balance: 0.000</div>
                        <div>FWT: {toFixedStr(FWT, 3)}</div>
                        <div>Total FWT: {toFixedStr(TotalFWT,3)}</div>
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
                          onChange={(e) => handleRowChange(index, "date", e.target.value)}
                          sx={{
                            minWidth: 100,        
                            width: "140px", 
                            mr: 1,
                            input: {
                              padding: "6px 10px",
                              borderRadius: "6px",
                              fontSize: "13px",
                              boxSizing: "border-box",
                            },
                          }}
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

                      {/* {showTouchColumn && (
                        < TableCell className="td">
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
                      )} */}

                      {showTouchColumn && (
                          <TableCell className="td">
                            {(row.type === "" || row.type === "Gold") && (
                              <Autocomplete
                                freeSolo
                                disableClearable
                                options={touch.map((t) => t.touch.toString())}
                                value={row.touch?.toString() || ""}
                                onChange={(_, newValue) => {
                                  handleRowChange(index, "touch", newValue);
                                }}
                                onInputChange={(_, newInputValue) => {
                                  handleRowChange(index, "touch", newInputValue);
                                }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    size="small"
                                    placeholder="Type or select touch"
                                    disabled={row.isLocked}
                                    inputProps={{
                                      ...params.inputProps,
                                      style: inputStyle,
                                    }}
                                    error={!!fieldErrors[`receivedDetail_${index}_touch`]}
                                    helperText={fieldErrors[`receivedDetail_${index}_touch`] || ""}
                                  />
                                )}
                              />
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
                              // value={`₹${Number(row.amount ?? 0).toLocaleString("en-IN")}`}
                              value={row.amount}
                              disabled={row.isLocked}
                              onChange={(e) => handleNumericInput(e, (ev) => handleRowChange(index,"amount",ev.target.value))}
                              inputProps={{ style: inputStyle }}
                              //  InputProps={{
                              //       startAdornment: <span style={{ marginRight: 1 }}>₹</span>,
                              //     }}
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
              <div>Bill Details Profit: <span style={{ color: "green" }}>{viewMode ? BillDetailsProfit : billDetailsProfit}</span></div>
              <div>Stone Profit: <span style={{ color: "green" }}>{viewMode ? StoneProfit : stoneProfit}</span></div>
              <div>Total Profit: <span style={{ color: "#0a4c9a" }}>{viewMode ? TotalBillProfit : totalBillProfit}</span></div>
              {/* <div>Profit %: <span style={{ color: "#d9534f" }}>{billProfitPercentage}%</span></div> */}
            </div>

          <Box className="closing-balance">
            
            <div className="flex">
              <strong>Cash Balance: ₹{Number(cashBalance ?? 0).toLocaleString("en-IN", {/*{ minimumFractionDigits: 3,// maximumFractionDigits: 3,}*/} )}</strong>

              <strong>
                      {pureBalance >= 0
                        ? `Pure Balance: ${toFixedStr(pureBalance, 3)}`
                        : `Excess Balance: ${toFixedStr(pureBalance, 3)}`}
                      </strong>

              <strong>{hallmarkBalance >=0
                        ?`Hallmark Balance:${toFixedStr(hallmarkBalance, 3)}`
                        :`Excess Hallmark Balance:${toFixedStr(hallmarkBalance, 3)}`}
                        </strong>
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
              disabled={isSaving}
            >
               {isSaving ? "Saving..." : "Save"}
              </Button>}

           <Button
              variant="contained"
              color="primary"
              onClick={handlePrintWithSave}
               disabled={isSaving}
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
            {console.log("Available Products:", availableProducts)}
            <Button
              variant={stockSource === "REPAIR_RETURN" ? "contained" : "outlined"}
              onClick={() => setStockSource("REPAIR_RETURN")}
            >
              Show Repaired
            </Button>

            <Button
              variant={stockSource === "CUSTOMER_RETURN" ? "contained" : "outlined"}
              onClick={() => setStockSource("CUSTOMER_RETURN")}
            >
              Show Returned
            </Button>

            <Button
              variant={stockSource === "ALL" ? "contained" : "outlined"}
              onClick={() => setStockSource("ALL")}
            >
              Show All
            </Button>
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
                  <TableCell className="th" style={{ textAlign: "center" }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStock.map((prodata, index) => {
                    const productId = prodata.id || prodata._id;
                    const remainingWeight = getRemainingWeight(productId, prodata.itemWeight);
                    const isFullyAllocated = remainingWeight <= 0;
                    const addedCount = selectedProductCounts[productId] || 0;
                    const isSelected = addedCount > 0;

                    return (
                      <TableRow
                        key={index}
                        hover
                        style={{
                          cursor: viewMode || isFullyAllocated ? "not-allowed" : "pointer",
                          backgroundColor: isFullyAllocated ? "#f5f5f5" : isSelected ? "#e6f4ff" : "transparent",
                          borderLeft: isSelected ? "4px solid #0a4c9a" : "none",
                          opacity: viewMode || isFullyAllocated ? 0.6 : 1,
                          textAlign: "center",
                          pointerEvents: viewMode ? "none" : "auto",
                        }}
                        onClick={() => {
                          if (!viewMode && !isFullyAllocated) handleProductClick(prodata);
                        }}
                      >
                        <TableCell className="td" style={{ textAlign: "center" }}>{index + 1}</TableCell>
                        <TableCell className="td" style={{ textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                          <span>{prodata.itemName}</span>
                          {/* {isSelected && (
                            <span style={{
                              background: "#0a4c9a",
                              color: "white",
                              borderRadius: 8,
                              padding: "2px 6px",
                              fontSize: 12,
                              fontWeight: 600,
                              marginLeft: 6
                            }}>
                              Added {addedCount}
                            </span>
                          )} */}
                        </TableCell>
                        {/* <TableCell className="td" style={{ textAlign: "center" }} > {prodata.itemWeight}  </TableCell> */}
                        <TableCell className="td" style={{ color: remainingWeight <= 0 ? "red" : "green", fontWeight: "bold",textAlign: "center",}}>{toNumber(remainingWeight).toFixed(3)}</TableCell> 
                        <TableCell className="td" style={{ textAlign: "center" }} >
                          {toNumber(getRemainingStone(productId, prodata.stoneWeight)).toFixed(3)}</TableCell>
                        <TableCell className="td" style={{ textAlign: "center" }} >
                          {toNumber(getRemainingCount(productId, prodata.count)).toString()}</TableCell>
                        <TableCell className="td" style={{ textAlign: "center" }} > {prodata.wastageValue} </TableCell> 
                        <TableCell className="td" style={{ textAlign: "center" }} > {prodata.touch} </TableCell>
                        <TableCell className="td" style={{ textAlign: "center" }}>
                          {prodata.source !== "NORMAL" ? (
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                color: "white",
                                background:
                                  prodata.source === "REPAIR_RETURN"
                                    ? "#ff9800"
                                    : "#4caf50"
                              }}
                            >
                              {prodata.source === "REPAIR_RETURN" ? "REPAIR" : "RETURN"}
                            </span>
                          ) : "-"}
                        </TableCell>
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
                <TableCell style={{ textAlign: "center", color: "white", width: "90px" }}>  Bill No </TableCell>
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
