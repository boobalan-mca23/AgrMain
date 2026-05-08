import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Tooltip
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ReturnDetailsModal from "./ReturnDetailsModal";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { toast, ToastContainer } from "react-toastify";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import "react-toastify/dist/ReactToastify.css";
import "./Customer.css";

const ReturnStockList = () => {
  const [returns, setReturns] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(() => dayjs().subtract(15, "day"));
  const [toDate, setToDate] = useState(() => dayjs());
  const [stockFilter, setStockFilter] = useState("ALL"); // ALL, PRODUCT, ITEM_PURCHASE
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (fromDate && toDate && toDate.isBefore(fromDate, "day")) {
      toast.error("To Date cannot be before From Date");
    }
    fetchReturnedStock();
  }, [fromDate, toDate]);

  const fetchReturnedStock = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/returns/return-stock`);
      const fetchedReturns = res.data.data || [];
      setReturns(fetchedReturns);

      if (isFirstLoad.current && fetchedReturns.length > 0) {
          // Sort ascending for calculation
          const sorted = [...fetchedReturns].sort((a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix());
          const lastPage = Math.floor((sorted.length - 1) / rowsPerPage);
          if (lastPage >= 0) {
              setPage(lastPage);
              isFirstLoad.current = false;
          }
      }
    } catch {
      toast.error("Failed to load returned products");
    }
  };


  const filteredReturns = returns
    .filter((r) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        !search ||
        (r.productName && r.productName.toLowerCase().includes(searchValue)) ||
        (r.bill?.id && r.bill.id.toString().includes(searchValue)) ||
        (r.bill?.customers?.name && r.bill.customers.name.toLowerCase().includes(searchValue));

      const itemDate = r.createdAt ? dayjs(r.createdAt) : null;
      const from = fromDate ? fromDate.startOf("day") : null;
      const to = toDate ? toDate.endOf("day") : null;
      const matchesFrom = !from || (itemDate && (itemDate.isAfter(from) || itemDate.isSame(from, "day")));
      const matchesTo = !to || (itemDate && (itemDate.isBefore(to) || itemDate.isSame(to, "day")));

      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "PRODUCT" && r.productStockId) ||
        (stockFilter === "ITEM_PURCHASE" && r.itemPurchaseId);

      return matchesSearch && matchesFrom && matchesTo && matchesStock;
    })
    .sort((a, b) => {
        // ALWAYS Oldest First (Ascending)
        const dateA = dayjs(a.createdAt).unix();
        const dateB = dayjs(b.createdAt).unix();
        if (dateA - dateB !== 0) return dateA - dateB;
        return (a.id || 0) - (b.id || 0);
    });

  const paginatedData = filteredReturns.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "-");
  const fmtNum = (v, d = 3) => (v != null && !isNaN(v) ? Number(v).toFixed(d) : "-");

  const handlePrint = () => {
    const fmtPrintDate = (d) => {
      if (!d) return "—";
      return d.format("DD/MM/YYYY");
    };

    const dateRangeText =
      fromDate || toDate
        ? `Date Range: ${fmtPrintDate(fromDate)} to ${fmtPrintDate(toDate)}`
        : "";

    const tableRows = filteredReturns
      .map(
        (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${fmtDate(item.createdAt)}</td>
        <td>${item.bill?.id || "-"}</td>
        <td>${item.productName || "-"}</td>
        <td>${item.bill?.customers?.name || "-"}</td>
        <td>${item.count || "-"}</td>
        <td>${fmtNum(item.weight)}</td>
        <td>${fmtNum(item.stoneWeight || item.product?.stoneWeight || item.itemPurchase?.stoneWeight)}</td>
        <td>${fmtNum(item.awt)}</td>
        <td>${fmtNum(item.percentage || item.touch || item.product?.touch || item.itemPurchase?.touch)}</td>
        <td>${item.product?.wastageType || item.itemPurchase?.wastageType || "-"}</td>
        <td>${fmtNum(item.product?.wastageValue || item.itemPurchase?.wastageValue)}</td>
        <td>${fmtNum(item.product?.wastagePure || item.itemPurchase?.wastagePure)}</td>
        <td>${fmtNum(item.fwt)}</td>
        <td class="reason-column">${item.reason || "-"}</td>
      </tr>`
      )
      .join("");

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Returned Products</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 13px; margin: 0; }
            h2 { text-align: center; margin-bottom: 4px; }
            .date-range { text-align: center; font-weight: bold; margin-bottom: 12px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #aaa; padding: 6px 4px; text-align: left; font-size: 11px; vertical-align: top; word-wrap: break-word; }
            .reason-column { width: 150px; }
            th { background: #2c3e50; color: #fff; font-weight: bold; }
            tr:nth-child(even) td { background: #f9f9f9; }
            @media print {
              th { background-color: #2c3e50 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; color: #fff !important; }
            }
          </style>
        </head>
        <body>
          <h2>Customer Returned Products</h2>
          ${dateRangeText ? `<p class="date-range">${dateRangeText}</p>` : ""}
          <table>
            <thead>
              <tr>
                <th style="width: 35px;">S.No</th>
                <th style="width: 70px;">Date</th>
                <th style="width: 50px;">Bill No</th>
                <th style="width: 130px;">Product</th>
                <th style="width: 130px;">Customer</th>
                <th style="width: 40px;">Count</th>
                <th style="width: 50px;">Gr.Wt</th>
                <th style="width: 50px;">St.Wt</th>
                <th style="width: 50px;">Net.Wt</th>
                <th style="width: 45px;">Touch</th>
                <th style="width: 50px;">Wast.T</th>
                <th style="width: 45px;">Wast.V</th>
                <th style="width: 45px;">Wast.P</th>
                <th style="width: 50px;">Fin.Pur</th>
                <th class="reason-column">Reason</th>
              </tr>
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
      <ToastContainer position="top-right" autoClose={3000} />
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Customer Returned Products</Typography>
        {/* <Box display="flex" gap={1}>
          <Button
            variant={stockFilter === "ALL" ? "contained" : "outlined"}
            onClick={() => { setStockFilter("ALL"); setPage(0); }}
            size="small"
            sx={{ borderRadius: "20px", textTransform: "none", fontWeight: stockFilter === "ALL" ? 700 : 400 }}
          >
            All Products
          </Button>
          <Button
            variant={stockFilter === "PRODUCT" ? "contained" : "outlined"}
            onClick={() => { setStockFilter("PRODUCT"); setPage(0); }}
            size="small"
            sx={{ borderRadius: "20px", textTransform: "none", fontWeight: stockFilter === "PRODUCT" ? 700 : 400 }}
          >
            Product Stock Products
          </Button>
          <Button
            variant={stockFilter === "ITEM_PURCHASE" ? "contained" : "outlined"}
            onClick={() => { setStockFilter("ITEM_PURCHASE"); setPage(0); }}
            size="small"
            sx={{ borderRadius: "20px", textTransform: "none", fontWeight: stockFilter === "ITEM_PURCHASE" ? 700 : 400 }}
          >
            Item Purchase Products
          </Button>
        </Box> */}
      </Box>

      {/* Filters + Print */}
      <Box mb={2} display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          label="Search (Bill / Product / Customer)"
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
            setStockFilter("ALL");
            isFirstLoad.current = true;
            // useEffect on fromDate/toDate will trigger fetchReturnedStock
          }}
        >
          Reset
        </Button>
        <Button variant="outlined" onClick={handlePrint}>
          Print
        </Button>
      </Box>

      {/* Table */}
      <Table className="BillTable">
        <TableHead>
          <TableRow>
            <TableCell className="BillTable-th-td">S.No</TableCell>
            <TableCell className="BillTable-th-td">Date</TableCell>
            <TableCell className="BillTable-th-td">Bill No</TableCell>
            <TableCell className="BillTable-th-td">Product Name</TableCell>
            <TableCell className="BillTable-th-td">Customer</TableCell>
            <TableCell className="BillTable-th-td">Count</TableCell>
            <TableCell className="BillTable-th-td">Gr.Wt</TableCell>
            <TableCell className="BillTable-th-td">Stone Wt</TableCell>
            <TableCell className="BillTable-th-td">Net Wt</TableCell>
            <TableCell className="BillTable-th-td">Touch</TableCell>
            <TableCell className="BillTable-th-td">Wastage T</TableCell>
            <TableCell className="BillTable-th-td">Wastage V</TableCell>
            <TableCell className="BillTable-th-td">Wastage P</TableCell>
            <TableCell className="BillTable-th-td">Fin.Pur</TableCell>
            <TableCell className="BillTable-th-td BillTable-reason">Reason</TableCell>
            <TableCell className="BillTable-th-td">Action</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="BillTable-tb-td">{page * rowsPerPage + index + 1}</TableCell>
                <TableCell className="BillTable-tb-td">{dayjs(item.createdAt).format("DD/MM/YYYY")}</TableCell>
                <TableCell className="BillTable-tb-td">{item.bill?.id || "-"}</TableCell>
                <TableCell className="BillTable-tb-td">{item.productName}</TableCell>
                <TableCell className="BillTable-tb-td">{item.bill?.customers?.name || "-"}</TableCell>
                <TableCell className="BillTable-tb-td">{item.count || "-"}</TableCell>
                <TableCell className="BillTable-tb-td">{fmtNum(item.weight)}</TableCell>
                <TableCell className="BillTable-tb-td">{fmtNum(item.stoneWeight || item.product?.stoneWeight || item.itemPurchase?.stoneWeight)}</TableCell>
                <TableCell className="BillTable-tb-td">{fmtNum(item.awt)}</TableCell>
                <TableCell className="BillTable-tb-td">{fmtNum(item.percentage || item.touch || item.product?.touch || item.itemPurchase?.touch)}</TableCell>
                <TableCell className="BillTable-tb-td">{item.product?.wastageType || item.itemPurchase?.wastageType || "-"}</TableCell>
                <TableCell className="BillTable-tb-td">{fmtNum(item.product?.wastageValue || item.itemPurchase?.wastageValue)}</TableCell>
                <TableCell className="BillTable-tb-td">{fmtNum(item.product?.wastagePure || item.itemPurchase?.wastagePure)}</TableCell>
                <TableCell className="BillTable-tb-td">{fmtNum(item.fwt)}</TableCell>
                <TableCell className="BillTable-tb-td BillTable-reason">{item.reason || "-"}</TableCell>
                <TableCell className="BillTable-tb-td">
                  <Tooltip title="View Full Details">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => {
                        setSelectedReturn(item);
                        setOpenDetailModal(true);
                      }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={16} align="center">No returned products</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={filteredReturns.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(e, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      <ReturnDetailsModal 
        open={openDetailModal} 
        onClose={() => setOpenDetailModal(false)} 
        selectedReturn={selectedReturn} 
      />
    </Box>
  );
};

export default ReturnStockList;
