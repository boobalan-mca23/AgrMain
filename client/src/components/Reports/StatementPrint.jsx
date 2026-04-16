import React from "react";
import "./StatementPrint.css";

const StatementPrint = ({ data, type, entityName, fromDate, toDate }) => {
  const formatVal = (val) => (val != null ? val.toFixed(3) : "0.000");

  const RenderInlineDetails = ({ row }) => {
    if (!row.metadata) return null;
    const { module, metadata } = row;

    if (module === "Bill" && metadata.orders) {
      return (
        <div className="print-inline-details">
          <table className="print-nested-table">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Count</th>
                <th>Item Name</th>
                <th>ItemWt</th>
                <th>StoneWt</th>
                <th>AWT</th>
                <th>%</th>
                <th>FWT</th>
              </tr>
            </thead>
            <tbody>
              {metadata.orders.map((order, i) => (
                <tr key={i}>
                  {i === 0 && <td rowSpan={metadata.orders.length}>Bill</td>}
                  <td>{order.count}</td>
                  <td>{order.productName}</td>
                  <td>{formatVal(order.weight)}</td>
                  <td>{formatVal(order.stoneWeight)}</td>
                  <td>{formatVal(order.afterWeight || order.netWeight)}</td>
                  <td>{formatVal(order.percentage)}</td>
                  <td>{formatVal(order.finalWeight)}</td>
                </tr>
              ))}
              {(metadata.hallmarkQty > 0 || metadata.hallMark > 0) && (
                <tr className="hallmark-row">
                    <td colSpan={7}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(hallmarkQty X hallmark = total hallMark)</span>
                            <span>{metadata.hallmarkQty} X {metadata.hallMark} =</span>
                        </div>
                    </td>
                    <td>{formatVal(Number(metadata.hallmarkQty) * Number(metadata.hallMark))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (module === "Return" || module.startsWith("Repair")) {
      const isRepair = module.startsWith("Repair");
      return (
        <div className="print-inline-details">
          <table className="print-nested-table">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Item Name</th>
                <th>Count</th>
                <th>ItemWt</th>
                <th>Stone Wt</th>
                <th>Net Wt</th>
                <th>Touch%</th>
                <th>FWT</th>
                <th>Hall Mark</th>
                {isRepair && <th>Status</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{isRepair ? "Repair" : "Return"}</td>
                <td>{metadata.productName || metadata.itemName}</td>
                <td>{metadata.count}</td>
                <td>{formatVal(metadata.weight || metadata.grossWeight)}</td>
                <td>{formatVal(metadata.stoneWeight)}</td>
                <td>{formatVal(metadata.awt || metadata.netWeight)}</td>
                <td>{formatVal(metadata.percentage)}</td>
                <td>{formatVal(metadata.pureGoldReduction || metadata.fwt)}</td>
                <td>{formatVal(metadata.hallmarkReduction)}</td>
                {isRepair && <td>{metadata.status || "-"}</td>}
              </tr>
            </tbody>
          </table>
          {metadata.reason && <div className="print-reason">Reason: {metadata.reason}</div>}
        </div>
      );
    }

    if (module === "Bill Receipt" || module === "Receipt Voucher" || module === "Transaction") {
      const type = (metadata.type || "").toLowerCase();
      const isCash = type.includes("cash");
      return (
        <div className="print-inline-details">
          <table className="print-nested-table">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Type</th>
                {isCash ? (
                  <>
                    <th>Amount</th>
                    <th>Gold Rate</th>
                    <th>Touch</th>
                    <th>Purity</th>
                    <th>Pure Gold</th>
                  </>
                ) : (
                  <>
                    <th>Gold</th>
                    <th>Touch</th>
                    <th>Purity</th>
                  </>
                )}
                {module !== "Transaction" && <th>Hall Mark</th>}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{module}</td>
                <td>{metadata.type || "-"}</td>
                {isCash ? (
                  <>
                    <td>{(Number(metadata.amount) || 0).toFixed(2)}</td>
                    <td>{(Number(metadata.goldRate) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.touch) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.purity) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.pureGold) || 0).toFixed(3)}</td>
                  </>
                ) : (
                  <>
                    <td>{(Number(metadata.goldWeight || metadata.gold) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.touch) || 0).toFixed(3)}</td>
                    <td>{(Number(metadata.purity) || 0).toFixed(3)}</td>
                  </>
                )}
                {module !== "Transaction" && <td>{formatVal(metadata.hallmark)}</td>}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (module === "Gold Given" || module === "Gold Received") {
      return (
        <div className="print-inline-details">
          <table className="print-nested-table">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>JobCard#</th>
                <th>Weight</th>
                <th>Touch</th>
                <th>Purity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{module === "Gold Given" ? "Issue" : "Receipt"}</td>
                <td>#{metadata.jobcardId || "-"}</td>
                <td>{formatVal(metadata.weight)}</td>
                <td>{formatVal(metadata.touch)}</td>
                <td>{formatVal(metadata.purity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (module === "Item Delivery") {
      return (
        <div className="print-inline-details">
          <table className="print-nested-table">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>JobCard#</th>
                <th>Item Name</th>
                <th>Wt</th>
                <th>Count</th>
                <th>Touch</th>
                <th>Stone Wt</th>
                <th>Net Wt</th>
                <th>Wastage Type</th>
                <th>W.Value</th>
                <th>W.Pure</th>
                <th>Final Purity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Finished</td>
                <td>#{metadata.jobcardId || "-"}</td>
                <td>{metadata.itemName}</td>
                <td>{formatVal(metadata.itemWeight)}</td>
                <td>{metadata.count}</td>
                <td>{formatVal(metadata.touch)}</td>
                <td>{formatVal(metadata.stoneWeight)}</td>
                <td>{formatVal(metadata.netWeight)}</td>
                <td>{metadata.wastageType || "-"}</td>
                <td>{formatVal(metadata.wastageValue)}</td>
                <td>{formatVal(metadata.wastagePure)}</td>
                <td>{formatVal(metadata.finalPurity)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (module === "BC Purchase" || module === "Item Purchase") {
      return (
        <div className="print-inline-details">
          <table className="print-nested-table">
            <thead>
              <tr>
                <th>Entry Type</th>
                <th>Item Name</th>
                <th>Wt</th>
                <th>Count</th>
                <th>Touch</th>
                <th>Stone Wt</th>
                <th>Net Wt</th>
                <th>Wastage Type</th>
                <th>W.Value</th>
                <th>W.Pure</th>
                <th>Final Purity</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{module === "BC Purchase" ? "Bulk" : "Item"}</td>
                <td>{metadata.jewelName || metadata.itemName}</td>
                <td>{formatVal(metadata.grossWeight)}</td>
                <td>{metadata.count || "1"}</td>
                <td>{formatVal(metadata.touch)}</td>
                <td>{formatVal(metadata.stoneWeight)}</td>
                <td>{formatVal(metadata.netWeight)}</td>
                <td>{metadata.wastageType || "-"}</td>
                <td>{formatVal(metadata.wastage)}</td>
                <td>{formatVal(metadata.wastagePure)}</td>
                <td>{formatVal(metadata.finalPurity)}</td>
              </tr>
              {metadata.items && metadata.items.length > 0 && (
                <>
                  <tr className="print-sub-item-header">
                    <td colSpan={11} style={{ fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>↳ Item Breakdown</td>
                  </tr>
                  {metadata.items.map((item, i) => (
                    <tr key={i} className="print-sub-item-row">
                      <td colSpan={2}></td>
                      <td>{formatVal(item.grossWeight)}</td>
                      <td>{item.count || "1"}</td>
                      <td>{formatVal(item.touch)}</td>
                      <td>{formatVal(item.stoneWeight)}</td>
                      <td>{formatVal(item.netWeight)}</td>
                      <td colSpan={4}>{item.itemName}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

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
              <td className="print-desc-cell">
                <div className="print-desc-main">{row.description}</div>
                <RenderInlineDetails row={row} />
              </td>
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
