import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  TableContainer,
  InputAdornment,
  TablePagination,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SearchIcon from "@mui/icons-material/Search";
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
  const navigate = useNavigate();
  const location = useLocation();
  // === State ===
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [availableProducts, setAvailableProducts] = useState(null);
  const [itemPurchaseProducts, setItemPurchaseProducts] = useState(null);
  const [originalProducts, setOriginalProducts] = useState(null);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [prevHallmark, setPrevHallmark] = useState(0);

  const [billId, setBillId] = useState(0);
  const [date, setDate] = useState(new Date().toLocaleDateString("en-IN"));
  const [time, setTime] = useState(
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isEditMode) return; // preserve original bill date/time during editing
      const now = new Date();
      setDate(now.toLocaleDateString("en-IN"));
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [isEditMode]);

  const [billTime, setBillTime] = useState("")
  const [weightAllocations, setWeightAllocations] = useState({});
  const [stoneAllocations, setStoneAllocations] = useState({});
  const [countAllocations, setCountAllocations] = useState({});

  const [selectedFilter, setSelectedFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [billDetailRows, setBillDetailRows] = useState([]); // Bill items
  const [billHallmark, setBillHallmark] = useState("");
  const [isModal, setIsModal] = useState(false);
  const [bills, setBills] = useState([]);
  const [currentBill, setCurrentBill] = useState(null);
  const [touch, setTouch] = useState([]);
  const [cashBalance, setCashBalance] = useState("0.00");
  //only for this display while view mode
  const [BillDetailsProfit, setBillDetailsProfit] = useState([]);
  const [StoneProfit, setStoneProfit] = useState([]);
  const [TotalBillProfit, setTotalBillProfit] = useState([]);
  // const [totalFWT,setTotalFWT] =useState(0);

  //for hallmark rate and qty
  const [hallmarkQty, setHallmarkQty] = useState(0);

  // keep track how many bill rows were added for each productId for css
  const [selectedProductCounts, setSelectedProductCounts] = useState({});

  const [printBill, setPrintBill] = useState([])
  const [isSaving, setIsSaving] = useState(false);
  const [billNo, setBillNo] = useState("");

  const [editBillId, setEditBillId] = useState(null);
  const [billSearchTerm, setBillSearchTerm] = useState("");

  const filteredBills = useMemo(() => {
    if (!Array.isArray(bills)) return [];
    if (!billSearchTerm.trim()) return bills;
    const term = billSearchTerm.toLowerCase();
    return bills.filter((b) => {
      const billNo = b.id?.toString() || "";
      const custName = b.customers?.name?.toLowerCase() || "";
      return billNo.includes(term) || custName.includes(term);
    });
  }, [bills, billSearchTerm]);

  const [stockSource, setStockSource] = useState("ALL");
  const [stockPage, setStockPage] = useState(0);
  const [stockRowsPerPage, setStockRowsPerPage] = useState(20);
  
  // Reset stock page when filters change
  useEffect(() => {
    setStockPage(0);
  }, [searchTerm, selectedFilter, stockSource]);


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
        } break;
      }
      case "text":
        if (typeof value !== "string" || value.trim() === "") {
          setFieldErrors((prev) => ({
            ...prev,
            [fieldKey]: "This field cannot be empty",
          }));
          return value;
        } break;
      case "date": {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          setFieldErrors((prev) => ({
            ...prev,
            [fieldKey]: "Please enter a valid date",
          }));
          return value;
        } break;
      }
      default:
        break;
    }
    return value;
  };

  const validateAllFields = () => {
    let isValid = true;
    const newErrors = {};

    if (billDetailRows.length === 0) {
      alert("Please add at least one Bill Detail or Received Detail before saving.");
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


    setFieldErrors(newErrors);
    return isValid;
  };
  // Allow only numbers + optional dot (no negative in UI)
  const handleNumericInput = (e, callback) => {
    const value = e.target.value;
    const numericPattern = /^[0-9]*\.?[0-9]*$/;
    if (numericPattern.test(value) || value === "") callback(e);
  };



  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;
    try {
      const res = await fetch(`${BACKEND_SERVER_URL}/api/bill/${id}`, { method: "DELETE", });
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
      if (rowToDelete?.uniqueId && rowToDelete?.id) {
        const uniqueId = rowToDelete.uniqueId;
        const newAllocations = { ...weightAllocations };
        if (newAllocations[uniqueId]) {
          delete newAllocations[uniqueId][rowToDelete.id];
          if (Object.keys(newAllocations[uniqueId]).length === 0) {
            delete newAllocations[uniqueId];
          }
        }
        setWeightAllocations(newAllocations);

        // stone allocations
        const newStone = { ...stoneAllocations };
        if (newStone[uniqueId]) {
          delete newStone[uniqueId][rowToDelete.id];
          if (Object.keys(newStone[uniqueId]).length === 0) {
            delete newStone[uniqueId];
          }
        }
        setStoneAllocations(newStone);

        // count allocations
        const newCount = { ...countAllocations };
        if (newCount[uniqueId]) {
          delete newCount[uniqueId][rowToDelete.id];
          if (Object.keys(newCount[uniqueId]).length === 0) {
            delete newCount[uniqueId];
          }
        }
        setCountAllocations(newCount);
      }
      //css changes
      if (rowToDelete?.uniqueId) {
        setSelectedProductCounts((prev) => {
          const copy = { ...prev };
          const uid = rowToDelete.uniqueId;
          if (!copy[uid]) return copy;
          copy[uid] = copy[uid] - 1;
          if (copy[uid] <= 0) delete copy[uid];
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
    if (field === 'wt' && currentRow.uniqueId) {
      const productStock = currentRow.stockType === "ITEM_PURCHASE"
        ? itemPurchaseProducts?.find(p => (p.id || p._id) === currentRow.productId)
        : availableProducts?.allStock?.find(p => (p.id || p._id) === currentRow.productId);
      if (productStock) {
        const itemWeight = currentRow.stockType === "ITEM_PURCHASE" ? productStock.grossWeight : productStock.itemWeight;
        const remaining = getRemainingWeight(currentRow.uniqueId, itemWeight)
          + toNumber(weightAllocations[currentRow.uniqueId]?.[currentRow.id] || 0);
        // allow current row’s existing allocation
        // if (toNumber(value) > remaining) {
        //   toast.error(`Entered weight (${value}) exceeds remaining weight (${remaining.toFixed(3)}) for ${currentRow.productName}`, { autoClose: 3000 });
        //   alert(`Entered weight (${value}) exceeds remaining weight (${remaining.toFixed(3)}) for ${currentRow.productName}`);
        //   return;
        // }
      }
    }

    const eStWt = toNumber(currentRow.eStWt);
    if (field === 'eStWt' && currentRow.uniqueId) {
      const productStock = currentRow.stockType === "ITEM_PURCHASE"
        ? itemPurchaseProducts?.find(p => (p.id || p._id) === currentRow.productId)
        : availableProducts?.allStock?.find(p => (p.id || p._id) === currentRow.productId);
      if (productStock) {
        const remaining = getRemainingStone(currentRow.uniqueId, productStock.stoneWeight)
          + toNumber(stoneAllocations[currentRow.uniqueId]?.[currentRow.id] || 0);
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


    // Removed count validation as per user request
    const count = toNumber(currentRow.count);
    if (!isEditMode && field === 'count' && currentRow.uniqueId) {
      const productStock = currentRow.stockType === "ITEM_PURCHASE"
        ? itemPurchaseProducts?.find(p => (p.id || p._id) === currentRow.productId)
        : availableProducts?.allStock?.find(p => (p.id || p._id) === currentRow.productId);
      if (productStock) {
        const remaining = getRemainingCount(currentRow.uniqueId, productStock.count)
          + toNumber(countAllocations[currentRow.uniqueId]?.[currentRow.id] || 0);
        // allow current row’s existing allocation
        // if (toNumber(value) > remaining) {
        //   toast.error(`Entered count (${value}) exceeds remaining count (${remaining.toFixed(3)}) for ${currentRow.productName}`, { autoClose: 3000 });
        //   alert(`Entered count (${value}) exceeds remaining count (${remaining}) for ${currentRow.productName}`);
        //   return; // abort update
        // }
      }
    }

    const percent = toNumber(currentRow.percent);
    // awt and fwt always re-calculated
    const awt = wt - aStWt;
    currentRow.awt = awt ? toFixedStr(awt, 3) : "0.000";
    currentRow.fwt = percent ? toFixedStr((awt * percent) / 100, 3) : "0.000";

    updated[index] = currentRow;

    // Update allocations when fields change and uniqueId exists
    const uniqueId = currentRow.uniqueId;

    if (uniqueId) {
      // weight
      if (field === "wt" || field === "productName") {
        const newAlloc = { ...weightAllocations };
        if (!newAlloc[uniqueId]) newAlloc[uniqueId] = {};
        newAlloc[uniqueId][currentRow.id] = toNumber(currentRow.wt);
        setWeightAllocations(newAlloc);
      }

      // stone
      if (field === "eStWt" || field === "productName") {
        const newStone = { ...stoneAllocations };
        if (!newStone[uniqueId]) newStone[uniqueId] = {};
        newStone[uniqueId][currentRow.id] = toNumber(currentRow.eStWt);
        setStoneAllocations(newStone);
      }

      // count
      if (field === "count" || field === "productName") {
        const newCount = { ...countAllocations };
        if (!newCount[uniqueId]) newCount[uniqueId] = {};
        // default to 0 if empty
        newCount[uniqueId][currentRow.id] = toNumber(currentRow.count || 0);
        setCountAllocations(newCount);
      }

      // If user changed productName (switched product), ensure we remove allocations of old uniqueId handled earlier in productName branch below
    }

    // Special handling when user switches productName: update mapping
    if (field === "productName") {
      const selectedItem = items.find((it) => it.itemName === validatedValue);
      const prevUniqueId = updated[index].uniqueId;
      const newUniqueId = selectedItem ? `PRODUCT_${selectedItem._id || selectedItem.id}` : "";

      // remove previous product allocations if switching
      if (prevUniqueId && prevUniqueId !== newUniqueId) {
        const newW = { ...weightAllocations };
        if (newW[prevUniqueId]) {
          delete newW[prevUniqueId][currentRow.id];
          if (Object.keys(newW[prevUniqueId]).length === 0) delete newW[prevUniqueId];
          setWeightAllocations(newW);
        }
        const newS = { ...stoneAllocations };
        if (newS[prevUniqueId]) {
          delete newS[prevUniqueId][currentRow.id];
          if (Object.keys(newS[prevUniqueId]).length === 0) delete newS[prevUniqueId];
          setStoneAllocations(newS);
        }
        const newC = { ...countAllocations };
        if (newC[prevUniqueId]) {
          delete newC[prevUniqueId][currentRow.id];
          if (Object.keys(newC[prevUniqueId]).length === 0) delete newC[prevUniqueId];
          setCountAllocations(newC);
        }
      }

      if (selectedItem) {
        updated[index].productId = selectedItem._id || selectedItem.id || "";
        updated[index].stockType = "PRODUCT";
        updated[index].uniqueId = newUniqueId;
        // ensure allocations exist for new product
        const newW = { ...weightAllocations };
        if (!newW[newUniqueId]) newW[newUniqueId] = {};
        newW[newUniqueId][currentRow.id] = toNumber(currentRow.wt);
        setWeightAllocations(newW);

        const newS = { ...stoneAllocations };
        if (!newS[newUniqueId]) newS[newUniqueId] = {};
        newS[newUniqueId][currentRow.id] = toNumber(currentRow.eStWt);
        setStoneAllocations(newS);

        const newC = { ...countAllocations };
        if (!newC[newUniqueId]) newC[newUniqueId] = {};
        newC[newUniqueId][currentRow.id] = toNumber(currentRow.count || 0);
        setCountAllocations(newC);
      } else {
        updated[index].productId = "";
        updated[index].stockType = "PRODUCT";
        updated[index].uniqueId = "";
      }
    }

    setBillDetailRows(updated);
    // console.log(updated)
  };



  const getRemainingWeight = (uniqueId, originalWeight) => {
    if (!weightAllocations[uniqueId]) return originalWeight;
    const totalAllocated = Object.values(weightAllocations[uniqueId]).reduce(
      (sum, weight) => sum + (toNumber(weight) || 0), 0);
    return Math.max(0, originalWeight - totalAllocated);
  };

  const getRemainingStone = (uniqueId, originalStone) => {
    if (!stoneAllocations[uniqueId]) return originalStone;
    const totalAllocated = Object.values(stoneAllocations[uniqueId]).reduce(
      (sum, w) => sum + (toNumber(w) || 0), 0
    );
    return Math.max(0, originalStone - totalAllocated);
  };

  const getRemainingCount = (uniqueId, originalCount) => {
    if (!countAllocations[uniqueId]) return originalCount;
    const totalAllocated = Object.values(countAllocations[uniqueId]).reduce(
      (sum, c) => sum + (toNumber(c) || 0), 0
    );
    return Math.max(0, originalCount - totalAllocated);
  };

  const handleProductClick = (product) => {
    const productId = product.id || product._id;
    const uniqueId = `PRODUCT_${productId}`;

    // remaining weight check
    const remainingWeight = getRemainingWeight(uniqueId, product.itemWeight);
    if (remainingWeight <= 0) {
      alert(`No remaining weight available for ${product.itemName}`);
      return;
    }

    const alreadyAdded = billDetailRows.some((row) => row.uniqueId === uniqueId);
    if (alreadyAdded) {
      alert(`${product.itemName} already added!`);
      return;
    }

    // remaining stone and count
    const remainingStone = getRemainingStone(uniqueId, product.stoneWeight);
    const remainingCount = getRemainingCount(uniqueId, product.count);

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
      stockType: "PRODUCT",
      uniqueId: uniqueId,
      productName: product.itemName,
      count: product.count.toString(),
      wt: toFixedStr(product.itemWeight, 3),
      eStWt: toFixedStr(stWtValue, 3), // from stock (read-only)
      aStWt: "",
      awt: toFixedStr(awtVal, 3),
      percent: '',
      // fwt: toFixedStr(fwtVal, 3),
      fwt: "0.000",
    };

    // update allocations
    setWeightAllocations((prev) => ({
      ...prev,
      [uniqueId]: { ...(prev[uniqueId] || {}), [newRow.id]: toNumber(newRow.wt) },
    }));

    setStoneAllocations((prev) => ({
      ...prev,
      [uniqueId]: { ...(prev[uniqueId] || {}), [newRow.id]: toNumber(newRow.eStWt) },
    }));

    setCountAllocations((prev) => ({
      ...prev,
      [uniqueId]: { ...(prev[uniqueId] || {}), [newRow.id]: toNumber(newRow.count) },
    }));

    setBillDetailRows((prev) => [...prev, newRow]);

    setSelectedProductCounts((prev) => ({
      ...prev,
      [uniqueId]: (prev[uniqueId] || 0) + 1,
    }));
  };

  const handleItemPurchaseClick = (product) => {
    const productId = product.id || product._id;
    const uniqueId = `ITEM_PURCHASE_${productId}`;

    const alreadyAdded = billDetailRows.some((row) => row.uniqueId === uniqueId);
    if (alreadyAdded) {
      toast.warn(`${product.itemName} is already added to the bill!`);
      return;
    }

    if (product.isSold) {
      toast.warn(`${product.itemName} is already sold.`);
      return;
    }

    const grossWt = toNumber(product.grossWeight || 0);
    const stoneWt = toNumber(product.stoneWeight || 0);
    const netWt = toNumber(product.netWeight || 0);
    const countVal = toNumber(product.count || 1);

    const newRow = {
      id: Date.now() + Math.random(),
      productId: productId,
      stockType: "ITEM_PURCHASE",
      uniqueId: uniqueId,
      productName: product.itemName,
      count: countVal.toString(),
      wt: toFixedStr(grossWt, 3),
      eStWt: toFixedStr(stoneWt, 3),
      aStWt: "",
      awt: toFixedStr(netWt, 3),
      percent: "",  // touch NOT pre-filled — user enters manually
      fwt: "0.000",
    };

    // Track allocations so getRemainingWeight/Stone/Count updates reactively
    setWeightAllocations((prev) => ({
      ...prev,
      [uniqueId]: { ...(prev[uniqueId] || {}), [newRow.id]: grossWt },
    }));
    setStoneAllocations((prev) => ({
      ...prev,
      [uniqueId]: { ...(prev[uniqueId] || {}), [newRow.id]: stoneWt },
    }));
    setCountAllocations((prev) => ({
      ...prev,
      [uniqueId]: { ...(prev[uniqueId] || {}), [newRow.id]: countVal },
    }));

    setBillDetailRows((prev) => [...prev, newRow]);
    setSelectedProductCounts((prev) => ({
      ...prev,
      [uniqueId]: (prev[uniqueId] || 0) + 1,
    }));

    // toast.success(`${product.itemName} added to bill!`);
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

      const FWT = billDetailRows.reduce((total, row) => total + (toNumber(row.fwt) || 0), 0);
      // const totalReceivedPurity = rows.reduce((acc, row) => acc + (toNumber(row.purityWeight) || 0), 0);
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
        prevHallmark: prevHallmark,
        prevBalance: previousBalance,
        billDetailsprofit: billDetailsProfit,
        Stoneprofit: stoneProfit,
        Totalprofit: totalBillProfit,
        // cashBalance: cashBalance,
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
          const productStock = row.stockType === "ITEM_PURCHASE"
            ? itemPurchaseProducts?.find(p => (p.id || p._id) === row.productId)
            : availableProducts?.allStock?.find(p => (p.id || p._id) === row.productId);
          const wt = toNumber(row.wt);
          const stWt = toNumber(row.aStWt);
          const eStWt = toNumber(row.eStWt);
          const awt = wt - stWt;

          const touch = toNumber(productStock?.touch || 0);
          const wastageValue = productStock?.wastage || productStock?.wastageValue;
          //wastage value and wastage is completely different
          // starts here
          // const wastage = (awt * wastageValue) / 100;
          const wastageType = productStock?.wastageType;
          console.log("testing type coming or not", wastageType)
          // const wastagePure = (wastage * touch) / 100;

          // const actualPurity = (awt * touch) / 100;
          // const finalPurity = actualPurity + wastagePure
          return {
            stockId: row.productId,
            stockType: row.stockType || "PRODUCT",
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
            // wastagePure,
            // actualPurity,
            // finalPurity,
          };
        }),

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
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }
      await response.json();

      setBillDetailRows([]);
      // setRows([]);
      setSelectedCustomer(null);
      setBillHallmark("");
      setWeightAllocations({});
      setFieldErrors({});
      setPrevHallmark(0);
      setPreviousBalance(0);
      // setCashBalance("0.00");
      setHallmarkQty(0);
      setSelectedProductCounts({});
      //to fecth new bills
      await fetchAllBills();
      await fetchCustomers();
      // await fetchLastBill();
      //much faster but little slower
      // setBills(prev => [resJson.bill, ...(prev || [])]);
      await fetchProductStock();
      await fetchItemPurchaseStock();
      toast.success("Bill saved successfully!");
    } catch (error) {
      console.error("Error saving bill:", error);
      alert(`Error saving bill: ${error.message}`);
      return;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (isSaving || !editBillId) return;
    setIsSaving(true);

    try {
      if (!selectedCustomer) {
        alert("Please select a customer before updating.");
        toast.error("Please select a customer before updating.");
        return;
      }
      const isFormValid = validateAllFields();
      if (!isFormValid) {
        alert("Please fill in all required fields");
        return;
      }

      const FWT = visibleRows.reduce((total, row) => total + (toNumber(row.fwt) || 0), 0);
      const hallmarkQtyToSave = toNumber(hallmarkQty);
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
        prevHallmark: prevHallmark,
        prevBalance: previousBalance,
        billDetailsprofit: billDetailsProfit,
        Stoneprofit: stoneProfit,
        Totalprofit: totalBillProfit,
        hallmarkQty: hallmarkQtyToSave,

        orderItems: billDetailRows.map((row) => {
          const productStock = row.stockType === "ITEM_PURCHASE"
            ? itemPurchaseProducts?.find(p => (p.id || p._id) === row.productId)
            : availableProducts?.allStock?.find(p => (p.id || p._id) === row.productId);
          const wt = toNumber(row.wt);
          const stWt = toNumber(row.aStWt);
          const eStWt = toNumber(row.eStWt);
          const awt = wt - stWt;

          const touch = toNumber(productStock?.touch || 0);
          const wastageValue = toNumber(productStock?.wastageValue || productStock?.wastage);
          // const wastage = (awt * wastageValue) / 100;
          const wastageType = productStock?.wastageType || "None";
          // const wastagePure = (wastage * touch) / 100;

          // const actualPurity = (awt * touch) / 100;
          // const finalPurity = actualPurity + wastagePure;

          return {
            id: row.orderItemId, // Sending back original ID
            stockId: row.productId,
            stockType: row.stockType || "PRODUCT",
            productName: row.productName,
            count: toNumber(row.count || 0),
            weight: wt,
            stoneWeight: stWt,
            enteredStoneWeight: eStWt,
            afterWeight: awt,
            percentage: toNumber(row.percent),
            finalWeight: toNumber(row.fwt),
            wastageType: wastageType,
            touch,
            netWeight: awt,
            wastageValue,
            repairStatus: row.repairStatus || "Sold",
          };
        }),
      };

      console.log("Payload being sent for update:", billData);
      setPrintBill(billData);

      const response = await fetch(`${BACKEND_SERVER_URL}/api/bill/updateBill/${selectedCustomer.id || selectedCustomer._id}/${editBillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.msg || `HTTP error! status: ${response.status}`);
      }
      await response.json();

      setBillDetailRows([]);
      setSelectedCustomer(null);
      setBillHallmark("");
      setWeightAllocations({});
      setFieldErrors({});
      setPrevHallmark(0);
      setPreviousBalance(0);
      setHallmarkQty(0);
      setSelectedProductCounts({});

      setIsEditMode(false);
      setEditBillId(null);
      
      const isFromUrl = new URLSearchParams(location.search).get("edit");
      if (isFromUrl) {
        navigate(-1);
      }

      await fetchAllBills();
      await fetchCustomers();
      await fetchProductStock();
      await fetchItemPurchaseStock();

      toast.success("Bill updated successfully!");
    } catch (error) {
      console.error("Error updating bill:", error);
      alert(`Error updating bill: ${error.message}`);
      return;
    } finally {
      setIsSaving(false);
    }
  };

  const visibleRows = useMemo(() => {
    return billDetailRows.filter(row => {
      const weight = toNumber(row.wt);
      const isRepairOrReturn = row.repairStatus && row.repairStatus !== "Sold" && row.repairStatus !== "NONE";
      // Hide if it's a full repair/return (weight 0)
      if (isRepairOrReturn && weight <= 0) return false;
      return true;
    });
  }, [billDetailRows]);

  // Keep hallmarkQty in sync with bill rows for new bills
  useEffect(() => {
    if (!isEditMode) {
      const totalCount = visibleRows.reduce((sum, row) => sum + (toNumber(row.count) || 0), 0);
      setHallmarkQty(totalCount);
    }
  }, [visibleRows, isEditMode]);

  const FWT = useMemo(() => visibleRows.reduce((total, row) => total + (toNumber(row.fwt) || 0), 0), [visibleRows]);
  console.log("FWT Calculation:", FWT);
  const { billDetailsProfit, stoneProfit, totalBillProfit, billProfitPercentage } = useMemo(() => {
    let detailsProfit = 0;
    let stoneProfitCalc = 0;

    billDetailRows.forEach((row, index) => {
      let productStock;
      if (row.stockType === "ITEM_PURCHASE") {
        productStock = itemPurchaseProducts?.find(
          (p) => (p.id || p._id) === row.productId
        );
      } else {
        productStock = availableProducts?.allStock?.find(
          (product) => (product.id || product._id) === row.productId
        );
      }

      const awt = toNumber(row.awt);
      const fwt = toNumber(row.fwt);
      const enteredStoneWt = toNumber(row.eStWt);
      const actualStoneWt = toNumber(row.aStWt);
      const enteredPercentage = toNumber(row.percent);

      if (productStock) {
        // Use "wastage" for ITEM_PURCHASE, "wastageValue" for regular products
        const wastageValue =
          row.stockType === "ITEM_PURCHASE"
            ? toNumber(productStock.wastage)
            : toNumber(productStock.wastageValue);

        const purityFromWastage = (awt * wastageValue) / 100;
        const rowBillProfit = fwt - purityFromWastage;
        detailsProfit += rowBillProfit;

        const touchValue = toNumber(productStock.touch) || 0;
        const stoneDifference = Math.max(0, enteredStoneWt - actualStoneWt);
        const rowStoneProfit = (stoneDifference * touchValue) / 100;
        stoneProfitCalc += rowStoneProfit;
      } else {
        console.log("Product stock not found for productId:", row.productId);
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
  }, [billDetailRows, items, availableProducts, itemPurchaseProducts, FWT]);
  const TotalFWT =
    previousBalance > 0
      ? toNumber(FWT) + toNumber(previousBalance)
      : previousBalance < 0
        ? toNumber(FWT) - Math.abs(toNumber(previousBalance))
        : toNumber(FWT);

  const pureBalance = TotalFWT; // Without Received Details, pureBalance is just TotalFWT

  // Determines if a bill row came from Item Purchase (not in productStock)
  const isItemPurchaseRow = (row) => row.stockType === "ITEM_PURCHASE";
  // Hide Count column when every row is from Item Purchase
  const showCountCol = true; // Always show Count column, including for item purchase rows

  const currentHallmarkQty = useMemo(() => {
    return hallmarkQty;
  }, [hallmarkQty]);

  const hallmarkAmount = useMemo(() => toNumber(currentHallmarkQty) * toNumber(billHallmark), [currentHallmarkQty, billHallmark]);
  const totalHallmark = useMemo(() => toNumber(prevHallmark) + toNumber(hallmarkAmount), [prevHallmark, hallmarkAmount]);

  const totalBillHallmark = toNumber(totalHallmark);
  const hallmarkBalance = totalBillHallmark; // Without Received Details, hallmarkBalance is just totalBillHallmark

  const unifiedStock = useMemo(() => {
    const products = (availableProducts?.allStock || []).map(p => ({
      ...p,
      stockType: "PRODUCT",
      uniqueId: `PRODUCT_${p.id || p._id}`,
      displayWeight: toNumber(p.itemWeight),
      displayStone: toNumber(p.stoneWeight),
      displayCount: toNumber(p.count),
      displayWastage: p.wastageValue,
    }));

    const purchases = (itemPurchaseProducts || []).map(p => ({
      ...p,
      stockType: "ITEM_PURCHASE",
      uniqueId: `ITEM_PURCHASE_${p.id || p._id}`,
      displayWeight: toNumber(p.grossWeight),
      displayStone: toNumber(p.stoneWeight),
      displayCount: toNumber(p.count || 1),
      displayWastage: p.wastage,
      source: p.moveTo === "CUSTOMER_RETURN" || p.moveTo === "REPAIR_RETURN" ? p.moveTo : p.source,
    }));

    let combined = [...products, ...purchases];

    // Apply Source Filter (Repaired/Returned/All)
    if (stockSource !== "ALL") {
      combined = combined.filter(p => p.source === stockSource);
    }

    // Apply Search Term
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      combined = combined.filter(p => 
        p.itemName.toLowerCase().includes(s) || 
        (p.touch && p.touch.toString().toLowerCase().includes(s))
      );
    }

    // Apply Product Name Filter
    if (selectedFilter) {
      combined = combined.filter(p => p.itemName === selectedFilter);
    }

    return combined;
  }, [availableProducts, itemPurchaseProducts, stockSource, searchTerm, selectedFilter]);


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
    // Logic moved to unifiedStock useMemo
  };

  const getUniqueProductNames = () => {
    const combined = [
      ...(availableProducts?.allStock || []),
      ...(itemPurchaseProducts || [])
    ];
    const uniqueNames = [...new Set(combined.map((product) => product.itemName))];
    return uniqueNames.sort();
  };

  const handleReset = () => {
    try {
      setBillDetailRows([]);
      // setRows([]);
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
    } catch (err) {
      console.error("Error resetting bill:", err);
      toast.error("Error resetting bill");
    }
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
    display: "flex",
    flexDirection: "column",
    maxHeight: "85vh",
  };

  const sidebarButtonSX = {
    display: "flex",
    color: "white",
    backgroundColor: "#0a4c9a",
    flexDirection: "row",
    gap: "10px",
    cursor: "pointer",
    marginBottom: "5px",
    padding: "8px 12px",
    borderRadius: "8px",
    "&:hover": { backgroundColor: "#0a4c9a" },
    alignSelf: "center",
    width: 80,
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

  const loadBillForEditing = async (id) => {
    try {
      setIsModal(false);
      const response = await fetch(`${BACKEND_SERVER_URL}/api/bill/${id}`);
      const data = await response.json();
      const fetchedBill = data.allBills?.[0] || data;

      if (!fetchedBill) {
        toast.error("Bill not found");
        return;
      }

      setIsEditMode(true);
      setEditBillId(id);

      // Show the bill's original date and time instead of current
      if (fetchedBill.date) {
        setDate(new Date(fetchedBill.date).toLocaleDateString("en-IN"));
      }
      if (fetchedBill.time) {
        setTime(new Date(fetchedBill.time).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }));
      }

      if (fetchedBill.customers) {
        setSelectedCustomer(fetchedBill.customers);
      } else {
        const matchedCust = customers.find(c => c.name === fetchedBill.customername || c.id === fetchedBill.customerId);
        if (matchedCust) setSelectedCustomer(matchedCust);
      }

      setBillNo(fetchedBill.id || id);

      setBillDetailsProfit(fetchedBill.billDetailsprofit || "0.000");
      setStoneProfit(fetchedBill.Stoneprofit || "0.000");
      setTotalBillProfit(fetchedBill.Totalprofit || "0.000");
      setPrevHallmark(toNumber(fetchedBill.prevHallmark || fetchedBill.prevHallMark) || 0);
      setPreviousBalance(toNumber(fetchedBill.PrevBalance || fetchedBill.prevBalance) || 0);

      setHallmarkQty(toNumber(fetchedBill.hallmarkQty) || 0);
      setBillHallmark(toNumber(fetchedBill.hallMark) || 0);

      const newRows = [];
      const newW = {}; const newS = {}; const newC = {}; const counts = {};

      (fetchedBill.orders || []).forEach((item) => {
        const rowId = Date.now() + Math.random();
        const stockType = item.stockType || "PRODUCT";
        const uniqueId = item.stockId ? `${stockType}_${item.stockId}` : "";
        newRows.push({
          id: rowId,
          stockType,
          uniqueId,
          productId: item.stockId,
          productName: item.productName,
          count: item.count?.toString() || "",
          wt: item.weight?.toString() || "",
          aStWt: item.stoneWeight?.toString() || "0.000",
          eStWt: item.enteredStoneWeight?.toString() || "0.000",
          awt: item.afterWeight?.toString() || "",
          percent: item.percentage?.toString() || "",
          fwt: item.finalWeight?.toString() || "",
          repairStatus: item.repairStatus || "Sold",
          orderItemId: item.id, // Store original ID from DB
        });

        if (uniqueId) {
          if (!newW[uniqueId]) newW[uniqueId] = {};
          if (!newS[uniqueId]) newS[uniqueId] = {};
          if (!newC[uniqueId]) newC[uniqueId] = {};

          newW[uniqueId][rowId] = toNumber(item.weight);
          newS[uniqueId][rowId] = toNumber(item.enteredStoneWeight);
          newC[uniqueId][rowId] = toNumber(item.count);
          counts[uniqueId] = (counts[uniqueId] || 0) + 1;
        }
      });

      setBillDetailRows(newRows);
      setWeightAllocations(newW);
      setStoneAllocations(newS);
      setCountAllocations(newC);
      setSelectedProductCounts(counts);

    } catch (err) {
      console.error("Error loading bill:", err);
      toast.error("Failed to load bill for editing");
    }
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditBillId(null);
    
    const isFromUrl = new URLSearchParams(location.search).get("edit");
    if (isFromUrl) {
      navigate(-1);
    }
    setBillDetailRows([]);
    setSelectedCustomer(null);
    setBillHallmark("");
    setWeightAllocations({});
    setStoneAllocations({});
    setCountAllocations({});
    setSelectedProductCounts({});
    setFieldErrors({});
    setPrevHallmark(0);
    setPreviousBalance(0);
    setHallmarkQty(0);

    fetchAllBills();
  };

  const fetchProductStock = async () => {
    try {
      const response = await fetch(`${BACKEND_SERVER_URL}/api/productStock`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setAvailableProducts(data);
      console.log("product stock:", data)
      setOriginalProducts(data);
    } catch (error) {
      console.error("Error fetching Available Products:", error);
    }
  };

  const fetchItemPurchaseStock = async () => {
    try {
      const response = await fetch(`${BACKEND_SERVER_URL}/api/item-purchase/stock`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const mappedData = (data.allStock || []).map(p => {
        if (p.moveTo === "CUSTOMER_RETURN" || p.moveTo === "REPAIR_RETURN") {
          return { ...p, source: p.moveTo };
        }
        return p;
      });
      setItemPurchaseProducts(mappedData);
      console.log("item purchase stock", mappedData)
    } catch (error) {
      console.error("Error fetching Item Purchase Stock:", error);
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
    fetchItemPurchaseStock();
    fetchItems();
    fetchCustomers();
  }, []);

  // Handle edit parameter from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get("edit");
    if (editId && bills.length > 0) {
      loadBillForEditing(Number(editId));
    }
  }, [location.search, bills.length]);

  const handlePrint = () => {
    const billData = {
      billNo: currentBill?.id,
      date: currentBill?.date ? new Date(currentBill.date).toLocaleDateString("en-IN") : date,
      time: currentBill?.time ? new Date(currentBill.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, }) : time,
      selectedCustomer,

      // bill details
      billItems: billDetailRows.map((row) => ({
        productName: row.productName,
        count: row.count,
        weight: row.wt,
        stoneWeight: row.aStWt,
        afterWeight: row.awt,
        percentage: row.percent,
        finalWeight: row.fwt,
        repairStatus: row.repairStatus || "Sold",
      })),
      isEditMode,

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
        style={{
          maxWidth: isEditMode ? '65%' : '60%',
          margin: isEditMode ? '0 auto' : undefined,
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


        <Box style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          marginTop: -45,
          gap: "10px",
        }}
        >


          <Tooltip title="Reset Bill" arrow placement="right">
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
        </Box>
        <h1 className="heading">Estimate Only</h1>
        <Box className="bill-header">
          <Box className="bill-number">
            <p> <strong>Bill No:</strong> {billNo} </p>
          </Box>
          <Box className="bill-info">
            <p> <strong>Date:</strong> {date} <br /><br /> <strong>Time:</strong> {time}  </p>
          </Box>
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

        {/* {selectedCustomer && (
          <Box className="customer-details">
            <h3 className="no-print">Customer Details:</h3>
            <p> <strong>Name:</strong> {selectedCustomer.name} </p>
          </Box>
        )} */}

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
                {showCountCol && <TableCell className="th">Count</TableCell>}
                <TableCell className="th">Wt</TableCell>
                <TableCell className="th">Entered St.WT</TableCell>
                <TableCell className="th">Actual St.WT</TableCell>
                <TableCell className="th">AWT</TableCell>
                <TableCell className="th">Touch</TableCell>
                <TableCell className="th">FWT</TableCell>
                {isEditMode && <TableCell className="th">Status</TableCell>}
                <TableCell className="th no-print">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.length > 0 ? (
                visibleRows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="td">{index + 1}</TableCell>
                    <TableCell className="td">
                      <Box className="product-name-wrap-cell">
                        {row.productName}
                      </Box>
                    </TableCell>

                    {showCountCol && (
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="text"
                          value={row.count}
                          onChange={(e) => handleNumericInput(e, (ev) => handleBillDetailChange(index, "count", ev.target.value))}
                          inputProps={{ style: inputStyle }}
                          error={!!fieldErrors[`billDetail_${index}_count`]}
                          helperText={fieldErrors[`billDetail_${index}_count`] || ""}
                        />
                      </TableCell>
                    )}

                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.wt}
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
                        onChange={(e) => handleNumericInput(e, (ev) => handleBillDetailChange(index, "eStWt", ev.target.value))}
                        inputProps={{ style: inputStyle }}
                        error={!!fieldErrors[`billDetail_${index}_stWt`]}
                        helperText={fieldErrors[`billDetail_${index}_stWt`] || ""}
                      />
                    </TableCell>
                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.aStWt}
                        onChange={(e) => handleNumericInput(e, (ev) => handleBillDetailChange(index, "aStWt", ev.target.value))}
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
                        disabled={!isEditMode}
                        onChange={(e) => handleNumericInput(e, (ev) => handleBillDetailChange(index, "awt", ev.target.value))}
                        inputProps={{ style: inputStyle }}
                      />
                    </TableCell>
                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.percent}
                        onChange={(e) => handleNumericInput(e, (ev) => handleBillDetailChange(index, "percent", ev.target.value))}
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
                        disabled={!isEditMode}
                        onChange={(e) => handleNumericInput(e, (ev) => handleBillDetailChange(index, "fwt", ev.target.value))}
                        inputProps={{ style: inputStyle }}
                      />
                    </TableCell>
                    {isEditMode && (
                      <TableCell className="td">
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            backgroundColor:
                              (row.repairStatus || "").includes("IN_REPAIR") ? "#ff9800"
                              : (row.repairStatus || "").includes("PARTIALLY_IN_REPAIR") ? "#ffb74d"
                              : (row.repairStatus || "").includes("REPAIRED_TO_STOCK") ? "#757575"
                              : (row.repairStatus || "").includes("REPAIRED") ? "#2196f3"
                              : (row.repairStatus || "").includes("PARTIALLY_REPAIRED") ? "#4caf50"
                              : (row.repairStatus || "").includes("RETURNED") ? "#4caf50"
                              : "#9e9e9e",
                            color: "white",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {(() => {
                            const s = row.repairStatus || "";
                            if (!s || s === "Sold" || s === "NONE") return "Sold";
                            
                            // Hybrid Statuses
                            const isRepaired = s.includes("REPAIRED") || s.includes("PARTIALLY_REPAIRED");
                            const isInRepair = s.includes("IN_REPAIR") || s.includes("PARTIALLY_IN_REPAIR");
                            const isReturned = s.includes("RETURNED") || s.includes("PARTIAL_RETURN");

                            if (isRepaired && isReturned) return "Repaired & Returned";
                            if (isInRepair && isReturned) return "In Repair & Returned";

                            // Standard Statuses
                            if (s.includes("PARTIALLY_IN_REPAIR")) return "Partially In Repair";
                            if (s.includes("IN_REPAIR")) return "In Repair";
                            if (s.includes("PARTIALLY_REPAIRED")) return "Partially Repaired";
                            if (s.includes("REPAIRED_TO_STOCK")) return "Repaired (Stock)";
                            if (s.includes("REPAIRED")) return "Repaired";
                            if (s.includes("RETURNED")) return "Returned";
                            
                            return s;
                          })()}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="td no-print">
                      <IconButton onClick={() => handleDeleteBillDetailRow(index)}>
                        <MdDeleteForever style={{ color: "red", fontSize: "20px" }} />
                      </IconButton>
                    </TableCell>


                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="no-products-message">
                    Add Products from Available Products
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

                  onChange={(e) =>
                    handleNumericInput(e, (ev) => {
                      const validatedValue = validateInput(ev.target.value, "hallmarkQty", 0, "hallmark", "number");
                      setHallmarkQty(validatedValue);
                    })
                  }
                  sx={{ width: 60 }}
                  error={!!fieldErrors["hallmark_0_hallmarkQty"]}
                  helperText={fieldErrors["hallmark_0_hallmarkQty"] || ""}
                />
                <p>X</p>
                <TextField
                  size="small"
                  type="text"
                  label="Current Hallmark"
                  value={billHallmark}
                  onChange={(e) =>
                    handleNumericInput(e, (ev) => {
                      const validatedValue = validateInput(ev.target.value, "billHallmark", 0, "hallmark", "number");
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
                  <div>Total FWT: {toFixedStr(TotalFWT, 3)}</div>
                </>
              ) : previousBalance < 0 ? (
                <>
                  <div className="positive">
                    Excess Balance: {toFixedStr(Math.abs(previousBalance), 3)}
                  </div>
                  <div>FWT: {toFixedStr(FWT, 3)}</div>
                  <div>Total FWT: {toFixedStr(TotalFWT, 3)}</div>
                </>
              ) : (
                <>
                  <div className="neutral">Balance: 0.000</div>
                  <div>FWT: {toFixedStr(FWT, 3)}</div>
                  <div>Total FWT: {toFixedStr(TotalFWT, 3)}</div>
                </>
              )}
            </Box>
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
              {/* <strong>Cash Balance: ₹{Number(cashBalance ?? 0).toLocaleString("en-IN")}</strong> */}

              <strong>{hallmarkBalance >= 0
                ? `Hallmark Balance:${toFixedStr(hallmarkBalance, 3)}`
                : `Excess Hallmark Balance:${toFixedStr(hallmarkBalance, 3)}`}
              </strong>
              <strong>
                {pureBalance >= 0
                  ? `Pure Balance: ${toFixedStr(pureBalance, 3)}`
                  : `Excess Balance: ${toFixedStr(pureBalance, 3)}`}
              </strong>
            </div>

          </Box>
          <Box style={{ display: "flex", justifyContent: 'center', gap: '10px' }}>
            {isEditMode ? (
              <>
                <Button
                  variant="outlined"
                  color="secondary"
                  className="save-button no-print"
                  onClick={cancelEditMode}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="warning"
                  className="save-button no-print"
                  onClick={handleUpdate}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                color="primary"
                className="save-button no-print"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}

            {!isEditMode && (
              <Button
                variant="contained"
                color="primary"
                onClick={handlePrintWithSave}
                disabled={isSaving}
                className="save-button no-print"
              >
                Print </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Right panel: available products — hidden during edit mode */}
      {!isEditMode && <Box className="right-panel no-print">
        <Box sx={{ 
          backgroundColor: "#0a4c9a", 
          color: "white", 
          textAlign: "center", 
          py: 1, 
          borderRadius: "8px", 
          marginBottom: "12px",
          fontWeight: "bold"
        }}>
          Available Stock
        </Box>

        {/* Filter controls row */}
        <Box sx={{ display: "flex", gap: "8px", marginBottom: "10px", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
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
                  <MenuItem key={productName} value={productName}>{productName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Button
              size="small"
              variant={stockSource === "REPAIR_RETURN" ? "contained" : "outlined"}
              onClick={() => setStockSource("REPAIR_RETURN")}
            >
              Repaired
            </Button>
            <Button
              size="small"
              variant={stockSource === "CUSTOMER_RETURN" ? "contained" : "outlined"}
              onClick={() => setStockSource("CUSTOMER_RETURN")}
            >
              Returned
            </Button>
            <Button
              size="small"
              variant={stockSource === "ALL" ? "contained" : "outlined"}
              onClick={() => setStockSource("ALL")}
            >
              All
            </Button>
          </Box>
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
                <TableCell className="th" style={{ textAlign: "center" }}>S.No</TableCell>
                <TableCell className="th" style={{ textAlign: "center" }}>Item Name</TableCell>
                <TableCell className="th" style={{ textAlign: "center" }}>Item WT</TableCell>
                <TableCell className="th" style={{ textAlign: "center" }}>Stone WT</TableCell>
                <TableCell className="th" style={{ textAlign: "center" }}>Count</TableCell>
                <TableCell className="th" style={{ textAlign: "center" }}>Wastage</TableCell>
                <TableCell className="th" style={{ textAlign: "center" }}>Touch</TableCell>
                <TableCell className="th" style={{ textAlign: "center" }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unifiedStock.length > 0 ? (
                unifiedStock.slice(stockPage * stockRowsPerPage, stockPage * stockRowsPerPage + stockRowsPerPage).map((prodata, index) => {
                  const uniqueId = prodata.uniqueId;
                  const isItemPurchase = prodata.stockType === "ITEM_PURCHASE";
                  
                  const remainingWeight = getRemainingWeight(uniqueId, isItemPurchase ? prodata.displayWeight : prodata.itemWeight);
                  const remainingStone = getRemainingStone(uniqueId, isItemPurchase ? prodata.displayStone : prodata.stoneWeight);
                  const remainingCount = getRemainingCount(uniqueId, isItemPurchase ? prodata.displayCount : prodata.count);

                  const addedCount = selectedProductCounts[uniqueId] || 0;
                  const isSelected = addedCount > 0;
                  const isFullyAllocated = remainingWeight <= 0 && remainingCount <= 0;

                  return (
                    <TableRow
                      key={uniqueId}
                      hover
                      style={{
                        cursor: isFullyAllocated ? "not-allowed" : "pointer",
                        backgroundColor: isFullyAllocated ? "#f5f5f5" : isSelected ? "#e6f4ff" : "transparent",
                        borderLeft: isSelected ? "4px solid #0a4c9a" : "none",
                        opacity: isFullyAllocated ? 0.6 : 1,
                        textAlign: "center",
                      }}
                      onClick={() => {
                        if (!isFullyAllocated) {
                          if (isItemPurchase) handleItemPurchaseClick(prodata);
                          else handleProductClick(prodata);
                        }
                      }}
                    >
                      <TableCell className="td" style={{ textAlign: "center" }}>{index + 1 + (stockPage * stockRowsPerPage)}</TableCell>
                      <TableCell className="td" style={{ textAlign: "center" }}>
                        <span>{prodata.itemName}</span>
                      </TableCell>
                      <TableCell className="td" style={{ color: remainingWeight <= 0 ? "red" : "green", fontWeight: "bold", textAlign: "center" }}>
                        {toNumber(remainingWeight).toFixed(3)}
                      </TableCell>
                      <TableCell className="td" style={{ textAlign: "center" }}>
                        {toNumber(remainingStone).toFixed(3)}
                      </TableCell>
                      <TableCell className="td" style={{ textAlign: "center" }}>
                        {toNumber(remainingCount).toString()}
                      </TableCell>
                      <TableCell className="td" style={{ textAlign: "center" }}>
                        {toNumber(prodata.displayWastage).toFixed(3)}
                      </TableCell>
                      <TableCell className="td" style={{ textAlign: "center" }}>
                        {prodata.touch}
                      </TableCell>
                      <TableCell className="td" style={{ textAlign: "center" }}>
                        {prodata.source === "REPAIR_RETURN" || prodata.source === "CUSTOMER_RETURN" ? (
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
                        ) : (
                          <span style={{ fontSize: 11, color: "#9e9e9e" }}>
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="no-products-message">
                    No matching products found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={unifiedStock.length}
          rowsPerPage={stockRowsPerPage}
          page={stockPage}
          onPageChange={(e, newPage) => setStockPage(newPage)}
          onRowsPerPageChange={(e) => {
            setStockRowsPerPage(parseInt(e.target.value, 10));
            setStockPage(0);
          }}
        />
        <ToastContainer />
      </Box>}

      <Modal open={isModal} onClose={() => setIsModal(false)}>
        <Box sx={modalStyle}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              All Bills
            </Typography>
            <IconButton
              onClick={() => setIsModal(false)}
              sx={{
                width: "40px",
                height: "40px",
                backgroundColor: "#f44336",
                color: "white",
                '&:hover': { backgroundColor: "#d32f2f" }
              }}
            >
              ×
            </IconButton>
          </Box>

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by Bill No or Customer Name..."
            value={billSearchTerm}
            onChange={(e) => setBillSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <TableContainer sx={{ flexGrow: 1, overflow: 'auto', maxHeight: 'calc(85vh - 160px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell style={{ textAlign: "center", backgroundColor: "#06387a", color: "white", width: "90px" }}>  Bill No </TableCell>
                  <TableCell style={{ textAlign: "center", backgroundColor: "#06387a", color: "white", width: "150px" }} >Customer </TableCell>
                  <TableCell style={{ textAlign: "center", backgroundColor: "#06387a", color: "white", width: "110px" }}> Amount </TableCell>
                  <TableCell style={{ textAlign: "center", backgroundColor: "#06387a", color: "white", width: "110px" }} >  Date </TableCell>
                  <TableCell style={{ textAlign: "center", backgroundColor: "#06387a", color: "white", width: "150px" }}> Actions </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBills.length > 0 ? (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell style={{ textAlign: "center" }}>  {bill.id} </TableCell>
                      <TableCell style={{ textAlign: "center" }}> {bill.customers?.name || "N/A"} </TableCell>
                      <TableCell style={{ textAlign: "center" }}>  {bill.billAmount} </TableCell>
                      <TableCell style={{ textAlign: "center" }}>  {new Date(bill.createdAt).toLocaleDateString("en-GB")} </TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => { setIsModal(false); navigate(`/bill-view/${bill.id}`); }}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => loadBillForEditing(bill.id)}
                          >
                            Edit
                          </Button>
                        </div>
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
          </TableContainer>
        </Box>
      </Modal>
    </Box >
  );
};

export default Billing;