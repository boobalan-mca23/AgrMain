import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./PurchaseReport.css";

export default function ItemPurchaseReport() {

  const [suppliers, setSuppliers] = useState([]);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // ✅ Last 15 days default
  const last15 = new Date();
  last15.setDate(today.getDate() - 15);
  const last15Str = last15.toISOString().slice(0, 10);

  const [from, setFrom] = useState(last15Str);
  const [to, setTo] = useState(todayStr);
  const [supplierId, setSupplierId] = useState("all");

  const [rows, setRows] = useState([]);

  // ============================
  // FETCH SUPPLIERS
  // ============================

  useEffect(() => {

    axios.get(`${BACKEND_SERVER_URL}/api/supplier`)
      .then(res => setSuppliers(res.data))
      .catch(console.error);

  }, []);

  // ============================
  // FETCH REPORT
  // ============================

  const fetchReport = useCallback(async () => {

    const q = [];

    if (from) q.push(`from=${from}`);
    if (to) q.push(`to=${to}`);

    if (supplierId !== "all")
      q.push(`supplierId=${supplierId}`);

    const url =
      `${BACKEND_SERVER_URL}/api/item-purchase/report`
      + (q.length ? "?" + q.join("&") : "");

    try {

      const res = await axios.get(url);

      setRows(res.data);

    } catch (err) {

      console.error(err);

    }

  }, [from, to, supplierId]);

  useEffect(() => {

    fetchReport();

  }, [fetchReport]);

  // ============================
  // FORMATTER
  // ============================

  const format3 = (v) =>
    v ? Number(v).toFixed(3) : "0.000";

  // ============================
  // TOTALS
  // ============================

  const totals = useMemo(() => {

    let totalNet = 0;
    let totalWastagePure = 0;
    let totalFinalPurity = 0;

    rows.forEach(r => {

      totalNet += Number(r.netWeight || 0);
      totalWastagePure += Number(r.wastagePure || 0);
      totalFinalPurity += Number(r.finalPurity || 0);

    });

    return {
      totalNet,
      totalWastagePure,
      totalFinalPurity
    };

  }, [rows]);

  // ============================
  // TOTAL SUPPLIERS
  // ============================

  const totalSuppliers = useMemo(() => {

    const unique = new Set();

    rows.forEach(r => {

      if (r.supplier?.name)
        unique.add(r.supplier.name);

    });

    return unique.size;

  }, [rows]);

  // ============================
  // PRINT
  // ============================

  const handlePrint = () => {

    const content =
      document.getElementById("print-area").innerHTML;

    const win = window.open("", "", "width=1200,height=800");

    win.document.write(`
      <html>
      <head>
      <title>Item Purchase Report</title>

      <style>

      body {
        font-family: Arial;
        padding:20px;
      }

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

      <h2>Item Purchase Report</h2>

      ${content}

      </body>

      </html>
    `);

    win.document.close();
    win.print();

  };

  // ============================
  // UI
  // ============================

  return (

    <div className="purchase-container">

      <h2>Item Purchase Report</h2>

      {/* FILTER */}

      <div className="filter-section">

        From:
        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
        />

        To:
        <input
          type="date"
          value={to}
          onChange={e => setTo(e.target.value)}
        />
        <div className="filter-group">
          <select
            value={supplierId}
            onChange={e => setSupplierId(e.target.value)}
          >

            <option value="all">
              All Suppliers
            </option>

            {suppliers.map(s => (

              <option key={s.id} value={s.id}>
                {s.name}
              </option>

            ))}

          </select>
        </div>

        <button className="btn-primary" onClick={fetchReport}>
          Search
        </button>

        <button className="btn-primary" onClick={handlePrint}>
          Print
        </button>

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

              <th>#</th>
              <th>Supplier</th>
              <th>Item</th>
              <th>Gross wt. (g)</th>
              <th>Stone wt. (g)</th>
              <th>Net wt. (g)</th>
              <th>Touch</th>
              <th>Wastage Value</th>
              <th>Wastage Pure (g)</th>
              <th>Final Purity (g)</th>

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

            {rows.map((r, i) => (

              <tr key={r.id}>

                <td>{i + 1}</td>

                <td>{r.supplier?.name}</td>

                <td>{r.itemName}</td>

                <td>{format3(r.grossWeight)}</td>

                <td>{format3(r.stoneWeight)}</td>

                <td>{format3(r.netWeight)}</td>

                <td>{r.touch}</td>

                <td>{r.wastage} ({r.wastageType})</td>

                <td>{format3(r.wastagePure)}</td>

                <td>{format3(r.finalPurity)}</td>

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

              </tr>

            )}

          </tbody>

        </table>

      </div>

    </div>

  );

}
