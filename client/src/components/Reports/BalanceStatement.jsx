import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { 
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, TablePagination, CircularProgress, Box, Typography, IconButton, 
  Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Card, CardContent 
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ReactDOMServer from "react-dom/server";
import StatementPrint from "./StatementPrint";
import ReturnDetailsModal from "../CustomerReturn&Repair/ReturnDetailsModal";
import RepairDetailsModal from "../CustomerReturn&Repair/RepairDetailsModal";
import "./BalanceStatement.css";

const BalanceStatement = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [entityName, setEntityName] = useState("");
  const [currentBalances, setCurrentBalances] = useState({ cash: 0, hallmark: 0, gold: 0 });
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [selectedLogRow, setSelectedLogRow] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_SERVER_URL}/api/reports/statement/${type}/${id}`, {
        params: {
          fromDate: fromDate?.format("YYYY-MM-DD"),
          toDate: toDate?.format("YYYY-MM-DD")
        }
      });
      setData(response.data.ledger);
      console.log("data",response.data.ledger)
      setEntityName(response.data.customerName || response.data.goldsmithName || response.data.supplierName || "");
      setCurrentBalances(response.data.currentBalances || { cash: 0, hallmark: 0, gold: 0 });
    } catch (error) {
      console.error("Error fetching statement:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type, id, fromDate, toDate]);

  const handleViewDetails = (row) => {
    if (row.module === "Bill") {
      navigate(`/bill-view/${row.refId}`);
    } else if (row.module === "Return" && row.metadata) {
      setSelectedLogRow(row.metadata);
      setReturnModalOpen(true);
    } else if (row.module === "Repair" && row.metadata) {
      setSelectedLogRow(row.metadata);
      setRepairModalOpen(true);
    } else {
      setSelectedDetail(row);
      setDetailDialogOpen(true);
    }
  };

  const handlePrint = () => {
    const printContent = (
      <StatementPrint
        data={data}
        type={type}
        entityName={entityName}
        fromDate={fromDate?.format("DD/MM/YYYY")}
        toDate={toDate?.format("DD/MM/YYYY")}
      />
    );

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Balance Statement</title>
          <style>
            body { margin: 0; padding: 0; font-family: sans-serif; }
            @media print { .noprint { display: none !important; } }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div style="padding: 20px;">
            ${ReactDOMServer.renderToString(printContent)}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const formatVal = (val) => (val != null ? val.toFixed(3) : "0.000");

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="balance-statement-page">
      {/* Header Dashboard Section */}
      <Box className="statement-dashboard">
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => navigate(-1)} className="back-btn-dashboard">
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" className="dashboard-entity-name">
                  {entityName}
                </Typography>
                <Typography variant="subtitle2" className="dashboard-module-type">
                  {type.toUpperCase()} LEDGER REPORT
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box display="flex" gap={2} justifyContent="flex-end" flexWrap="wrap">
              <Card className={`summary-card ${type === "goldsmith" ? "hallmark-card" : "balance-card"}`}>
                <CardContent>
                  <Box>
                    <Typography className="summary-label">
                      {type === "goldsmith" ? "Total Gold Balance" : "Total Cash Balance"}
                    </Typography>
                    <Typography className="summary-value">
                      {type === "goldsmith" ? formatVal(currentBalances.gold) : formatVal(currentBalances.cash)} 
                      {type === "goldsmith" ? "g" : ""}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {type === "customer" && (
                <Card className="summary-card hallmark-card">
                  <CardContent>
                    <Box>
                      <Typography className="summary-label">Hallmark Balance</Typography>
                      <Typography className="summary-value">
                        {formatVal(currentBalances.hallmark)}g
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {type === "supplier" && (
                <>
                  <Card className="summary-card supplier-card">
                    <CardContent>
                      <Box>
                        <Typography className="summary-label">BC Balance</Typography>
                        <Typography className="summary-value">
                          {formatVal(currentBalances.bc)}g
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                  <Card className="summary-card supplier-card">
                    <CardContent>
                      <Box>
                        <Typography className="summary-label">Item Balance</Typography>
                        <Typography className="summary-value">
                          {formatVal(currentBalances.item)}g
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Control Bar */}
      <Box className="statement-controls">
        <Box display="flex" gap={2} alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From"
              value={fromDate}
              onChange={setFromDate}
              slotProps={{ textField: { size: "small", className: "date-field" } }}
            />
            <DatePicker
              label="To"
              value={toDate}
              onChange={setToDate}
              slotProps={{ textField: { size: "small", className: "date-field" } }}
            />
          </LocalizationProvider>
          <Button 
            startIcon={<FilterAltIcon />} 
            onClick={() => { setFromDate(null); setToDate(null); }}
            className="clear-filter-btn"
          >
            Clear
          </Button>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<PrintIcon />} 
          onClick={handlePrint}
          className="print-btn-dashboard"
        >
          Print Report
        </Button>
      </Box>

      {/* Ledger Table */}
      <TableContainer component={Paper} className="statement-table-paper">
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell width="60px" align="center">S.No</TableCell>
              <TableCell width="120px">Date</TableCell>
              <TableCell width="140px">Transaction Type</TableCell>
              <TableCell>Description</TableCell>
              
              {type === "customer" && (
                <>
                  <TableCell align="right" className="col-group-start">Before Bal</TableCell>
                  <TableCell align="right" className="col-pos">+</TableCell>
                  <TableCell align="right" className="col-neg">-</TableCell>
                  <TableCell align="right" className="col-total">Balance</TableCell>
                  <TableCell align="right" className="col-group-start">Before HM</TableCell>
                  <TableCell align="right" className="col-pos">+</TableCell>
                  <TableCell align="right" className="col-neg">-</TableCell>
                  <TableCell align="right" className="col-total">HM Balance</TableCell>
                </>
              )}
              
              {type === "goldsmith" && (
                <>
                  <TableCell align="right" className="col-group-start">Before Gold</TableCell>
                  <TableCell align="right" className="col-pos">+</TableCell>
                  <TableCell align="right" className="col-neg">-</TableCell>
                  <TableCell align="right" className="col-total">After Gold</TableCell>
                </>
              )}
              
              {type === "supplier" && (
                <>
                  <TableCell align="right" className="col-group-start">Before BC</TableCell>
                  <TableCell align="right" className="col-pos">+</TableCell>
                  <TableCell align="right" className="col-neg">-</TableCell>
                  <TableCell align="right" className="col-total">BC Bal</TableCell>
                  <TableCell align="right" className="col-group-start">Before Item</TableCell>
                  <TableCell align="right" className="col-pos">+</TableCell>
                  <TableCell align="right" className="col-neg">-</TableCell>
                  <TableCell align="right" className="col-total">Item Bal</TableCell>
                </>
              )}
              
              <TableCell align="center" width="80px">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
              <TableRow key={index} hover className={`${row.type === "Opening" ? "row-opening" : ""} ${row.isManualAdjustment ? "row-adjustment" : ""}`}>
                <TableCell align="center" className="cell-sno">{index + 1 + (page * rowsPerPage)}</TableCell>
                <TableCell className="cell-date">{new Date(row.date).toLocaleDateString("en-GB")}</TableCell>
                <TableCell>
                  <span className={`tag-module ${row.module.toLowerCase().replace(/\s+/g, '-')}`}>
                    {row.module}
                  </span>
                </TableCell>
                <TableCell className="cell-desc">
                  {row.isManualAdjustment ? <span className="adj-indicator">↳ Audit: </span> : ""}
                  {row.description}
                </TableCell>
                
                {type === "customer" && (
                  <>
                    <TableCell align="right" className="cell-before">{formatVal(row.beforeCash)}</TableCell>
                    <TableCell align="right" className="cell-debit">{row.debitAmount > 0 ? formatVal(row.debitAmount) : "-"}</TableCell>
                    <TableCell align="right" className="cell-credit">{row.creditAmount > 0 ? formatVal(row.creditAmount) : "-"}</TableCell>
                    <TableCell align="right" className="cell-after">{formatVal(row.afterCash)}</TableCell>
                    
                    <TableCell align="right" className="cell-before">{formatVal(row.beforeHallmark)}</TableCell>
                    <TableCell align="right" className="cell-debit">{row.debitHallmark > 0 ? formatVal(row.debitHallmark) : "-"}</TableCell>
                    <TableCell align="right" className="cell-credit">{row.creditHallmark > 0 ? formatVal(row.creditHallmark) : "-"}</TableCell>
                    <TableCell align="right" className="cell-after">{formatVal(row.afterHallmark)}</TableCell>
                  </>
                )}
                
                {type === "goldsmith" && (
                  <>
                    <TableCell align="right" className="cell-before">{formatVal(row.beforeGold)}</TableCell>
                    <TableCell align="right" className="cell-debit">{row.debitGold > 0 ? formatVal(row.debitGold) : "-"}</TableCell>
                    <TableCell align="right" className="cell-credit">{row.creditGold > 0 ? formatVal(row.creditGold) : "-"}</TableCell>
                    <TableCell align="right" className="cell-after">{formatVal(row.afterGold)}</TableCell>
                  </>
                )}
                
                {type === "supplier" && (
                  <>
                    <TableCell align="right" className="cell-before">{formatVal(row.beforeBC)}</TableCell>
                    <TableCell align="right" className="cell-debit">{row.debitBC > 0 ? formatVal(row.debitBC) : "-"}</TableCell>
                    <TableCell align="right" className="cell-credit">{row.creditBC > 0 ? formatVal(row.creditBC) : "-"}</TableCell>
                    <TableCell align="right" className="cell-after">{formatVal(row.afterBC)}</TableCell>
                    
                    <TableCell align="right" className="cell-before">{formatVal(row.beforeItem)}</TableCell>
                    <TableCell align="right" className="cell-debit">{row.debitItem > 0 ? formatVal(row.debitItem) : "-"}</TableCell>
                    <TableCell align="right" className="cell-credit">{row.creditItem > 0 ? formatVal(row.creditItem) : "-"}</TableCell>
                    <TableCell align="right" className="cell-after">{formatVal(row.afterItem)}</TableCell>
                  </>
                )}
                
                <TableCell align="center">
                  {!row.module.includes("Balance") && (
                    <Tooltip title="View Source">
                      <IconButton size="small" onClick={() => handleViewDetails(row)} className="action-btn-view">
                        <VisibilityIcon fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[15, 30, 50]}
          component="div"
          count={data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </TableContainer>

      {/* Details Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="xs" fullWidth className="detail-dialog">
        <DialogTitle className="dialog-title-themed">
          {selectedDetail?.module} Detail View
        </DialogTitle>
        <DialogContent dividers>
          {selectedDetail && (
            <Box className="dialog-content-box">
              <div className="detail-item">
                <span className="detail-label">Ref ID:</span>
                <span className="detail-val">#{selectedDetail.refId || selectedDetail.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Recorded On:</span>
                <span className="detail-val">{new Date(selectedDetail.date).toLocaleString()}</span>
              </div>
              <div className="detail-item full-desc">
                <span className="detail-label">Description:</span>
                <p className="detail-desc-text">{selectedDetail.description}</p>
              </div>
              <Box className="impact-box">
                <Typography variant="subtitle2" className="impact-header">Ledger Impact</Typography>
                {type === "customer" && (
                  <Box display="flex" justifyContent="space-between" mt={1}>
                    <Box textAlign="center">
                      <Typography variant="caption">Cash</Typography>
                      <Typography className={`impact-val ${((selectedDetail.debitAmount || 0) - (selectedDetail.creditAmount || 0)) >= 0 ? "pos" : "neg"}`}>
                        {formatVal((selectedDetail.debitAmount || 0) - (selectedDetail.creditAmount || 0))}
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="caption">Hallmark</Typography>
                      <Typography className={`impact-val ${((selectedDetail.debitHallmark || 0) - (selectedDetail.creditHallmark || 0)) >= 0 ? "pos" : "neg"}`}>
                        {formatVal((selectedDetail.debitHallmark || 0) - (selectedDetail.creditHallmark || 0))}g
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)} color="inherit">Close</Button>
          <Button variant="contained" color="primary" onClick={() => handleViewDetails(selectedDetail)}>View Source</Button>
        </DialogActions>
      </Dialog>

      <ReturnDetailsModal 
        open={returnModalOpen} 
        onClose={() => setReturnModalOpen(false)} 
        selectedReturn={selectedLogRow} 
      />
      <RepairDetailsModal 
        open={repairModalOpen} 
        onClose={() => setRepairModalOpen(false)} 
        selectedRepair={selectedLogRow} 
      />
    </div>
  );
};

export default BalanceStatement;
