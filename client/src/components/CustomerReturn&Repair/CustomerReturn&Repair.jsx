import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField,
  TablePagination,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./Customer.css";
import axios from "axios";
import CloseIcon from "@mui/icons-material/Close";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

// Helper utilities
const toNumber = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const safeFixed = (v, d = 3) => {
  const n = toNumber(v);
  return n.toFixed(d);
};

// import "./Stock.css";
const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 800,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 3,
  borderRadius: "8px",
};

const CustomerReturn = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // filters (Stored and displayed as DD/MM/YYYY)
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(() => dayjs().subtract(15, "day"));
  const [toDate, setToDate] = useState(() => dayjs());

  // "RETURN" | "REPAIR"
  const [actionType, setActionType] = useState(null);

  // const [openRepairDialog, setOpenRepairDialog] = useState(false);
  // const [repairReason, setRepairReason] = useState("");
  // const [selectedItem, setSelectedItem] = useState(null);
  //return pop up 
  const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnQC, setReturnQC] = useState({
    touch: 0,
    itemWeight: 0,
    count: 1,
    stoneWeight: 0,
    wastageValue: 0,
    wastageType: null,
    wastagePure: 0,
    netWeight: 0,
    finalPurity: 0,
    finalWeight: 0,
  });
  const [repairQC, setRepairQC] = useState({
    touch: 0,
    itemWeight: 0,
    count: 1,
    stoneWeight: 0,
    wastageValue: 0,
    wastageType: null,
    wastagePure: 0,
    netWeight: 0,
    finalPurity: 0,
    finalWeight: 0,
  });
  //send to repair popup
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [selectedGoldsmith, setSelectedGoldsmith] = useState("");
  const [reason, setReason] = useState("");           // ⭐ NEW
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [goldsmiths, setGoldsmiths] = useState([]);

  useEffect(() => {
    if (openSendDialog) {
      fetchGoldsmiths();
    }
  }, [openSendDialog]);

  const calculatePurity = (qc) => {
    const netWeight = (Number(qc.itemWeight) || 0) - (Number(qc.stoneWeight) || 0);
    const actualPurity = (netWeight * (Number(qc.touch) || 0)) / 100;
    let finalPurity = 0;
    let wastagePure = 0;

    if (qc.wastageType === "Touch") {
      finalPurity = (netWeight * (Number(qc.wastageValue) || 0)) / 100;
      wastagePure = finalPurity - actualPurity;
    } else if (qc.wastageType === "%") {
      const wastageWeight = (netWeight * (Number(qc.wastageValue) || 0)) / 100;
      finalPurity = ((netWeight + wastageWeight) * (Number(qc.touch) || 0)) / 100;
      wastagePure = finalPurity - actualPurity;
    } else if (qc.wastageType === "+") {
      finalPurity = ((netWeight + (Number(qc.wastageValue) || 0)) * (Number(qc.touch) || 0)) / 100;
      wastagePure = finalPurity - actualPurity;
    }

    return { netWeight, actualPurity, finalPurity, wastagePure };
  };

  const {
    netWeight: currentNetWeight,
    actualPurity: currentActualPurity,
    finalPurity: currentFinalPurity,
    wastagePure: currentWastagePure,
  } = calculatePurity(returnQC);

  const {
    netWeight: currentRepairNetWeight,
    actualPurity: currentRepairActualPurity,
    finalPurity: currentRepairFinalPurity,
    wastagePure: currentRepairWastagePure,
  } = calculatePurity(repairQC);

  const openRepairPopup = (item) => {
    setSelectedProduct(item);
    setSelectedGoldsmith("");
    setReason("");
    setRepairQC({
      itemWeight: item.weight || 0,
      touch: item.touch || item.percentage || 0,
      count: item.count || 0,
      stoneWeight: item.stoneWeight || 0,
      wastageValue: item.wastageValue || 0,
      wastageType: item.wastageType || null,
      wastagePure: item.wastagePure || 0,
      netWeight: item.netWeight || 0,
      finalPurity: item.finalPurity || 0,
      finalWeight: item.finalWeight || 0,
    });
    setOpenSendDialog(true);
  };

  const openReturnPopup = (item) => {
    setSelectedProduct(item);
    console.log("item", item);
    setReturnQC({
      itemWeight: item.weight || 0,
      touch: item.touch || item.percentage || 0,
      count: item.count || 0,
      stoneWeight: item.stoneWeight || 0,
      wastageValue: item.wastageValue || 0,
      wastageType: item.wastageType || null,
      wastagePure: item.wastagePure || 0,
      netWeight: item.netWeight || 0,
      finalPurity: item.finalPurity || 0,
      finalWeight: item.finalWeight || 0,
    });

    setReturnReason("");
    setOpenReturnDialog(true);
  };


  // ================= FETCH SOLD BILLS =================
  const fetchSoldBills = async () => {
    try {
      const res = await fetch(`${BACKEND_SERVER_URL}/api/bill?status=ACTIVE`);
      const json = await res.json();
      setBills(Array.isArray(json.data) ? json.data : []);
      console.log("bills", json.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch bills");
    }
  };

  useEffect(() => {
    fetchSoldBills();
  }, []);

  const fetchGoldsmiths = async () => {
    const res = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
    setGoldsmiths(res.data || []);
  };

  // ================= FILTER LOGIC =================



  const filteredBills = bills.filter((bill) => {

    const searchValue = search.toLowerCase();
    // const allReturned = bill.orders?.every(item => item.repairStatus === "RETURNED");
    // if (allReturned) return false;

    const matchesSearch =
      !search ||
      bill.id.toString().includes(searchValue) ||
      bill.customers?.name?.toLowerCase().includes(searchValue) ||
      bill.orders?.some(item =>
        item.productName?.toLowerCase().includes(searchValue)
      );

    const billDateLocal = bill.date ? dayjs(bill.date) : null;

    // Normalize bounds to ignore time comparison errors
    const from = fromDate ? fromDate.startOf("day") : null;
    const to = toDate ? toDate.endOf("day") : null;

    const matchesFrom = !from || (billDateLocal && (billDateLocal.isAfter(from) || billDateLocal.isSame(from, "day")));
    const matchesTo = !to || (billDateLocal && (billDateLocal.isBefore(to) || billDateLocal.isSame(to, "day")));

    return matchesSearch && matchesFrom && matchesTo;
  }).sort((a, b) => {
    if (fromDate || toDate) {
      return new Date(a.date) - new Date(b.date); // Ascending
    } else {
      return new Date(b.date) - new Date(a.date); // Descending
    }
  });


  // ================= PAGINATION =================
  const paginatedBills = filteredBills.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );


  useEffect(() => {
    setPage(0);
  }, [search, fromDate, toDate, rowsPerPage]);


  // ================= RETURN SINGLE ITEM =================
  // const returnItem = async (item) => {
  //   if (!window.confirm(`Return ${item.productName}?`)) return;
  //   console.log("data",item);
  //   try {
  //     setLoading(true);
  //     const res = await fetch(`${BACKEND_SERVER_URL}/api/returns/customer-item-return`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         billId: selectedBill.id,
  //         productId: item.id,
  //         orderItemId: item.id,
  //         reason: "Customer return",
  //         productName: item.productName,
  //         weight: item.weight,
  //         stoneWeight: item.stoneWeight,
  //         count: item.count,
  //       }),
  //     });
  //     console.log("data",item);
  //     if (!res.ok) throw new Error();

  //     toast.success("Item returned successfully");
  //     setSelectedBill(prev => ({
  //       ...prev,
  //       orders: prev.orders.map(o =>
  //         o.id === item.id
  //           ? { ...o, repairStatus: "RETURNED" }
  //           : o
  //       )
  //     }));

  //     setSelectedBill(null);
  //     fetchSoldBills();
  //   } catch {
  //     toast.error("Failed to return item");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const confirmReturn = async () => {
    if (returnLoading) return;
    try {
      if (!returnQC.itemWeight || Number(returnQC.itemWeight) <= 0) {
        toast.error("Item Weight is mandatory and must be greater than zero");
        return;
      }
      if (!returnQC.count || Number(returnQC.count) <= 0) {
        toast.error("Count is mandatory and must be greater than zero");
        return;
      }

      setReturnLoading(true);

      const updatedOrderItem = (await axios.post(
        `${BACKEND_SERVER_URL}/api/returns/customer-item-return`,
        {
          billId: selectedBill.id,
          currentHallmark: selectedBill.hallMark || 0,
          orderItemId: selectedProduct.id,
          reason: returnReason,
          ...returnQC,
          netWeight: currentNetWeight,
          wastagePure: currentWastagePure,
          finalPurity: currentFinalPurity,
          actualPurity: currentActualPurity,
          finalWeight: (currentNetWeight * Number(selectedProduct?.percentage || 0)) / 100, // Sync with FWT calculation
        }
      )).data.updatedOrderItem;

      toast.success("Item returned successfully");

      setSelectedBill(prev => {
        const updatedBill = {
          ...prev,
          orders: prev.orders.map(o =>
            o.id === selectedProduct.id ? updatedOrderItem : o
          )
        };
        setBills(currentBills =>
          currentBills.map(b => b.id === updatedBill.id ? updatedBill : b)
        );
        return updatedBill;
      });

      setOpenReturnDialog(false);
      // Removed setSelectedBill(null) and fetchSoldBills() to keep modal open
    } catch (err) {
      toast.error("Failed to return item");
    } finally {
      setReturnLoading(false);
    }
  };
  // ================= RETURN ENTIRE BILL =================
  // const returnEntireBill = async () => {
  //   if (!window.confirm(`Return entire Bill #${selectedBill.id}?`)) return;

  //   const hasRepairItems = selectedBill.orders?.some(
  //     item => item.repairStatus === "IN_REPAIR"
  //   );

  //   if (hasRepairItems) {
  //     toast.error("Cannot return bill while items are in repair");
  //     return;
  //   }


  //   try {
  //     setLoading(true);


  //     const res = await fetch(`${BACKEND_SERVER_URL}/api/returns/customer-bill-return`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         billId: selectedBill.id,
  //         reason: "Full bill return",
  //       }),
  //     });

  //     if (!res.ok) throw new Error();

  //     toast.success("Entire bill returned");
  //     setSelectedBill(null);
  //     fetchSoldBills();
  //   } catch {
  //     toast.error("Failed to return bill");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  //sned to repair
  const handleSend = async () => {
    if (repairLoading) return;
    try {
      if (!repairQC.itemWeight || Number(repairQC.itemWeight) <= 0) {
        toast.error("Item Weight is mandatory and must be greater than zero");
        return;
      }
      if (!repairQC.count || Number(repairQC.count) <= 0) {
        toast.error("Count is mandatory and must be greater than zero");
        return;
      }
      if (!selectedGoldsmith) {
        toast.error("Please select a goldsmith");
        return;
      }
      setRepairLoading(true);
      setLoading(true);

      const updatedOrderItem = (await axios.post(`${BACKEND_SERVER_URL}/api/repair/customer-send`, {
        billId: selectedBill.id,
        goldsmithId: selectedGoldsmith,
        orderItemId: selectedProduct.id,
        repairProduct: {
          ...selectedProduct,
          weight: repairQC.itemWeight,
          count: repairQC.count,
          stoneWeight: repairQC.stoneWeight,
          touch: repairQC.touch,
          wastageValue: repairQC.wastageValue,
          wastageType: repairQC.wastageType,
          wastagePure: currentRepairWastagePure,
          netWeight: currentRepairNetWeight,
          finalPurity: currentRepairFinalPurity,
          actualPurity: currentRepairActualPurity,
          finalWeight: (currentRepairNetWeight * Number(selectedProduct?.percentage || 0)) / 100, // Sync with FWT calculation
        },
        reason
      })).data.updatedOrderItem;

      console.log("data to send", selectedProduct)
      toast.success("Item sent to repair");

      setSelectedBill(prev => {
        const updatedBill = {
          ...prev,
          orders: prev.orders.map(item =>
            item.id === selectedProduct.id ? updatedOrderItem : item
          )
        };
        setBills(currentBills =>
          currentBills.map(b => b.id === updatedBill.id ? updatedBill : b)
        );
        return updatedBill;
      });

      setOpenSendDialog(false);
      setReason("");
      setSelectedProduct(null);
      // Removed fetchSoldBills() to avoid unnecessary re-fetch while modal is open

    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send to repair");
    } finally {
      setRepairLoading(false);
      setLoading(false);
    }
  };

  const repairEntireBill = async () => {
    if (!window.confirm(`Send entire Bill #${selectedBill.id} to repair?`)) return;

    try {
      setLoading(true);

      await axios.post(`${BACKEND_SERVER_URL}/api/repair/customer-bill-send`, {
        billId: selectedBill.id,
        reason: "Entire bill repair"
      });

      toast.success("Entire bill sent to repair");
      setSelectedBill(null);
      fetchSoldBills();

    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to repair bill");
    } finally {
      setLoading(false);
    }
  };

  const hasRepairItems = selectedBill?.orders?.some(
    item => ["IN_REPAIR", "IN_REPAIR_SPLIT"].includes(item.repairStatus)
  );

  const allReturned = selectedBill?.orders?.every(
    item => ["RETURNED", "REPAIRED", "REPAIRED_TO_STOCK"].includes(item.repairStatus)
  );


  const safeFixed = (v, d = 3) =>
    isNaN(parseFloat(v)) ? "0.000" : parseFloat(v).toFixed(d);

  const showValue = (v) =>
    v === null || v === undefined || v === "" ? "-" : v;

  const getStatusLabel = (status) => {
    if (!status || status === "Sold" || status === "NONE") return "Sold";
    const isPartRet = status.includes("PARTIAL_RETURN");
    const isPartRep = status.includes("PARTIAL_REPAIR");
    const s = status || "";
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
  };

  const handlePrint = () => {
    const fmtPrintDate = (d) => {
      if (!d) return "—";
      return d.format("DD/MM/YYYY");
    };

    const dateRangeText =
      fromDate || toDate
        ? `Date Range: ${fmtPrintDate(fromDate)} to ${fmtPrintDate(toDate)}`
        : "";

    const tableRows = filteredBills
      .map(
        (bill, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${bill.id}</td>
        <td>${bill.customers?.name || "-"}</td>
        <td>${bill.orders
          ?.map(o => o.productName).join(", ") || "-"}</td>
        <td>${bill.date ? new Date(bill.date).toLocaleDateString("en-IN") : "-"}</td>
      </tr>`
      )
      .join("");

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Return &amp; Repair</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; margin: 20px; }
            h2 { text-align: center; margin-bottom: 4px; }
            .date-range { text-align: center; font-weight: bold; margin-bottom: 12px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #aaa; padding: 6px 9px; text-align: left; font-size: 12px; white-space: nowrap; }
            th { background: #2c3e50; color: #fff; font-weight: bold; }
            tr:nth-child(even) td { background: #f9f9f9; }
            @media print {
              th { background-color: #2c3e50 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #fff !important; }
            }
          </style>
        </head>
        <body>
          <h2>Customer Return &amp; Repair</h2>
          ${dateRangeText ? `<p class="date-range">${dateRangeText}</p>` : ""}
          <table>
            <thead>
              <tr><th>S.No</th><th>Bill No</th><th>Customer</th><th>Product</th><th>Date</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(printHtml);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Customer Return & Repair
      </Typography>

      {/* ===== Filters ===== */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="Search (Bill / Customer / Product)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="From Date"
            value={fromDate}
            format="DD/MM/YYYY"
            onChange={(newValue) => {
              if (newValue && toDate && newValue.isAfter(toDate, "day")) {
                toast.error("From Date cannot be after To Date");
                return;
              }
              setFromDate(newValue);
            }}
            slotProps={{ textField: { size: "small", sx: { width: 260 } } }}
          />
        </LocalizationProvider>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="To Date"
            value={toDate}
            format="DD/MM/YYYY"
            minDate={fromDate || undefined}
            onChange={(newValue) => {
              if (newValue && fromDate && newValue.isBefore(fromDate, "day")) {
                toast.error("To Date cannot be before From Date");
                return;
              }
              setToDate(newValue);
            }}
            slotProps={{ textField: { size: "small", sx: { width: 260 } } }}
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
            setSearch("");
            setFromDate(null);
            setToDate(null);
          }}
        >
          Reset
        </Button>
        <Button variant="outlined" onClick={handlePrint}>
          Print
        </Button>
      </Box>


      {/* ===== Bills Table ===== */}
      <Table >
        <TableHead className="BillTable">
          <TableRow>
            <TableCell className="BillTable-th-td" style={{ width: '10px !important' }}>S.No</TableCell>
            <TableCell className="BillTable-th-td">Bill No</TableCell>
            <TableCell className="BillTable-th-td">Customer</TableCell>
            <TableCell className="BillTable-th-td">Product</TableCell>
            <TableCell className="BillTable-th-td">Date</TableCell>
            <TableCell className="BillTable-th-td">Bill View</TableCell>
            <TableCell className="BillTable-th-td">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedBills.length > 0 ? (
            paginatedBills.map((bill, index) => (
              <TableRow key={bill.id}>
                <TableCell className="BillTable-tb-td">
                  {page * rowsPerPage + index + 1}
                </TableCell>
                <TableCell className="BillTable-tb-td">{bill.id}</TableCell>
                <TableCell className="BillTable-tb-td">
                  {showValue(bill.customers?.name)}
                </TableCell>
                <TableCell className="BillTable-tb-td">
                  {bill.orders
                    ?.filter(o => !o.repairStatus?.includes("REPAIRED_TO_STOCK") && !o.repairStatus?.includes("IN_REPAIR_SPLIT"))
                    .map(o => o.productName).join(", ") || "-"}
                </TableCell>
                <TableCell className="BillTable-tb-td">
                  {bill.date
                    ? new Date(bill.date).toLocaleDateString("en-IN")
                    : "-"}
                </TableCell>
                <TableCell className="BillTable-tb-td">
                  <Button
                    variant="outlined"
                    onClick={() => navigate(`/bill-view/${bill.id}`)}
                  >
                    View Bill
                  </Button>
                </TableCell>
                <TableCell className="BillTable-tb-td">
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSelectedBill(bill)
                      setActionType("RETURN");
                    }}
                  >
                    Return
                  </Button>{" "}
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => {
                      setSelectedBill(bill);
                      setActionType("REPAIR");
                    }}
                  >
                    Repair
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} align="center">
                No matching bills
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={filteredBills.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(e, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />

      {/* ===== Modal ===== */}
      <Modal open={!!selectedBill} onClose={() => {
        setSelectedBill(null);
        setActionType(null);
      }}>
        <Box sx={modalStyle}>
          {selectedBill && (
            <>
              {/* HEADER */}
              <div className="model-heading-section" style={{ position: 'relative', paddingRight: '40px' }}>
                <Typography variant="h6">
                  Bill no: <strong>{selectedBill.id}</strong>
                </Typography>

                <Typography variant="h6">
                  Customer: <strong>{selectedBill.customers?.name}</strong>
                </Typography>

                <IconButton
                  aria-label="close"
                  onClick={() => {
                    setSelectedBill(null);
                    setActionType(null);
                  }}
                  sx={{
                    position: 'absolute',
                    right: -8,
                    top: -8,
                    color: (theme) => theme.palette.grey[500],
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </div>

              {/* ================= RETURN MODE ================= */}
              {actionType === "RETURN" && (
                <>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell className="BillTable-th-td">Product</TableCell>
                        <TableCell className="BillTable-th-td">Weight</TableCell>
                        <TableCell className="BillTable-th-td">Count</TableCell>
                        <TableCell className="BillTable-th-td">Status</TableCell>
                        <TableCell className="BillTable-th-td">Action</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {selectedBill.orders
                        ?.filter(item => !item.repairStatus?.includes("REPAIRED_TO_STOCK") && !item.repairStatus?.includes("IN_REPAIR_SPLIT"))
                        .map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.weight}</TableCell>
                            <TableCell>{item.count}</TableCell>
                            <TableCell>
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  backgroundColor:
                                    item.repairStatus?.startsWith("IN_REPAIR") ? "#ff9800"
                                      : item.repairStatus?.startsWith("REPAIRED") ? "#2196f3"
                                        : item.repairStatus?.startsWith("RETURNED") ? "#4caf50"
                                          : item.repairStatus?.startsWith("PARTIAL_REPAIR") ? "#ffb74d"
                                            : item.repairStatus?.startsWith("PARTIAL_RETURN") ? "#81c784"
                                              : (item.repairStatus === "NONE" || !item.repairStatus || item.repairStatus === "Sold") ? "#9e9e9e"
                                                : "#9e9e9e",
                                  color: "white",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {getStatusLabel(item.repairStatus)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {toNumber(item.weight) > 0 && !item.repairStatus?.includes("RETURNED") && !item.repairStatus?.includes("IN_REPAIR") ? (
                                <Button
                                  color="error"
                                  variant="outlined"
                                  size="small"
                                  onClick={() => openReturnPopup(item)}
                                  disabled={loading}
                                >
                                  Return Item
                                </Button>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}

                    </TableBody>
                  </Table>

                  {/* {!hasRepairItems && selectedBill?.orders?.some(
                  item => item.repairStatus !== "RETURNED"
                ) && (

                <Button
                  fullWidth
                  sx={{ mt: 2 }}
                  variant="contained"
                  color="error"
                  onClick={returnEntireBill}
                  disabled={loading}
                >
                  Return Entire Bill
                </Button>
              )} */}

                </>
              )}

              {/* ================= REPAIR MODE ================= */}
              {actionType === "REPAIR" && (
                <>
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Send Items to Repair
                  </Typography>

                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell className="BillTable-th-td">Product</TableCell>
                        <TableCell className="BillTable-th-td">Weight</TableCell>
                        <TableCell className="BillTable-th-td">Count</TableCell>
                        <TableCell className="BillTable-th-td">Status</TableCell>
                        <TableCell className="BillTable-th-td">Action</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {selectedBill.orders
                        ?.filter(item => !item.repairStatus?.includes("REPAIRED_TO_STOCK") && !item.repairStatus?.includes("IN_REPAIR_SPLIT"))
                        .map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.weight}</TableCell>
                            <TableCell>{item.count}</TableCell>
                            <TableCell>
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  backgroundColor:
                                    item.repairStatus?.startsWith("IN_REPAIR") ? "#ff9800"
                                      : item.repairStatus?.startsWith("REPAIRED") ? "#2196f3"
                                        : item.repairStatus?.startsWith("RETURNED") ? "#4caf50"
                                          : item.repairStatus?.startsWith("PARTIAL_REPAIR") ? "#ffb74d"
                                            : item.repairStatus?.startsWith("PARTIAL_RETURN") ? "#81c784"
                                              : (item.repairStatus === "NONE" || !item.repairStatus || item.repairStatus === "Sold") ? "#9e9e9e"
                                                : "#9e9e9e",
                                  color: "white",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {getStatusLabel(item.repairStatus)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {toNumber(item.weight) > 0 && !item.repairStatus?.includes("RETURNED") && !item.repairStatus?.includes("IN_REPAIR") ? (
                                <Button
                                  variant="contained"
                                  size="small"
                                  onClick={() => openRepairPopup(item)}
                                >
                                  Send to Repair
                                </Button>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                  {/* <Button
                  fullWidth
                  sx={{ mt: 2 }}
                  variant="contained"
                  color="error"
                  disabled={loading}
                  onClick={repairEntireBill}
                >
                  Repair Entire Bill
                </Button> */}

                </>
              )}
            </>
          )}
        </Box>
      </Modal>

      {/* SEND TO REPAIR POPUP */}
      <Dialog open={openSendDialog} onClose={repairLoading ? null : () => setOpenSendDialog(false)} maxWidth="xl" fullWidth
        PaperProps={{ sx: { minWidth: 500, maxWidth: 700 } }}>
        <DialogTitle sx={{ m: 0, p: 2 }}>
          Send Product to Repair
          <IconButton
            aria-label="close"
            onClick={() => setOpenSendDialog(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ overflow: 'visible' }}>
          {/* ITEM HEADER */}
          {console.log("selectedProduct", selectedProduct)}
          <div
            style={{
              borderBottom: "2px solid #ddd",
              marginBottom: "12px",
              paddingBottom: "8px"
            }}
          >
            <h3 style={{ margin: 0, color: "#2e7d32" }}>
              Item Name : {selectedProduct?.productName}
            </h3>
          </div>

          {/* ITEM INFO CARD */}
          <table style={{ width: "100%", fontSize: '0.95rem', borderCollapse: 'collapse', marginBottom: '15px' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Field</th>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Original</th>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Edit</th>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Current Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Item Weight (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.weight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={repairQC.itemWeight}
                      onChange={(e) =>
                        setRepairQC({ ...repairQC, itemWeight: e.target.value })
                      }
                      error={!repairQC.itemWeight || Number(repairQC.itemWeight) <= 0}
                      helperText={(!repairQC.itemWeight || Number(repairQC.itemWeight) <= 0) ? "Required" : ""}
                      disabled={false}
                      sx={{ width: '100px' }}
                    />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(repairQC.itemWeight)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Count</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{selectedProduct?.count}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0 }}
                      value={repairQC.count}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val < 0) {
                          toast.error("Count cannot be negative");
                          return;
                        }
                        setRepairQC({ ...repairQC, count: e.target.value });
                      }}
                      error={!repairQC.count || Number(repairQC.count) <= 0}
                      helperText={(!repairQC.count || Number(repairQC.count) <= 0) ? "Required" : ""}
                      // disabled={selectedProduct?.stockType === "ITEM_PURCHASE"}
                      sx={{ width: '100px' }}
                    />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {repairQC.count}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Entered St.WT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.enteredStoneWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
              </tr>
              {/* <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Actual St.WT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.stoneWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
              </tr> */}
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Actual St.WT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.stoneWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    value={repairQC.stoneWeight}
                    onChange={(e) =>
                      setRepairQC({ ...repairQC, stoneWeight: e.target.value })
                    }
                    disabled={false}
                    sx={{ width: '100px' }}
                  />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(repairQC.stoneWeight)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>AWT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.afterWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(currentRepairNetWeight)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Touch %</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.percentage)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>FWT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.finalWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#2e7d32', textAlign: 'center' }}>
                  {safeFixed((currentRepairNetWeight * Number(selectedProduct?.percentage || 0)) / 100)}
                </td>
              </tr>
              {/* DEBUG ROWS */}
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666', textAlign: 'center' }}>Touch</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  {safeFixed(selectedProduct?.touch)}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Wastage Type</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{selectedProduct?.wastageType}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{repairQC.wastageType}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Wastage Value</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{selectedProduct?.wastageValue}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{repairQC.wastageValue}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Actual Purity</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(selectedProduct?.actualPurity)}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(currentRepairActualPurity)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Wastage Pure</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(selectedProduct?.wastagePure)}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(currentRepairWastagePure)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Final Purity</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(selectedProduct?.finalPurity)}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(currentRepairFinalPurity)}</td>
              </tr>
            </tbody>
          </table>

          {/* GOLDMSITH SELECT */}
          <TextField
            select
            fullWidth
            label="Goldsmith"
            value={selectedGoldsmith}
            onChange={(e) => setSelectedGoldsmith(e.target.value)}
            margin="normal"
          >
            {goldsmiths.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Repair Reason"
            placeholder="Eg. Stone missing / polish / solder break"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            margin="normal"
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenSendDialog(false)}>Cancel</Button>

          {/* disable until filled (optional) */}
          <Button
            variant="contained"
            disabled={!selectedGoldsmith || !repairQC.itemWeight || Number(repairQC.itemWeight) <= 0 || !repairQC.count || Number(repairQC.count) <= 0 || repairLoading}
            onClick={handleSend}
          >
            {repairLoading ? "Sending..." : "Confirm"}
          </Button>

        </DialogActions>
      </Dialog>

      {/* RETURN POPUP */}
      <Dialog open={openReturnDialog} onClose={returnLoading ? null : () => setOpenReturnDialog(false)} maxWidth="xl" fullWidth
        PaperProps={{ sx: { minWidth: 500, maxWidth: 700 } }}>
        <DialogTitle sx={{ m: 0, p: 2 }}>
          Confirm Customer Return
          <IconButton
            aria-label="close"
            onClick={() => setOpenReturnDialog(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ overflow: 'visible' }}>
          {/* <h4 >Item name{" "}:{" "}{selectedProduct?.productName}</h4> */}
          <div
            style={{
              borderBottom: "2px solid #ddd",
              marginBottom: "12px",
              paddingBottom: "8px"
            }}
          >
            <h3 style={{ margin: 0, color: "#2e7d32" }}>
              Item Name : {selectedProduct?.productName}
            </h3>
          </div>
          <table style={{ width: "100%", fontSize: '0.95rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Field</th>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Original</th>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Edit</th>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Current Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Item Weight (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.weight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={returnQC.itemWeight}
                      onChange={(e) =>
                        setReturnQC({ ...returnQC, itemWeight: e.target.value })
                      }
                      error={!returnQC.itemWeight || Number(returnQC.itemWeight) <= 0}
                      helperText={(!returnQC.itemWeight || Number(returnQC.itemWeight) <= 0) ? "Required" : ""}
                      disabled={false}
                      sx={{ width: '100px' }}
                    />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(returnQC.itemWeight)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Count</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{selectedProduct?.count}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <TextField
                      size="small"
                      type="number"
                      inputProps={{ min: 0 }}
                      value={returnQC.count}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val < 0) {
                          toast.error("Count cannot be negative");
                          return;
                        }
                        setReturnQC({ ...returnQC, count: e.target.value });
                      }}
                      error={!returnQC.count || Number(returnQC.count) <= 0}
                      helperText={(!returnQC.count || Number(returnQC.count) <= 0) ? "Required" : ""}
                      // disabled={selectedProduct?.stockType === "ITEM_PURCHASE"}
                      sx={{ width: '100px' }}
                    />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {returnQC.count}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Entered St.WT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.enteredStoneWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
              </tr>
              {/* <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Actual St.WT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.stoneWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
              </tr> */}
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Actual St.WT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.stoneWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    value={returnQC.stoneWeight}
                    onChange={(e) =>
                      setReturnQC({ ...returnQC, stoneWeight: e.target.value })
                    }
                    disabled={false}
                    sx={{ width: '100px' }}
                  />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(returnQC.stoneWeight)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>AWT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.afterWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(currentNetWeight)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Touch %<br />(profit percentage <br /> entered while billing)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.percentage)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>FWT (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.finalWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#2e7d32', textAlign: 'center' }}>
                  {safeFixed((currentNetWeight * Number(selectedProduct?.percentage || 0)) / 100)}
                </td>
              </tr>
              {/* DEBUG ROWS */}
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>Touch</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  {safeFixed(selectedProduct?.touch)}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Wastage Type</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{selectedProduct?.wastageType}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{returnQC.wastageType}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Wastage Value</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{selectedProduct?.wastageValue}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{returnQC.wastageValue}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Actual Purity</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(selectedProduct?.actualPurity)}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(currentActualPurity)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Wastage Pure</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(selectedProduct?.wastagePure)}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(currentWastagePure)}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#666' }}>Final Purity</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(selectedProduct?.finalPurity)}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{safeFixed(currentFinalPurity)}</td>
              </tr>
            </tbody>
          </table>

          <TextField
            fullWidth
            label="Return Reason"
            margin="normal"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenReturnDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={!returnQC.itemWeight || Number(returnQC.itemWeight) <= 0 || !returnQC.count || Number(returnQC.count) <= 0 || returnLoading}
            onClick={confirmReturn}
          >
            {returnLoading ? "Processing..." : "Confirm Return"}
          </Button>
        </DialogActions>
      </Dialog>
      <ToastContainer position="top-right" autoClose={3000} />
    </Box>
  );
};

export default CustomerReturn;
