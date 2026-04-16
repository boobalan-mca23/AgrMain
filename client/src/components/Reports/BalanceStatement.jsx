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
import CloseIcon from '@mui/icons-material/Close';
import ReactDOMServer from "react-dom/server";
import StatementPrint from "./StatementPrint";
import ReturnDetailsModal from "../CustomerReturn&Repair/ReturnDetailsModal";
import RepairDetailsModal from "../CustomerReturn&Repair/RepairDetailsModal";
import "./BalanceStatement.css";

const BalanceStatement = ({ typeOverride }) => {
  const { type: paramType, id } = useParams();
  const type = typeOverride || paramType;
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
    } else if (row.module.startsWith("Repair") && row.metadata) {
      setSelectedLogRow(row.metadata);
      setRepairModalOpen(true);
    } else if ((row.module === "Gold Given" || row.module === "Gold Received" || row.module === "Item Delivery") && row.jobcardId) {
      navigate(`/goldsmithcard/${id}/${entityName}`); 
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

  const renderDetailFields = (metadata) => {
    if (!metadata) return null;
    
    const labelMap = {
      type: "Type",
      amount: "Amount",
      goldRate: "Gold Rate",
      goldWeight: "Gold Weight",
      touch: "Touch (%)",
      purity: "Purity/Fine G",
      pureGold: "Pure Gold",
      gold: "Gold Weight",
      hallmark: "Hallmark Impact",
      billno: "Bill No",
      jobcardId: "Job Card ID",
      itemName: "Item Name",
      itemWeight: "Gross Weight",
      wastagePure: "Wastage (Pure)",
      finalPurity: "Final Purity (Cr/Dr)",
      count: "Count",
      stoneWeight: "Stone Weight",
      totalGiven: "Total Given",
      totalItem: "Total Item",
      stone: "Stone Impact",
      receivedWeight: "Return Weight",
      receivedPurity: "Return Purity",
      reason: "Repair Reason",
      source: "Source Type"
    };

    return Object.entries(metadata).map(([key, value]) => {
      if (value === null || value === undefined) return null;
      let displayVal = value;
      let label = labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      
      if (typeof value === 'number') {
        if (key === 'amount' || key === 'goldRate') displayVal = `₹${value.toLocaleString()}`;
        else if (key === 'touch') displayVal = `${value}%`;
        else if (['goldWeight', 'gold', 'purity', 'pureGold', 'hallmark', 'itemWeight', 'netWeight', 'wastagePure', 'finalPurity', 'totalGiven', 'totalItem', 'stone', 'receivedWeight', 'receivedPurity', 'actualPure', 'bcAmount', 'itemAmount', 'cashAmount'].includes(key)) displayVal = `${value.toFixed(3)} g`;
      }
      
      return (
        <div className="detail-item" key={key}>
          <span className="detail-label">{label}:</span>
          <span className="detail-val">{String(displayVal)}</span>
        </div>
      );
    });
  };

  const StatementInlineDetails = ({ row }) => {
    if (!row.metadata) return null;
    const { module, metadata } = row;

    if (module === "Bill" && metadata.orders) {
      return (
        <div className="inline-detail-container">
          <table className="inline-detail-table bill-details">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Count</th>
                <th>Item Name</th>
                <th>ItemWt</th>
                <th>StoneWt</th>
                <th>AWT</th>
                <th>%</th>
                <th>FWT</th>
              </tr>
            </thead>
            <tbody>
              {metadata.orders.map((order, i) => (
                <tr key={i}>
                  {i === 0 && <td rowSpan={metadata.orders.length}>Bill</td>}
                  <td>{order.count}</td>
                  <td>{order.productName}</td>
                  <td>{formatVal(order.weight)}</td>
                  <td>{formatVal(order.stoneWeight)}</td>
                  <td>{formatVal(order.afterWeight || order.netWeight)}</td>
                  <td>{formatVal(order.percentage)}</td>
                  <td>{formatVal(order.finalWeight)}</td>
                </tr>
              ))}
              {(metadata.hallmarkQty > 0 || metadata.hallMark > 0) && (
                <tr className="hallmark-row">
                    <td colSpan={7}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(hallmarkQty X hallmark = total hallMark)</span>
                            <span>{metadata.hallmarkQty} X {metadata.hallMark} =</span>
                        </div>
                    </td>
                    <td>{formatVal(Number(metadata.hallmarkQty) * Number(metadata.hallMark))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (module === "Return" || module.startsWith("Repair")) {
      const isRepair = module.startsWith("Repair");
      return (
        <div className="inline-detail-container">
          <table className={`inline-detail-table ${isRepair ? 'repair-details' : 'return-details'}`}>
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Item Name</th>
                <th>Count</th>
                <th>ItemWt</th>
                <th>Stone Wt</th>
                <th>Net Wt</th>
                <th>Touch%</th>
                <th>FWT</th>
                <th>Hall Mark</th>
                {isRepair && <th>Status</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{isRepair ? "Repair" : "Return"}</td>
                <td>{metadata.productName || metadata.itemName}</td>
                <td>{metadata.count}</td>
                <td>{formatVal(metadata.weight || metadata.grossWeight)}</td>
                <td>{formatVal(metadata.stoneWeight)}</td>
                <td>{formatVal(metadata.awt || metadata.netWeight)}</td>
                <td>{formatVal(metadata.percentage)}</td>
                <td>{formatVal(metadata.pureGoldReduction || metadata.fwt)}</td>
                <td>{formatVal(metadata.hallmarkReduction)}</td>
                {isRepair && <td>{metadata.status || "-"}</td>}
              </tr>
            </tbody>
          </table>
          {metadata.reason && <div className="detail-reason">Reason: {metadata.reason}</div>}
        </div>
      );
    }

    if (module === "Bill Receipt" || module === "Receipt Voucher" || module === "Transaction") {
      const type = (metadata.type || "").toLowerCase();
      const isCash = type.includes("cash");
      return (
        <div className="inline-detail-container">
          <table className="inline-detail-table voucher-details">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Type</th>
                {isCash ? (
                  <>
                    <th>Amount</th>
                    <th>Gold Rate</th>
                    <th>Touch</th>
                    <th>Purity</th>
                    <th>Pure Gold</th>
                  </>
                ) : (
                  <>
                    <th>Gold</th>
                    <th>Touch</th>
                    <th>Purity</th>
                  </>
                )}
                {module !== "Transaction" && <th>Hall Mark</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{module}</td>
                <td>{metadata.type || "-"}</td>
                {isCash ? (
                  <>
                    <td>{(Number(metadata.amount) || 0).toFixed(2)}</td>
                    <td>{(Number(metadata.goldRate) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.touch) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.purity) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.pureGold) || 0).toFixed(3)}</td>
                  </>
                ) : (
                  <>
                    <td>{(Number(metadata.goldWeight || metadata.gold) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.touch) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.purity) || 0).toFixed(3)}</td>
                  </>
                )}
                {module !== "Transaction" && <td>{formatVal(metadata.hallmark)}</td>}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (module === "Gold Given" || module === "Gold Received") {
      return (
        <div className="inline-detail-container">
          <table className="inline-detail-table goldsmith-gold-details">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>JobCard#</th>
                <th>Weight</th>
                <th>Touch</th>
                <th>Purity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{module === "Gold Given" ? "Issue" : "Receipt"}</td>
                <td>#{metadata.jobcardId || "-"}</td>
                <td>{formatVal(metadata.weight)}</td>
                <td>{formatVal(metadata.touch)}</td>
                <td>{formatVal(metadata.purity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (module === "Item Delivery") {
      return (
        <div className="inline-detail-container">
          <table className="inline-detail-table goldsmith-delivery-details">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>JobCard#</th>
                <th>Item Name</th>
                <th>Wt</th>
                <th>Count</th>
                <th>Touch</th>
                <th>Stone Wt</th>
                <th>Net Wt</th>
                <th>Wastage Type</th>
                <th>W.Value</th>
                <th>W.Pure</th>
                <th>Final Purity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Finished</td>
                <td>#{metadata.jobcardId || "-"}</td>
                <td>{metadata.itemName}</td>
                <td>{formatVal(metadata.itemWeight)}</td>
                <td>{metadata.count}</td>
                <td>{formatVal(metadata.touch)}</td>
                <td>{formatVal(metadata.stoneWeight)}</td>
                <td>{formatVal(metadata.netWeight)}</td>
                <td>{metadata.wastageType || "-"}</td>
                <td>{formatVal(metadata.wastageValue)}</td>
                <td>{formatVal(metadata.wastagePure)}</td>
                <td>{formatVal(metadata.finalPurity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (module === "BC Purchase" || module === "Item Purchase") {
      return (
        <div className="inline-detail-container">
          <table className="inline-detail-table purchase-details">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Item Name</th>
                <th>Wt</th>
                <th>Count</th>
                <th>Touch</th>
                <th>Stone Wt</th>
                <th>Net Wt</th>
                <th>Wastage Type</th>
                <th>W.Value</th>
                <th>W.Pure</th>
                <th>Final Purity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{module === "BC Purchase" ? "Bulk Purchase" : "Item Purchase"}</td>
                <td>{metadata.jewelName || metadata.itemName}</td>
                <td>{formatVal(metadata.grossWeight)}</td>
                <td>{metadata.count || "1"}</td>
                <td>{formatVal(metadata.touch)}</td>
                <td>{formatVal(metadata.stoneWeight)}</td>
                <td>{formatVal(metadata.netWeight)}</td>
                <td>{metadata.wastageType || "-"}</td>
                <td>{formatVal(metadata.wastage)}</td>
                <td>{formatVal(metadata.wastagePure)}</td>
                <td>{formatVal(metadata.finalPurity)}</td>
              </tr>
              {metadata.items && metadata.items.length > 0 && (
                <>
                  <tr className="sub-item-header">
                    <td colSpan={11} style={{ fontWeight: 'bold', padding: '8px 12px', background: '#f8f9fa' }}>↳ Item Breakdown</td>
                  </tr>
                  {metadata.items.map((item, i) => (
                    <tr key={i} className="sub-item-row">
                      <td colSpan={2}></td>
                      <td>{formatVal(item.grossWeight)}</td>
                      <td>{item.count || "1"}</td>
                      <td>{formatVal(item.touch)}</td>
                      <td>{formatVal(item.stoneWeight)}</td>
                      <td>{formatVal(item.netWeight)}</td>
                      <td colSpan={4}>{item.itemName}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    return (
        <div className="compact-metadata">
            {Object.entries(metadata).slice(0, 3).map(([key, val]) => {
                if (typeof val === 'object') return null;
                return <span key={key} className="detail-tag">{key}: {String(val)}</span>
            })}
        </div>
    );
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        height="80vh"
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2, color: "#0a4c9a", fontWeight: 'bold' }}>
          Loading statement details...
        </Typography>
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
                  {type.toUpperCase()} STATEMENT REPORT
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box display="flex" gap={2} justifyContent="flex-end" flexWrap="wrap">
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

              <Card className={`summary-card ${type === "goldsmith" ? "hallmark-card" : type === "supplier" ? "supplier-card" : "balance-card"}`}>
                <CardContent>
                  <Box>
                    <Typography className="summary-label">
                     Total Gold Balance
                    </Typography>
                    <Typography className="summary-value">
                      {type === "goldsmith" ? formatVal(currentBalances.gold) : 
                       type === "supplier" ? formatVal((currentBalances.bc || 0) + (currentBalances.item || 0)) : 
                       formatVal(currentBalances.cash)} 
                      {(type === "goldsmith" || type === "supplier") ? "g" : ""}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Control Bar */}
      <Box className="statement-controls">
        {/* <Box display="flex" gap={2} alignItems="center">
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
        </Box> */}
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
              <TableCell width="120px" align="center">Date</TableCell>
              <TableCell width="140px" align="center">Type</TableCell>
              <TableCell align="center">Description</TableCell>
              
              {type === "customer" && (
                <>
                  <TableCell align="center" className="col-group-start">Before Bal</TableCell>
                  <TableCell align="center" className="col-pos">+</TableCell>
                  <TableCell align="center" className="col-neg">-</TableCell>
                  <TableCell align="center" className="col-total">Balance</TableCell>
                  <TableCell align="center" className="col-group-start">Before HM</TableCell>
                  <TableCell align="center" className="col-pos">+</TableCell>
                  <TableCell align="center" className="col-neg">-</TableCell>
                  <TableCell align="center" className="col-total">HM Balance</TableCell>
                </>
              )}
              
              {type === "goldsmith" && (
                <>
                  <TableCell align="center" className="col-group-start">Before Gold</TableCell>
                  <TableCell align="center" className="col-pos">+</TableCell>
                  <TableCell align="center" className="col-neg">-</TableCell>
                  <TableCell align="center" className="col-total">After Gold</TableCell>
                </>
              )}
              
              {type === "supplier" && (
                <>
                  <TableCell align="center" className="col-group-start">Before BC</TableCell>
                  <TableCell align="center" className="col-pos">+</TableCell>
                  <TableCell align="center" className="col-neg">-</TableCell>
                  <TableCell align="center" className="col-total">BC Bal</TableCell>
                  <TableCell align="center" className="col-group-start">Before Item</TableCell>
                  <TableCell align="center" className="col-pos">+</TableCell>
                  <TableCell align="center" className="col-neg">-</TableCell>
                  <TableCell align="center" className="col-total">Item Bal</TableCell>
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
                  <span className={`tag-module ${row.module.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '-')}`}>
                    {row.module}
                  </span>
                </TableCell>
                <TableCell className="cell-desc">
                  <div className="desc-main-text">
                    {row.isManualAdjustment ? <span className="adj-indicator">↳ Audit: </span> : ""}
                    {row.description}
                  </div>
                  <StatementInlineDetails row={row} />
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
                  {!row.module.includes("Balance") && row.module !== "Audit Correction" && (
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
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="xs"
        fullWidth 
        className="detail-dialog"
        PaperProps={{
          sx: {
            width: 400,
            borderRadius: "12px",
            overflow: "hidden"
          }
        }}
      >
        <DialogTitle className="dialog-title-themed" sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {selectedDetail?.module} Detail View
          <IconButton
            aria-label="close"
            onClick={() => setDetailDialogOpen(false)}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
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
                <span className="detail-val">{new Date(selectedDetail.date).toLocaleDateString("en-GB")}</span>
              </div>
              
              {selectedDetail.metadata ? (
                <div className="metadata-section">
                  {renderDetailFields(selectedDetail.metadata)}
                </div>
              ) : (
                <div className="detail-item full-desc">
                  <span className="detail-label">Description:</span>
                  <p className="detail-desc-text">{selectedDetail.description}</p>
                </div>
              )}
              
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
                {type === "goldsmith" && (
                  <Box display="flex" justifyContent="center" mt={1}>
                    <Box textAlign="center">
                      <Typography variant="caption">Gold Balance Impact</Typography>
                      <Typography className={`impact-val ${((selectedDetail.debitGold || 0) - (selectedDetail.creditGold || 0)) >= 0 ? "pos" : "neg"}`}>
                        {formatVal((selectedDetail.debitGold || 0) - (selectedDetail.creditGold || 0))}g
                      </Typography>
                    </Box>
                  </Box>
                )}
                {type === "supplier" && (
                  <Box display="flex" justifyContent="space-between" mt={1} gap={2}>
                    <Box textAlign="center">
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>BC Bal</Typography>
                      <Typography className={`impact-val ${((selectedDetail.debitBC || 0) - (selectedDetail.creditBC || 0)) >= 0 ? "pos" : "neg"}`} sx={{ fontSize: '0.9rem' }}>
                        {formatVal((selectedDetail.debitBC || 0) - (selectedDetail.creditBC || 0))}g
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Item Bal</Typography>
                      <Typography className={`impact-val ${((selectedDetail.debitItem || 0) - (selectedDetail.creditItem || 0)) >= 0 ? "pos" : "neg"}`} sx={{ fontSize: '0.9rem' }}>
                        {formatVal((selectedDetail.debitItem || 0) - (selectedDetail.creditItem || 0))}g
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>Cash</Typography>
                      <Typography className={`impact-val ${((selectedDetail.debitCash || 0) - (selectedDetail.creditCash || 0)) >= 0 ? "pos" : "neg"}`} sx={{ fontSize: '0.9rem' }}>
                        ₹{Number((selectedDetail.debitCash || 0) - (selectedDetail.creditCash || 0)).toLocaleString()}
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
        reportType={type}
      />
    </div>
  );
};

export default BalanceStatement;
