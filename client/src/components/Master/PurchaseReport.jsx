import React, { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./PurchaseReport.css";

export default function PurchaseReport() {
  const [suppliers, setSuppliers] = useState([]);
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    axios.get(`${BACKEND_SERVER_URL}/api/supplier`)
      .then((r) => setSuppliers(r.data))
      .catch((err) => console.error(err));
  }, []);

  const fetch = async () => {
    const q = [];
    if (from) q.push(`from=${encodeURIComponent(from)}`);
    if (to) q.push(`to=${encodeURIComponent(to)}`);
    if (supplierId) q.push(`supplierId=${supplierId}`);

    // FIXED URL (backend route is entries-report)
    const url = `${BACKEND_SERVER_URL}/api/purchase-report/entries-report${q.length ? "?" + q.join("&") : ""}`;

    try {
      const res = await axios.get(url);
      console.log("REPORT:", res.data);
      setRows(res.data);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
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

        <button className="btn-primary" onClick={fetch}>Search</button>
        <button className="btn-secondary" onClick={() => window.print()}>Print</button>
      </div>

      <table className="purchase-table">
        <thead>
          <tr>
            <th>#</th><th>Date</th><th>Supplier</th><th>Item</th>
            <th>Gross</th><th>Stone</th><th>Net</th><th>Wastage</th>
            <th>Touch</th><th>Final Purity</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="10" style={{ textAlign: "center", padding: "20px" }}>
                No Data Found
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td>{r.supplier?.name}</td>
                <td>{r.jewelName}</td>
                <td>{r.grossWeight}</td>
                <td>{r.stoneWeight}</td>
                <td>{r.netWeight}</td>
                <td>{r.wastage}</td>
                <td>{r.touch}</td>
                <td>{r.finalPurity}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
