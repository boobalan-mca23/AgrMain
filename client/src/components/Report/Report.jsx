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
  TextField,
  Button,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./Report.css"; // Import the CSS file
import BillView from "../Billing/BillView";
import { useNavigate } from "react-router-dom";
import { MdDeleteForever } from "react-icons/md";

const DailySalesReport = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [date, setDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openModal, setOpenModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/bill`);
        const data = await response.json();
        setBills(data.data || []);
        setFilteredBills(data.data || []);
        console.log("Fetched bills:", data.data || []);
      } catch (error) {
        console.error("Error fetching bills:", error);
      }
    };

    fetchBills();
  }, []);

  useEffect(() => {
    if (date) {
      const filtered = bills.filter(
        (bill) =>
          new Date(bill.createdAt).toDateString() ===
          new Date(date).toDateString()
      );
      setFilteredBills(filtered);
    } else {
      setFilteredBills(bills);
    }
    setPage(0);
  }, [date, bills]);

  // calculate totals - matching billing component logic
  const calculateTotals = (data) => {
    return data.reduce(
      (acc, bill) => {
        // Total Weight - sum of all order weights
        const totalWeight = bill.orders?.reduce(
          (sum, item) => sum + (item.weight || 0),
          0
        ) || 0;
        
        // FWT (Final Weight Total) - sum of all finalWeight from orders
        const FWT = bill.orders?.reduce(
          (sum, item) => sum + (item.finalWeight || 0),
          0
        ) || 0;
        
        // Total Received Purity - sum of all purity from billReceive
        const totalReceivedPurity = bill.billReceive?.reduce(
          (sum, detail) => sum + (detail.purity || 0),
          0
        ) || 0;
        
        // Total Received Amount - sum of all amount from billReceive
        const totalReceivedAmount = bill.billReceive?.reduce(
          (sum, detail) => sum + (detail.amount || 0),
          0
        ) || 0;
        
        // Total Received Hallmark - sum of all receiveHallMark from billReceive
        const totalReceivedHallmark = bill.billReceive?.reduce(
          (sum, detail) => sum + (detail.receiveHallMark || 0),
          0
        ) || 0;

        const pureBalance = bill.customers?.customerBillBalance?.balance || 0;

        const totalTotalProfit = bill.Totalprofit || 0;
        // Calculate balances using billing component logic
        const previousBalance = bill.PrevBalance || 0;
        const TotalFWT =
                  previousBalance > 0
                    ? FWT + previousBalance
                    : previousBalance < 0
                    ? FWT - Math.abs(previousBalance)
                    : FWT;
        
        // Cash balance calculation: prefer stored cashBalance from DB when available
        const dbCashBalance = typeof bill.cashBalance !== "undefined" ? Number(bill.cashBalance) : null;
        const lastGoldRate = [...(bill.billReceive || [])].reverse().find(row => row.goldRate)?.goldRate || 0;
        const computedCashBalance = lastGoldRate ? (lastGoldRate * pureBalance) : 0;
        const cashBalance = dbCashBalance !== null ? dbCashBalance : computedCashBalance;

        // Hallmark balance calculation
        const billHallmark = bill.hallMark || 0;
        const prevHallmark = bill.prevHallMark || 0;
        const hallmarkBalance = (billHallmark + prevHallmark) - totalReceivedHallmark;

        return {
          totalWeight: acc.totalWeight + totalWeight,
          totalFWT: acc.totalFWT + FWT,
          totalReceivedPurity: acc.totalReceivedPurity + totalReceivedPurity,
          totalReceivedAmount: acc.totalReceivedAmount + totalReceivedAmount,
          totalReceivedHallmark: acc.totalReceivedHallmark + totalReceivedHallmark,
          cashBalance: acc.cashBalance + cashBalance,
          totalTotalProfit: acc.totalTotalProfit + totalTotalProfit,
          hallmarkBalance: acc.hallmarkBalance + hallmarkBalance,
          pureBalance: acc.pureBalance + pureBalance,
        };
      },
      {
        totalWeight: 0,
        totalFWT: 0,
        totalReceivedPurity: 0,
        totalReceivedAmount: 0,
        totalReceivedHallmark: 0,
        cashBalance: 0,
        totalTotalProfit: 0,
        hallmarkBalance: 0,
        pureBalance: 0,
      }
    );
  };

  const totals = calculateTotals(filteredBills);
  const topTotals = calculateTotals(
    filteredBills.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleReset = () => {
    setDate("");
    setFilteredBills(bills);
  };

  const handleViewBill = (bill) => {
    setSelectedBill(bill);
    setOpenModal(true);
  };

  const HandlebillDelete = async (billId) => {
    if (window.confirm("Are you sure you want to delete this bill?")) {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/bill/${billId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          alert("Bill deleted successfully");
          // Refresh the bills list
          const updatedBills = bills.filter((bill) => bill.id !== billId);
          setBills(updatedBills);
          setFilteredBills(updatedBills);
        } else {
          alert("Failed to delete the bill");
        }
      } catch (error) {
        console.error("Error deleting bill:", error);
        alert("An error occurred while deleting the bill");
      }
    }
  };

  return (
    <Box className="daily-sales-report-container">
      <Typography variant="h5" className="report-title">
        Daily Sales Report
      </Typography>

      <Box className="filter-controls">
        <TextField
          label="Select From Date"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 200 }}
        />
        <TextField
          label="Select To Date"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 200 }}
        />
        {(fromDate || toDate) && (
          <Button
            variant="outlined"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setPage(0);
            }}
          >
            Clear Filters
          </Button>
        )}
      </Box>

      {/* compute visible bills based on from/to date */}
      {(() => {
        // pick the bill date field used in rows: prefer bill.date then createdAt
        const visibleBills = bills.filter((bill) => {
          if (!fromDate && !toDate) return true;
          const billDate = new Date(bill.date || bill.createdAt);
          if (fromDate && toDate) {
            const from = new Date(fromDate);
            const to = new Date(toDate);
            // normalize time so inclusive of both dates
            from.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
            return billDate >= from && billDate <= to;
          }
          if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            return billDate >= from;
          }
          if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            return billDate <= to;
          }
          return true;
        });

        const totalsVisible = calculateTotals(visibleBills);
        const topTotalsVisible = calculateTotals(
          visibleBills.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        );

        return (
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
                      const totalWeight = bill.orders?.reduce(
                        (sum, item) => sum + (item.weight || 0),
                        0
                      ) || 0;
                      const FWT = bill.orders?.reduce(
                        (sum, item) => sum + (item.finalWeight || 0),
                        0
                      ) || 0;
                      const totalReceivedPurity = bill.billReceive?.reduce(
                        (sum, detail) => sum + (detail.purity || 0),
                        0
                      ) || 0;
                      const previousBalance = bill.PrevBalance || 0;
                      const TotalFWT =
                        previousBalance > 0
                          ? FWT + previousBalance
                          : previousBalance < 0
                          ? FWT - Math.abs(previousBalance)
                          : FWT;
                      const pureBalance = TotalFWT - totalReceivedPurity;
                      const lastGoldRate =
                        [...(bill.billReceive || [])]
                          .reverse()
                          .find((row) => row.goldRate)?.goldRate || 0;
                      const cashBalance = lastGoldRate ? lastGoldRate * pureBalance : 0;

                      return (
                        <TableRow key={bill.id}>
                          <TableCell className="table-cell">BILL-{bill.billno}</TableCell>
                          <TableCell className="table-cell">
                            {new Date(bill.date || bill.createdAt).toLocaleDateString("en-IN") || "-"}
                          </TableCell>
                          <TableCell className="table-cell">{bill.customers?.name || "Unknown"}</TableCell>
                          <TableCell className="table-cell">{totalWeight.toFixed(3)}</TableCell>
                          <TableCell className="table-cell">{totalReceivedPurity.toFixed(3)} g</TableCell>
                          <TableCell
                            className="table-cell"
                            sx={{ color: cashBalance >= 0 ? "#28a745" : "#dc3545" }}
                          >
                            {Number(bill.cashBalance ?? cashBalance ?? 0).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell
                            className="table-cell"
                            sx={{ color: pureBalance >= 0 ? "#28a745" : "#dc3545" }}
                          >
                            {pureBalance.toFixed(3)} g
                          </TableCell>
                          <TableCell
                            className="table-cell"
                            sx={{ color: bill.Totalprofit >= 0 ? "#28a745" : "#dc3545" }}
                          >
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
        );
      })()}
    </Box>
  );
};

export default DailySalesReport;
