import React, { useEffect, useState, useRef } from "react";
import "./overallreport.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  CircularProgress,
  Paper,
  IconButton,
} from "@mui/material";
import { Search, Clear as ClearIcon } from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const OverallReportNew = () => {
  const [reportData, setReportData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeCustomers, setActiveCustomers] = useState([]); // Base list for period
  const [filteredCustomers, setFilteredCustomers] = useState([]); // Search-filtered list
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    setReportData([]);
    try {
      let start = startDate ? startDate.format("YYYY-MM-DD") : "";
      let end = endDate ? endDate.format("YYYY-MM-DD") : "";

      // If 'From' is selected but 'To' is not, default 'To' to today
      if (start && !end) {
        end = dayjs().format("YYYY-MM-DD");
      }
      // If 'To' is selected but 'From' is not, default 'From' to a very early date
      if (!start && end) {
        start = "2000-01-01";
      }

      const queryParams = (start && end) ? `?startDate=${start}&endDate=${end}` : "";
      
      const [customersRes, billsRes, stockRes, entriesRes, purchaseStockRes] = await Promise.all([
        fetch(`${BACKEND_SERVER_URL}/api/customers`),
        fetch(`${BACKEND_SERVER_URL}/api/bill${queryParams}`),
        fetch(`${BACKEND_SERVER_URL}/api/productStock${queryParams}`),
        fetch(`${BACKEND_SERVER_URL}/api/entries${queryParams}`),
        fetch(`${BACKEND_SERVER_URL}/api/item-purchase/itemstock${queryParams}`),
      ]);

      if (!customersRes.ok) throw new Error("Failed to fetch Customers data");
      if (!billsRes.ok) throw new Error("Failed to fetch Bills data");
      if (!stockRes.ok) throw new Error("Failed to fetch Product Stock data");
      if (!entriesRes.ok) throw new Error("Failed to fetch Entries data");
      if (!purchaseStockRes.ok) throw new Error("Failed to fetch Item Purchase Stock data");

      const [customersData, bills, productStock, entriesData, purchaseStockData] = await Promise.all([
        customersRes.json(),
        billsRes.json(),
        stockRes.json(),
        entriesRes.json(),
        purchaseStockRes.json(),
      ]);

      const isFiltered = !!(start && end);
      const billData = bills?.data || [];

      // Calculate totals based on whether filter is applied
      let pureBalanceTotal, hallmarkBalanceTotal, activeCustomersCount;

      if (isFiltered) {
        // When filtered: show only activity (gold movement) for that period
        pureBalanceTotal = billData.reduce(
          (sum, b) => sum + (parseFloat(b.billPureEffect) || 0),
          0
        );
        hallmarkBalanceTotal = billData.reduce(
          (sum, b) => sum + (parseFloat(b.billHallmarkEffect) || 0),
          0
        );
        // Count only customers who billed during this period
        const activeCustomerIds = new Set(billData.map(b => b.customer_id));
        activeCustomersCount = activeCustomerIds.size;
      } else {
        // No filter: show absolute current running balances for all time
        pureBalanceTotal = customersData.reduce(
          (sum, c) => sum + (parseFloat(c.customerBillBalance?.balance) || 0),
          0
        );
        hallmarkBalanceTotal = customersData.reduce(
          (sum, c) => sum + (parseFloat(c.customerBillBalance?.hallMarkBal) || 0),
          0
        );
        activeCustomersCount = customersData.length;
      }

      // Option A: The table always shows ALL customers and their all-time overall running balance
      setActiveCustomers(customersData);
      setFilteredCustomers(customersData);

      setCustomers(customersData);

      const billDetailsProfit = billData.reduce(
        (sum, b) => sum + (parseFloat(b.billDetailsprofit) || 0),
        0
      );
      const stoneProfit = billData.reduce(
        (sum, b) => sum + (parseFloat(b.Stoneprofit) || 0),
        0
      );
      const totalProfit = billData.reduce(
        (sum, b) => sum + (parseFloat(b.Totalprofit) || 0),
        0
      );

      const stockItems = productStock?.allStock || [];
      const totalStockCount = stockItems.length;
      const totalStockTouch = stockItems.reduce(
        (sum, s) => sum + (parseFloat(s.touch) || 0),
        0
      );

      const totalEntriesPurity = entriesData.reduce(
        (sum, e) => sum + (parseFloat(e.finalPurity) || 0),
        0
      );

      const purchaseStockItems = purchaseStockData?.allStock || [];
      const totalPurchaseStockCount = purchaseStockItems.length;
      const totalPurchaseStockTouch = purchaseStockItems.reduce(
        (sum, s) => sum + (parseFloat(s.touch) || 0),
        0
      );

      setReportData([
        { label: "Bill Details Profit", value: `${billDetailsProfit.toFixed(2)}` },
        { label: "Stone Profit", value: `${stoneProfit.toFixed(2)}` },
        { label: "Total Profit", value: `${totalProfit.toFixed(2)}` },
        { label: isFiltered ? "Pure Sold Total" : "Pure Balance Total", value: `${pureBalanceTotal.toFixed(3)} g` },
        { label: isFiltered ? "Hallmark Sold Total" : "Hallmark Balance Total", value: `${hallmarkBalanceTotal.toFixed(3)} g` },
        { label: "Entries Gold Purity", value: `${totalEntriesPurity.toFixed(3)} g` },
        { label: isFiltered ? "Active Customers" : "Total Customers", value: `${activeCustomersCount}` },
        {
          label: isFiltered ? "Stock Added" : "Stock",
          value: `${totalStockCount + totalPurchaseStockCount} Items (Touch ${(totalStockTouch + totalPurchaseStockTouch).toFixed(3)})`,
        },
      ]);
    } catch (err) {
      console.error("Error fetching report:", err);
      toast.error(err.message || "Failed to fetch report data");
      setReportData([{ label: "Error", value: "Could not load data" }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    setFilteredCustomers(
      activeCustomers.filter((c) => c.name?.toLowerCase().includes(lower))
    );
  }, [searchTerm, activeCustomers]);

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const newWin = window.open("", "_blank", "width=1000,height=700");
    newWin.document.write(`
      <html>
        <head>
          <title>Customer Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    newWin.document.close();

    newWin.onload = function () {
      newWin.focus();
      newWin.print();
      newWin.close();
    };
  };


  return (
    <div className="overall-report-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: "#2c3e50" }}>
          Overall Report
        </Typography>
        <Typography variant="subtitle1" sx={{ color: "#7f8c8d", mb: 2 }}>
          Summary of all balances, stock, and profits
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
            className="no-print"
            sx={{ mt: 3 }}
          >
            <DatePicker
              label="From"
              value={startDate}
              onChange={(newValue) => setStartDate(newValue)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { size: "small", sx: { width: { xs: "100%", sm: 200 } } } }}
            />
            <DatePicker
              label="To"
              value={endDate}
              onChange={(newValue) => setEndDate(newValue)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { size: "small", sx: { width: { xs: "100%", sm: 200 } } } }}
              minDate={startDate}
            />
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={() => {
                setStartDate(null);
                setEndDate(null);
              }}
              sx={{ textTransform: "none", color: "#7f8c8d", borderColor: "#7f8c8d", height: 40 }}
            >
              Clear
            </Button>
          </Stack>
        </LocalizationProvider>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <div className="report-cards-container no-print">
            {reportData.map((item, idx) => (
              <div key={idx} className="report-card">
                <div className="card-label">{item.label}</div>
                <div className="card-value">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="customer-balances-section">
            <Box className="no-print" sx={{ mb: 2 }}>
              <TextField
                variant="outlined"
                size="small"
                placeholder="Search customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: "action.active" }} />
                }}
                sx={{ width: { xs: "100%", sm: 300 } }}
              />
            </Box>

            <div ref={printRef}>
              <h2>Customer Bill Balances</h2>
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Pure Balance</th>
                    <th>Hallmark Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c, index) => (
                      <tr key={c.id || index}>
                        <td>{index + 1}</td>
                        <td>{c.name}</td>
                        <td>{c.phone || "-"}</td>
                        <td>{(parseFloat(c.customerBillBalance?.balance) || 0).toFixed(3)}</td>
                        <td>{(parseFloat(c.customerBillBalance?.hallMarkBal) || 0).toFixed(3)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">No matching customers found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="print-btn-container no-print">
              <button className="print-btn" onClick={handlePrint}>
                Print Report
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OverallReportNew;
