import React, { useEffect, useState } from "react";
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
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from "@mui/material";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import "./Customer.css";

const CustomerRepairStockList = () => {
    const [repairs, setRepairs] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState(() => dayjs().subtract(15, "day"));
    const [toDate, setToDate] = useState(() => dayjs());
    const [stockFilter, setStockFilter] = useState("ALL"); // ALL, PRODUCT, ITEM_PURCHASE
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, InRepair, Returned

    useEffect(() => {
        fetchRepairStock();
    }, []);

    const fetchRepairStock = async () => {
        try {
            const res = await axios.get(`${BACKEND_SERVER_URL}/api/repair`, {
                params: { source: "CUSTOMER" },
            });
            setRepairs(res.data.repairs || []);
        } catch {
            toast.error("Failed to load customer repair stock");
        }
    };


    const filteredRepairs = repairs
        .filter((r) => {
            const searchVal = search.toLowerCase();
            const matchesSearch =
                !search ||
                (r.itemName && r.itemName.toLowerCase().includes(searchVal)) ||
                (r.product?.itemName && r.product.itemName.toLowerCase().includes(searchVal)) ||
                (r.bill?.id && r.bill.id.toString().includes(searchVal)) ||
                (r.bill?.customers?.name && r.bill.customers.name.toLowerCase().includes(searchVal));

            const sentDate = r.sentDate ? dayjs(r.sentDate) : null;
            const from = fromDate ? fromDate.startOf("day") : null;
            const to = toDate ? toDate.endOf("day") : null;
            const matchesFrom = !from || (sentDate && (sentDate.isAfter(from) || sentDate.isSame(from, "day")));
            const matchesTo = !to || (sentDate && (sentDate.isBefore(to) || sentDate.isSame(to, "day")));

            const matchesStock =
                stockFilter === "ALL" ||
                (stockFilter === "PRODUCT" && r.productId) ||
                (stockFilter === "ITEM_PURCHASE" && r.itemPurchaseId);

            const matchesStatus =
                statusFilter === "ALL" ||
                (statusFilter === "InRepair" && r.status === "InRepair") ||
                (statusFilter === "Returned" && r.status === "Returned");

            return matchesSearch && matchesFrom && matchesTo && matchesStock && matchesStatus;
        })
        .sort((a, b) =>
            fromDate || toDate
                ? dayjs(a.sentDate).unix() - dayjs(b.sentDate).unix()
                : dayjs(b.sentDate).unix() - dayjs(a.sentDate).unix()
        );

    const paginatedData = filteredRepairs.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "-");
    const fmtNum = (v, d = 3) =>
        v !== null && v !== undefined && !isNaN(parseFloat(v))
            ? parseFloat(v).toFixed(d)
            : "-";

    const statusChip = (status) => {
        if (status === "InRepair")
            return <Chip label="In Repair" size="small" sx={{ backgroundColor: "#fff3e0", color: "#e65100", fontWeight: 600, fontSize: 11 }} />;
        if (status === "Returned")
            return <Chip label="Returned" size="small" sx={{ backgroundColor: "#e8f5e9", color: "#2e7d32", fontWeight: 600, fontSize: 11 }} />;
        return <Chip label={status || "-"} size="small" />;
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

        const tableRows = filteredRepairs
            .map(
                (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${fmtDate(item.sentDate)}</td>
        <td>${item.itemName || item.product?.itemName || "-"}</td>
        <td>${item.bill?.id || "-"}</td>
        <td>${item.bill?.customers?.name || "-"}</td>
        <td>${fmtNum(item.grossWeight)}</td>
        <td>${fmtNum(item.netWeight)}</td>
        <td>${fmtNum(item.purity)}</td>
        <td>${item.status || "-"}</td>
        <td>${item.reason || "-"}</td>
        <td>${item.goldsmith?.name || "-"}</td>
      </tr>`
            )
            .join("");

        const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Repair Stock</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; margin: 20px; }
            h2 { text-align: center; margin-bottom: 4px; }
            .date-range { text-align: center; font-weight: bold; margin-bottom: 12px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #aaa; padding: 6px 9px; text-align: left; font-size: 12px; white-space: nowrap; }
            th { background: #2c3e50; color: #fff; }
            tr:nth-child(even) td { background: #f9f9f9; }
          </style>
        </head>
        <body>
          <h2>Customer Repair Stock</h2>
          ${dateRangeText ? `<p class="date-range">${dateRangeText}</p>` : ""}
          <table>
            <thead>
              <tr>
                <th>S.No</th><th>Sent Date</th><th>Item Name</th>
                <th>Bill No</th><th>Customer</th>
                <th>Wt</th><th>Net Wt</th><th>Purity</th>
                <th>Status</th><th>Reason</th><th>Goldsmith</th>
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
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">Customer Repair Stock</Typography>
                <Box display="flex" gap={1}>
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
                </Box>
            </Box>

            {/* Filters + Print */}
            <Box mb={2} display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <TextField
                    size="small"
                    label="Search (Item / Bill / Customer)"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
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
                            setPage(0);
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
                            setPage(0);
                        }}
                        slotProps={{ textField: { size: "small", sx: { width: 260 } } }}
                    />
                </LocalizationProvider>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                    >
                        <MenuItem value="ALL">All Status</MenuItem>
                        <MenuItem value="InRepair">In Repair</MenuItem>
                        <MenuItem value="Returned">Returned</MenuItem>
                    </Select>
                </FormControl>
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
                        setStatusFilter("ALL");
                        setPage(0);
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
                        <TableCell className="BillTable-th-td">Sent Date</TableCell>
                        <TableCell className="BillTable-th-td">Item Name</TableCell>
                        <TableCell className="BillTable-th-td">Bill No</TableCell>
                        <TableCell className="BillTable-th-td">Customer</TableCell>
                        <TableCell className="BillTable-th-td">Wt</TableCell>
                        <TableCell className="BillTable-th-td">Net Wt</TableCell>
                        <TableCell className="BillTable-th-td">Purity</TableCell>
                        <TableCell className="BillTable-th-td">Status</TableCell>
                        <TableCell className="BillTable-th-td">Reason</TableCell>
                        <TableCell className="BillTable-th-td">Goldsmith</TableCell>

                    </TableRow>
                </TableHead>
                <TableBody>
                    {paginatedData.length > 0 ? (
                        paginatedData.map((item, index) => (
                            <TableRow key={item.id}>
                                <TableCell className="BillTable-tb-td">{page * rowsPerPage + index + 1}</TableCell>
                                <TableCell className="BillTable-tb-td">{dayjs(item.sentDate).format("DD/MM/YYYY")}</TableCell>
                                <TableCell className="BillTable-tb-td">{item.itemName || item.product?.itemName || "-"}</TableCell>
                                <TableCell className="BillTable-tb-td">{item.bill?.id || "-"}</TableCell>
                                <TableCell className="BillTable-tb-td">{item.bill?.customers?.name || "-"}</TableCell>
                                <TableCell className="BillTable-tb-td">{fmtNum(item.grossWeight)}</TableCell>
                                <TableCell className="BillTable-tb-td">{fmtNum(item.netWeight)}</TableCell>
                                <TableCell className="BillTable-tb-td">{fmtNum(item.purity)}</TableCell>
                                <TableCell className="BillTable-tb-td">{statusChip(item.status)}</TableCell>
                                <TableCell className="BillTable-tb-td">{item.reason || "-"}</TableCell>
                                <TableCell className="BillTable-tb-td">{item.goldsmith?.name || "-"}</TableCell>

                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={11} align="center">No customer repair records found</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <TablePagination
                component="div"
                count={filteredRepairs.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(e, p) => setPage(p)}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            />
        <ToastContainer position="top-right" autoClose={3000} />
        </Box>
    );
};

export default CustomerRepairStockList;
