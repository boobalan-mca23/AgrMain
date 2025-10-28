import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TablePagination,
  IconButton,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./Report.css";
import { useNavigate } from "react-router-dom";
import { MdDeleteForever } from "react-icons/md";

// MUI pickers + dayjs
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const DailySalesReport = () => {
  const [bills, setBills] = useState([]);
  const [date, setDate] = useState("");

  // use dayjs objects for pickers
  const [fromDate, setFromDate] = useState(null); // dayjs or null
  const [toDate, setToDate] = useState(null); // dayjs or null

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/bill`);
        const data = await response.json();
        setBills(data.data || []);
      } catch (error) {
        console.error("Error fetching bills:", error);
      }
    };
    fetchBills();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [fromDate, toDate]);

  // calculate totals - same logic as you had
  const calculateTotals = (data) => {
    return data.reduce(
      (acc, bill) => {
        const totalWeight =
          bill.orders?.reduce((sum, item) => sum + (item.weight || 0), 0) || 0;
        const FWT =
          bill.orders?.reduce((sum, item) => sum + (item.finalWeight || 0), 0) ||
          0;
        const totalReceivedPurity =
          bill.billReceive?.reduce(
            (sum, detail) => sum + (detail.purity || 0),
            0
          ) || 0;

        const pureBalance = bill.customers?.customerBillBalance?.balance || 0;
        const totalTotalProfit = bill.Totalprofit || 0;

        const previousBalance = bill.PrevBalance || 0;
        const TotalFWT =
          previousBalance > 0
            ? FWT + previousBalance
            : previousBalance < 0
            ? FWT - Math.abs(previousBalance)
            : FWT;

        const dbCashBalance =
          typeof bill.cashBalance !== "undefined"
            ? Number(bill.cashBalance)
            : null;
        const lastGoldRate =
          [...(bill.billReceive || [])]
            .reverse()
            .find((row) => row.goldRate)?.goldRate || 0;
        const computedCashBalance = lastGoldRate ? lastGoldRate * pureBalance : 0;
        const cashBalance = dbCashBalance !== null ? dbCashBalance : computedCashBalance;

        return {
          totalWeight: acc.totalWeight + totalWeight,
          totalFWT: acc.totalFWT + FWT,
          totalReceivedPurity: acc.totalReceivedPurity + totalReceivedPurity,
          cashBalance: acc.cashBalance + cashBalance,
          totalTotalProfit: acc.totalTotalProfit + totalTotalProfit,
          pureBalance: acc.pureBalance + pureBalance,
        };
      },
      {
        totalWeight: 0,
        totalFWT: 0,
        totalReceivedPurity: 0,
        cashBalance: 0,
        totalTotalProfit: 0,
        pureBalance: 0,
      }
    );
  };

  // Filter & sort
  const visibleBills = bills
    .filter((bill) => {
      // no filters => keep all
      if (!fromDate && !toDate) return true;

      const billDate = dayjs(bill.date || bill.createdAt);

      if (fromDate && toDate) {
        const from = fromDate.startOf("day");
        const to = toDate.endOf("day");
        return billDate.valueOf() >= from.valueOf() && billDate.valueOf() <= to.valueOf();
      }
      if (fromDate) {
        const from = fromDate.startOf("day");
        return billDate.valueOf() >= from.valueOf();
      }
      if (toDate) {
        const to = toDate.endOf("day");
        return billDate.valueOf() <= to.valueOf();
      }
      return true;
    })
    .sort((a, b) => {
      // if filter applied -> ascending within range (oldest -> newest)
      if (fromDate || toDate) {
        return dayjs(a.date || a.createdAt).valueOf() - dayjs(b.date || b.createdAt).valueOf();
      }
      // default -> descending (latest first)
      return dayjs(b.date || b.createdAt).valueOf() - dayjs(a.date || a.createdAt).valueOf();
    });

  const totalsVisible = calculateTotals(visibleBills);
  const topTotalsVisible = calculateTotals(
    visibleBills.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  );

  // handlers
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClear = () => {
    setFromDate(null);
    setToDate(null);
    setPage(0);
  };

  const HandlebillDelete = async (billId) => {
    if (window.confirm("Are you sure you want to delete this bill?")) {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/bill/${billId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          alert("Bill deleted successfully");
          const updated = bills.filter((b) => b.id !== billId);
          setBills(updated);
        } else {
          alert("Failed to delete the bill");
        }
      } catch (error) {
        console.error("Error deleting bill:", error);
      }
    }
  };

  return (
    <Box className="daily-sales-report-container">
      <Typography variant="h5" className="report-title">
        Daily Sales Report
      </Typography>

      {/* Filters: MUI DatePickers (Dayjs) */}
      <Box className="filter-controls" style={{ alignItems: "center" }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="date-input-group" style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ marginBottom: 6, fontWeight: 600 }}>From Date</label>
              <DatePicker
                value={fromDate}
                onChange={(newVal) => setFromDate(newVal)}
                format="DD/MM/YYYY"
                slotProps={{ textField: { size: "small", sx: { minWidth: 200 } } }}
                maxDate={toDate || undefined}
                renderInput={(params) => <params.component {...params} />}
              />
            </div>

            <div className="date-input-group" style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ marginBottom: 6, fontWeight: 600 }}>To Date</label>
              <DatePicker
                value={toDate}
                onChange={(newVal) => setToDate(newVal)}
                format="DD/MM/YYYY"
                slotProps={{ textField: { size: "small", sx: { minWidth: 200 } } }}
                minDate={fromDate || undefined}
                renderInput={(params) => <params.component {...params} />}
              />
            </div>

            {(fromDate || toDate) && (
              <Button variant="outlined" onClick={handleClear} sx={{ height: 40 }}>
                Clear Filters
              </Button>
            )}
          </div>
        </LocalizationProvider>
      </Box>

      {/* Summary + Table */}
      <>
        <Box className="summary-cards">
          <Typography className="summary-item">
            <b>Total Weight:</b> {totalsVisible.totalWeight.toFixed(3)} g
          </Typography>
          <Typography className="summary-item">
            <b>Total FWT:</b> {totalsVisible.totalFWT.toFixed(3)} g
          </Typography>
          <Typography className="summary-item">
            <b>Pure Received:</b> {totalsVisible.totalReceivedPurity.toFixed(3)} g
          </Typography>
          <Typography className="summary-item">
            <b>Number of Bills:</b> {visibleBills.length}
          </Typography>
        </Box>

        <TableContainer component={Paper} className="table-container">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="table-header">Bill No</TableCell>
                <TableCell className="table-header">Date</TableCell>
                <TableCell className="table-header">Name</TableCell>
                <TableCell className="table-header">Weight</TableCell>
                <TableCell className="table-header">Pure Received</TableCell>
                <TableCell className="table-header">Cash Balance</TableCell>
                <TableCell className="table-header">Pure Balance</TableCell>
                <TableCell className="table-header">Total Profit</TableCell>
                <TableCell className="table-header">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleBills
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((bill) => {
                  const totalWeight =
                    bill.orders?.reduce((sum, item) => sum + (item.weight || 0), 0) || 0;
                  const totalReceivedPurity =
                    bill.billReceive?.reduce((sum, detail) => sum + (detail.purity || 0), 0) || 0;
                  const previousBalance = bill.PrevBalance || 0;
                  const FWT =
                    bill.orders?.reduce((sum, item) => sum + (item.finalWeight || 0), 0) || 0;
                  const TotalFWT =
                    previousBalance > 0
                      ? FWT + previousBalance
                      : previousBalance < 0
                      ? FWT - Math.abs(previousBalance)
                      : FWT;
                  const pureBalance = TotalFWT - totalReceivedPurity;
                  const lastGoldRate =
                    [...(bill.billReceive || [])].reverse().find((row) => row.goldRate)?.goldRate || 0;
                  const cashBalance = lastGoldRate ? lastGoldRate * pureBalance : 0;

                  return (
                    <TableRow key={bill.id}>
                      <TableCell className="table-cell">BILL-{bill.billno}</TableCell>
                      <TableCell className="table-cell">
                        {dayjs(bill.date || bill.createdAt).format("DD/MM/YYYY")}
                      </TableCell>
                      <TableCell className="table-cell">{bill.customers?.name || "Unknown"}</TableCell>
                      <TableCell className="table-cell">{totalWeight.toFixed(3)}</TableCell>
                      <TableCell className="table-cell">{totalReceivedPurity.toFixed(3)} g</TableCell>
                      <TableCell className="table-cell" sx={{ color: cashBalance >= 0 ? "#28a745" : "#dc3545" }}>
                        {Number(bill.cashBalance ?? cashBalance ?? 0).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="table-cell" sx={{ color: pureBalance >= 0 ? "#28a745" : "#dc3545" }}>
                        {pureBalance.toFixed(3)} g
                      </TableCell>
                      <TableCell className="table-cell" sx={{ color: bill.Totalprofit >= 0 ? "#28a745" : "#dc3545" }}>
                        {(bill.Totalprofit || 0).toFixed(3)} g
                      </TableCell>
                      <TableCell className="table-cell">
                        <IconButton color="primary" onClick={() => navigate(`/bill-view/${bill.id}`)}>
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton color="error" onClick={() => HandlebillDelete(bill.id)}>
                          <MdDeleteForever />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {/* Totals Row */}
              <TableRow className="totals-row">
                <TableCell colSpan={3} className="totals-cell" style={{ textAlign: "center" }}>
                  Total
                </TableCell>
                <TableCell className="totals-cell">{topTotalsVisible.totalWeight.toFixed(3)}</TableCell>
                <TableCell className="totals-cell">{topTotalsVisible.totalReceivedPurity.toFixed(3)} g</TableCell>
                <TableCell className="totals-cell">{Number(topTotalsVisible.cashBalance ?? 0).toLocaleString("en-IN")}</TableCell>
                <TableCell className="totals-cell">{topTotalsVisible.pureBalance.toFixed(3)} g</TableCell>
                <TableCell className="totals-cell">{topTotalsVisible.totalTotalProfit.toFixed(3)} g</TableCell>
                <TableCell className="totals-cell" />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={visibleBills.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </>
    </Box>
  );
};

export default DailySalesReport;
