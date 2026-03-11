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
} from "@mui/material";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { toast } from "react-toastify";
import "./Customer.css";

const CustomerRepairStockList = () => {
    const [repairs, setRepairs] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 15);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    });
    const [toDate, setToDate] = useState(() => {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    });

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

    const parseDDMMYYYY = (str) => {
        if (!str || str.length !== 10) return null;
        const [d, m, y] = str.split("/");
        if (!d || !m || !y) return null;
        return new Date(`${y}-${m}-${d}T00:00:00`);
    };

    const filteredRepairs = repairs
        .filter((r) => {
            const searchVal = search.toLowerCase();
            const matchesSearch =
                !search ||
                (r.itemName && r.itemName.toLowerCase().includes(searchVal)) ||
                (r.product?.itemName && r.product.itemName.toLowerCase().includes(searchVal));

            const sentDate = r.sentDate ? new Date(r.sentDate) : null;
            const from = parseDDMMYYYY(fromDate);
            if (from) from.setHours(0, 0, 0, 0);
            const to = parseDDMMYYYY(toDate);
            if (to) to.setHours(23, 59, 59, 999);
            const matchesFrom = !from || (sentDate && sentDate >= from);
            const matchesTo = !to || (sentDate && sentDate <= to);
            return matchesSearch && matchesFrom && matchesTo;
        })
        .sort((a, b) =>
            fromDate || toDate
                ? new Date(a.sentDate) - new Date(b.sentDate)
                : new Date(b.sentDate) - new Date(a.sentDate)
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
        const dateRangeText =
            fromDate || toDate
                ? `Date Range: ${fromDate || "—"} to ${toDate || "—"}`
                : "";

        const tableRows = filteredRepairs
            .map(
                (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${fmtDate(item.sentDate)}</td>
        <td>${item.itemName || item.product?.itemName || "-"}</td>
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
            <Typography variant="h5" mb={2}>Customer Repair Stock</Typography>

            {/* Filters + Print */}
            <Box mb={2} display="flex" gap={2} flexWrap="wrap" alignItems="center">
                <TextField
                    size="small"
                    label="Search (Item Name)"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                />
                <TextField
                    type="text"
                    size="small"
                    label="From (DD/MM/YYYY)"
                    InputLabelProps={{ shrink: true }}
                    placeholder="DD/MM/YYYY"
                    value={fromDate}
                    onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
                />
                <TextField
                    type="text"
                    size="small"
                    label="To (DD/MM/YYYY)"
                    InputLabelProps={{ shrink: true }}
                    placeholder="DD/MM/YYYY"
                    value={toDate}
                    onChange={(e) => { setToDate(e.target.value); setPage(0); }}
                />
                <Button variant="outlined" onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setPage(0); }}>
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
                                <TableCell className="BillTable-tb-td">{fmtDate(item.sentDate)}</TableCell>
                                <TableCell className="BillTable-tb-td">{item.itemName || item.product?.itemName || "-"}</TableCell>
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
                            <TableCell colSpan={9} align="center">No customer repair records found</TableCell>
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
        </Box>
    );
};

export default CustomerRepairStockList;
