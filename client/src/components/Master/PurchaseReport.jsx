import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./PurchaseReport.css";

export default function PurchaseReport() {
  const [suppliers, setSuppliers] = useState([]);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const last7Days = new Date();
  last7Days.setDate(today.getDate() - 7);
  const last7DaysStr = last7Days.toISOString().slice(0, 10);

  const [from, setFrom] = useState(last7DaysStr);
  const [to, setTo] = useState(todayStr);
  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState([]);

  // Fetch suppliers
  useEffect(() => {
    axios
      .get(`${BACKEND_SERVER_URL}/api/supplier`)
      .then((r) => setSuppliers(r.data))
      .catch((err) => console.error(err));
  }, []);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    const q = [];
    if (from) q.push(`from=${encodeURIComponent(from)}`);
    if (to) q.push(`to=${encodeURIComponent(to)}`);
    if (supplierId) q.push(`supplierId=${supplierId}`);

    const url = `${BACKEND_SERVER_URL}/api/purchase-report/entries-report${
      q.length ? "?" + q.join("&") : ""
    }`;

    try {
      const res = await axios.get(url);
      setRows(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }, [from, to, supplierId]);

  // ✅ AUTO LOAD DATA ON PAGE LOAD
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const format3 = (value) => {
    if (value === null || value === undefined || value === "") return "0.000";
    return Number(value).toFixed(3);
  };

  return (
    <div className="purchase-container">
      <h2>Purchase Report</h2>

      <div className="filter-section no-wrap">
        <div className="filter-group">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div className="filter-group">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="filter-group">
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">All</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <button className="btn-primary" onClick={fetchReport}>Search</button>
        <button className="btn-secondary" onClick={() => window.print()}>Print</button>
      </div>

      <table className="purchase-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Supplier</th>
            <th>Jewel</th>
            <th>Gross Weight (g)</th>
            <th>Stone Weight (g)</th>
            <th>Net Weight (g)</th>
            <th>Touch</th>
            <th>Wastage Type</th>
            <th>Wastage Value</th>
            <th>Wastage Pure (g)</th>
            <th>Final Purity (g)</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="11" style={{ textAlign: "center", padding: "20px" }}>
                No Data Found
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{r.supplier?.name}</td>
                <td>{r.jewelName}</td>
                <td>{format3(r.grossWeight)}</td>
                <td>{format3(r.stoneWeight)}</td>
                <td>{format3(r.netWeight)}</td>
                <td>{format3(r.touch)}</td>
                <td>{r.wastageType}</td>
                <td>{r.wastage}</td>
                <td>{format3(r.wastagePure)}</td>
                <td>{format3(r.finalPurity)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
