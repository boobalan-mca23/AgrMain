import React, { useState } from "react";
import "./Stock.css";

const Stock = () => {

  const stockSummary = [
    { label: "Total Items", value: 10 },
    { label: "Total Weight", value: "125.000g" },
    { label: "Total Wastage (Goldsmith)", value: "5.000g" },
    { label: "Total Purity (Jewel Stock)", value: "110.000g" },
  ];

  const stockData = [
    {
      id: 1,
      source: "Goldsmith",
      type: "Ring",
      weight: 15.5,
      purityValue: null,
      wastage: 0.5,
      status: "In Stock",
      displayDateIn: "08/08/2025",
    },
  
    {
      id: 2,
      source: "Goldsmith",
      type: "Bracelet",
      weight: 12.0,
      purityValue: null,
      wastage: 0.2,
      status: "Sold",
      displayDateIn: "06/08/2025",
    },
  ];

  const uniqueTypes = [...new Set(stockData.map((item) => item.type))].sort();

  const [filterSource, setFilterSource] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");

  return (
    <div className="stock-container">
      <h2 className="stock-heading">Stock Dashboard</h2>

      <div className="stock-summary">
        {stockSummary.map((item, index) => (
          <div key={index} className="stock-card">
            <p className="stock-label">{item.label}</p>
            <p className="stock-value">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="stock-filters">
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
        >
          <option value="">All Sources</option>
          <option value="Goldsmith">Goldsmith</option>
          <option value="Jewel Stock">Jewel Stock</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {uniqueTypes.map((type, idx) => (
            <option key={idx} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="in">In Stock</option>
          <option value="sold">Sold</option>
        </select>

        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Serial No</th>
              <th>Source</th>
              <th>Type</th>
              <th>Weight (g)</th>
              <th>Purity (g)</th>
              <th>Wastage (g)</th>
              <th>Status</th>
              <th>Date In</th>
            </tr>
          </thead>
          <tbody>
            {stockData.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.source}</td>
                <td>{item.type}</td>
                <td>{item.weight.toFixed(3)}</td>
                <td>
                  {item.source === "Jewel Stock" && item.purityValue !== null
                    ? item.purityValue.toFixed(3)
                    : "N/A"}
                </td>
                <td>
                  {item.source === "Goldsmith" && item.wastage !== null
                    ? item.wastage.toFixed(3)
                    : "N/A"}
                </td>
                <td
                  className={
                    item.status === "Sold" ? "sold-status" : "in-stock-status"
                  }
                >
                  {item.status}
                </td>
                <td>{item.displayDateIn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Stock;
