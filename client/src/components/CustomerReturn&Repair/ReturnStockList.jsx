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
  Button
} from "@mui/material";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { toast } from "react-toastify";
import "./Customer.css";

const ReturnStockList = () => {
  const [returns, setReturns] = useState([]);
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
    fetchReturnedStock();
  }, []);

  const fetchReturnedStock = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/returns/return-stock`);
      setReturns(res.data.data || []);
    } catch {
      toast.error("Failed to load returned products");
    }
  };

  const parseDDMMYYYY = (dateStr) => {
    if (!dateStr || dateStr.length !== 10) return null;
    const [day, month, year] = dateStr.split("/");
    if (!day || !month || !year) return null;
    return new Date(`${year}-${month}-${day}T00:00:00`);
  };

  const filteredReturns = returns
    .filter((r) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        !search ||
        (r.productName && r.productName.toLowerCase().includes(searchValue)) ||
        (r.bill?.id && r.bill.id.toString().includes(searchValue));

      const itemDate = r.createdAt ? new Date(r.createdAt) : null;
      const from = parseDDMMYYYY(fromDate);
      if (from) from.setHours(0, 0, 0, 0);
      const to = parseDDMMYYYY(toDate);
      if (to) to.setHours(23, 59, 59, 999);
      const matchesFrom = !from || (itemDate && itemDate >= from);
      const matchesTo = !to || (itemDate && itemDate <= to);
      return matchesSearch && matchesFrom && matchesTo;
    })
    .sort((a, b) =>
      fromDate || toDate
        ? new Date(a.createdAt) - new Date(b.createdAt)
        : new Date(b.createdAt) - new Date(a.createdAt)
    );

  const paginatedData = filteredReturns.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "-");

  const handlePrint = () => {
    const dateRangeText =
      fromDate || toDate
        ? `Date Range: ${fromDate || "—"} to ${toDate || "—"}`
        : "";

    const tableRows = filteredReturns
      .map(
        (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${fmtDate(item.createdAt)}</td>
        <td>${item.bill?.id || "-"}</td>
        <td>${item.bill?.customers?.name || "-"}</td>
        <td>${item.productName || "-"}</td>
        <td>${item.weight ?? "-"}</td>
        <td>${item.count ?? "-"}</td>
        <td>${item.reason || "-"}</td>
      </tr>`
      )
      .join("");

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Returned Products</title>
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
          <h2>Customer Returned Products</h2>
          ${dateRangeText ? `<p class="date-range">${dateRangeText}</p>` : ""}
          <table>
            <thead>
              <tr>
                <th>S.No</th><th>Date</th><th>Bill No</th>
                <th>Customer</th><th>Product</th>
                <th>Weight</th><th>Count</th><th>Reason</th>
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
      <Typography variant="h5" mb={2}>Customer Returned Products</Typography>

      {/* Filters + Print */}
      <Box mb={2} display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          label="Search (Bill / Product)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField
          type="text"
          size="small"
          label="From (DD/MM/YYYY)"
          InputLabelProps={{ shrink: true }}
          placeholder="DD/MM/YYYY"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
        <TextField
          type="text"
          size="small"
          label="To (DD/MM/YYYY)"
          InputLabelProps={{ shrink: true }}
          placeholder="DD/MM/YYYY"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
        <Button variant="outlined" onClick={() => { setSearch(""); setFromDate(""); setToDate(""); }}>
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
            <TableCell className="BillTable-th-td">Customer</TableCell>
            <TableCell className="BillTable-th-td">Product</TableCell>
            <TableCell className="BillTable-th-td">Weight</TableCell>
            <TableCell className="BillTable-th-td">Count</TableCell>
            <TableCell className="BillTable-th-td">Reason</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="BillTable-tb-td">{page * rowsPerPage + index + 1}</TableCell>
                <TableCell className="BillTable-tb-td">{fmtDate(item.createdAt)}</TableCell>
                <TableCell className="BillTable-tb-td">{item.bill?.id || "-"}</TableCell>
                <TableCell className="BillTable-tb-td">{item.bill?.customers?.name || "-"}</TableCell>
                <TableCell className="BillTable-tb-td">{item.productName}</TableCell>
                <TableCell className="BillTable-tb-td">{item.weight}</TableCell>
                <TableCell className="BillTable-tb-td">{item.count}</TableCell>
                <TableCell className="BillTable-tb-td">{item.reason || "-"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} align="center">No returned products</TableCell>
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
      />
    </Box>
  );
};

export default ReturnStockList;
