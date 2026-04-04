import React from "react";
import "./StatementPrint.css";

const StatementPrint = ({ data, type, entityName, fromDate, toDate }) => {
  return (
    <div className="statement-print-container">
      <div className="header">
        <h1>{type.charAt(0).toUpperCase() + type.slice(1)} Balance Statement</h1>
        <div className="details">
          <p><strong>Name:</strong> {entityName}</p>
          <p><strong>Period:</strong> {fromDate || "Beginning"} to {toDate || "Present"}</p>
          <p><strong>Date Generated:</strong> {new Date().toLocaleDateString("en-GB")}</p>
        </div>
      </div>

      <table className="statement-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Date</th>
            <th>Type</th>
            <th>Description</th>
            {type === "customer" && (
              <>
                <th>Before Balance</th>
                <th className="table-header-pos">+</th>
                <th className="table-header-neg">-</th>
                <th>Balance</th>
                <th>Before Hallmark Balance</th>
                <th className="table-header-pos">+</th>
                <th className="table-header-neg">-</th>
                <th>Hallmark Balance</th>
              </>
            )}
            {type === "goldsmith" && (
              <>
                <th>Before Gold</th>
                <th className="table-header-pos">+</th>
                <th className="table-header-neg">-</th>
                <th>After Gold</th>
              </>
            )}
            {type === "supplier" && (
              <>
                <th>Before BC</th>
                <th className="table-header-pos">+</th>
                <th className="table-header-neg">-</th>
                <th>After BC</th>
                <th>Before Item</th>
                <th className="table-header-pos">+</th>
                <th className="table-header-neg">-</th>
                <th>After Item</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{new Date(row.date).toLocaleDateString("en-GB")}</td>
              <td>{row.module}</td>
              <td>{row.description}</td>
              {type === "customer" && (
                <>
                  <td>{row.beforeCash?.toFixed(3)}</td>
                  <td className="debit-cell">{row.debitAmount > 0 ? row.debitAmount.toFixed(3) : "-"}</td>
                  <td className="credit-cell">{row.creditAmount > 0 ? row.creditAmount.toFixed(3) : "-"}</td>
                  <td>{row.afterCash?.toFixed(3)}</td>
                  <td>{row.beforeHallmark?.toFixed(3)}</td>
                  <td className="debit-cell">{row.debitHallmark > 0 ? row.debitHallmark.toFixed(3) : "-"}</td>
                  <td className="credit-cell">{row.creditHallmark > 0 ? row.creditHallmark.toFixed(3) : "-"}</td>
                  <td>{row.afterHallmark?.toFixed(3)}</td>
                </>
              )}
              {type === "goldsmith" && (
                <>
                  <td>{row.beforeGold?.toFixed(3)}</td>
                  <td className="debit-cell">{row.debitGold > 0 ? row.debitGold.toFixed(3) : "-"}</td>
                  <td className="credit-cell">{row.creditGold > 0 ? row.creditGold.toFixed(3) : "-"}</td>
                  <td>{row.afterGold?.toFixed(3)}</td>
                </>
              )}
              {type === "supplier" && (
                <>
                  <td>{row.beforeBC?.toFixed(3)}</td>
                  <td className="debit-cell">{row.debitBC > 0 ? row.debitBC.toFixed(3) : "-"}</td>
                  <td className="credit-cell">{row.creditBC > 0 ? row.creditBC.toFixed(3) : "-"}</td>
                  <td>{row.afterBC?.toFixed(3)}</td>
                  <td>{row.beforeItem?.toFixed(3)}</td>
                  <td className="debit-cell">{row.debitItem > 0 ? row.debitItem.toFixed(3) : "-"}</td>
                  <td className="credit-cell">{row.creditItem > 0 ? row.creditItem.toFixed(3) : "-"}</td>
                  <td>{row.afterItem?.toFixed(3)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="footer">
        <p>This is a computer generated statement.</p>
      </div>
    </div>
  );
};

export default StatementPrint;
