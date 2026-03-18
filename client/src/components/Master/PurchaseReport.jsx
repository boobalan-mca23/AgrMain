import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { TablePagination, TextField, Autocomplete, Button } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./PurchaseReport.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function BCPurchaseReport() {

  const [suppliers, setSuppliers] = useState([]);

  const today = new Date();
  const [from, setFrom] = useState(dayjs().subtract(15, 'day'));
  const [to, setTo] = useState(dayjs());
  const [supplierId, setSupplierId] = useState("all");

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // ===============================
  // FETCH SUPPLIERS
  // ===============================

  useEffect(() => {

    axios.get(`${BACKEND_SERVER_URL}/api/supplier`)
      .then(res => setSuppliers(res.data))
      .catch(console.error);

  }, []);

  // ===============================
  // FETCH REPORT
  // ===============================

  const fetchReport = useCallback(async () => {

    const q = [];

    if (from) q.push(`from=${from.format("YYYY-MM-DD")}`);
    if (to) q.push(`to=${to.format("YYYY-MM-DD")}`);

    if (supplierId !== "all")
      q.push(`supplierId=${supplierId}`);

    const url =
      `${BACKEND_SERVER_URL}/api/purchase-report/entries-report`
      + (q.length ? "?" + q.join("&") : "");

    try {

      const res = await axios.get(url);

      setRows(res.data);
      setPage(0);

    } catch (err) {

      console.error(err);

    }

  }, [from, to, supplierId]);

  useEffect(() => {
    if (from && to && to.isBefore(from, 'day')) {
      toast.error("To Date cannot be before From Date");
      setRows([]);
      return;
    }
    fetchReport();

  }, [fetchReport]);

  // ===============================
  // FORMATTER
  // ===============================

  const format3 = (v) =>
    v ? Number(v).toFixed(3) : "0.000";

  // ===============================
  // TOTAL CALCULATIONS
  // ===============================

  const totals = useMemo(() => {

    let totalNet = 0;
    let totalWastagePure = 0;
    let totalFinalPurity = 0;
    let totalAdvanceGold = 0;

    rows.forEach(r => {

      totalNet += Number(r.netWeight || 0);
      totalWastagePure += Number(r.wastagePure || 0);
      totalFinalPurity += Number(r.finalPurity || 0);
      totalAdvanceGold += Number(r.advanceGold || 0);

    });

    return {

      totalNet,
      totalWastagePure,
      totalFinalPurity,
      totalAdvanceGold

    };

  }, [rows]);

  // ===============================
  // TOTAL SUPPLIERS COUNT
  // ===============================

  const totalSuppliers = useMemo(() => {

    const unique = new Set();

    rows.forEach(r => {

      if (r.supplier?.name)
        unique.add(r.supplier.name);

    });

    return unique.size;

  }, [rows]);

  // ===============================
  // PRINT
  // ===============================

  const handlePrint = () => {

    const content =
      document.getElementById("print-area").innerHTML;

    const win = window.open("", "", "width=1200,height=800");

    win.document.write(`
      <html>
      <head>
      <title>BC Purchase Report</title>

      <style>

      body { font-family: Arial; padding:20px }

      table {
        width:100%;
        border-collapse:collapse;
      }

      th,td {
        border:1px solid black;
        padding:6px;
        text-align:center;
      }

      th {
        background:#eee;
      }

      </style>

      </head>

      <body>

      <h2>BC Purchase Report</h2>

      ${content}

      </body>

      </html>
    `);

    win.document.close();
    win.print();

  };

  const handleClear = () => {
    setFrom(null);
    setTo(null);
    setSupplierId("all");
    setRows([]);
  };

  // ===============================
  // PAGINATION HANDLERS
  // ===============================

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedRows = useMemo(() => {
    return rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [rows, page, rowsPerPage]);

  // ===============================
  // UI
  // ===============================

  return (

    <div className="purchase-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <h2>BC Purchase Report</h2>

      {/* FILTER */}

      <div className="filter-section" style={{ alignItems: "center" }}>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="From Date"
            value={from}
            format="DD/MM/YYYY"
            slotProps={{ textField: { size: 'small' } }}
            sx={{ width: "220px" }}
            onChange={(newValue) => setFrom(newValue)}
          />
        </LocalizationProvider>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="To Date"
            value={to}
            format="DD/MM/YYYY"
            minDate={from || undefined}
            slotProps={{ textField: { size: 'small' } }}
            sx={{ width: "220px" }}
            onChange={(newValue) => setTo(newValue)}
          />
        </LocalizationProvider>

        <Autocomplete
          size="small"
          options={[{ id: "all", name: "All Suppliers" }, ...suppliers]}
          getOptionLabel={(option) => option.name || ""}
          value={[{ id: "all", name: "All Suppliers" }, ...suppliers].find(s => s.id === (supplierId || "all")) || null}
          onChange={(event, newValue) => {
            setSupplierId(newValue ? newValue.id : "all");
          }}
          renderInput={(params) => (
            <TextField {...params} label="Select Supplier" variant="outlined" />
          )}
          sx={{ width: 220 }}
        />

        <Button
          variant="contained"
          size="small"
          sx={{ height: "40px", width: "100px" }}
          onClick={handlePrint}
        >
          Print
        </Button>

        <Button
          variant="outlined"
          size="small"
          sx={{
            height: "40px"
          }}
          onClick={handleClear}
        >
          Clear
        </Button>

      </div>

      {/* PRINT AREA */}

      <div id="print-area">

        {/* TOTAL SUPPLIERS */}

        <div
          style={{
            textAlign: "right",
            fontWeight: "bold",
            marginBottom: "10px"
          }}
        >

          Total Suppliers: {totalSuppliers}

        </div>

        {/* TABLE */}

        <table className="purchase-table">

          <thead>

            <tr>

              <th>S.No</th>
              <th>Supplier</th>
              <th>Jewel</th>
              <th>Gross wt (g)</th>
              <th>Stone wt (g)</th>
              <th>Net wt (g)</th>
              <th>Touch</th>
              <th>Wastage Value</th>
              <th>Wastage Pure (g)</th>
              <th>Final Purity (g)</th>
              <th>Advance Gold (g)</th>

            </tr>

          </thead>

          <tbody>

            {rows.length === 0 && (

              <tr>
                <td colSpan="11">
                  No Data Found
                </td>
              </tr>

            )}

            {paginatedRows.map((r, i) => (

              <tr key={r.id}>

                <td>{page * rowsPerPage + i + 1}</td>

                <td>{r.supplier?.name}</td>

                <td>{r.jewelName}</td>

                <td>{format3(r.grossWeight)}</td>

                <td>{format3(r.stoneWeight)}</td>

                <td>{format3(r.netWeight)}</td>

                <td>{r.touch}</td>

                <td>{r.wastage} ({r.wastageType})</td>

                <td>{format3(r.wastagePure)}</td>

                <td>{format3(r.finalPurity)}</td>

                <td>{format3(r.advanceGold)}</td>

              </tr>

            ))}

            {/* TOTAL ROW */}

            {rows.length > 0 && (

              <tr
                style={{
                  fontWeight: "bold",
                  background: "#f5f5f5"
                }}
              >

                <td colSpan="5">
                  TOTAL
                </td>

                <td>
                  {format3(totals.totalNet)}
                </td>

                <td colSpan="2"></td>

                <td>
                  {format3(totals.totalWastagePure)}
                </td>

                <td>
                  {format3(totals.totalFinalPurity)}
                </td>

                <td>
                  {format3(totals.totalAdvanceGold)}
                </td>

              </tr>

            )}

          </tbody>

        </table>

        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />

      </div>

    </div>

  );

}
