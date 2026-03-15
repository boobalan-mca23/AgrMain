// PrintableBill.jsx
import React from "react";
import { useState } from "react";
import { formatToFixed3Strict } from "../../utils/formatToFixed3Strict";

const PrintableBill = React.forwardRef((props, ref) => {
  const {
    billNo,
    date,
    time,
    selectedCustomer,
    billItems = [],
    rows = [],
    pureBalance,
    hallmarkBalance,
    prevBalance,
    prevHallmark,
    hallMark,
    viewMode,
    selectedBill,
    cashBalance,
    hallmarkQty,
    hallmarkAmount,
    totalHallmark,
    FWT,
    TotalFWT,
  } = props;

  const styles = {
    printableBill: { width: "100%", fontFamily: "Arial, sans-serif" },
    // container: { margin: "0", padding: "10px" },
    heading: { textAlign: "center", margin: "0 0 0 0" },
    billInfo: {
      display: "flex",
      justifyContent: "space-between",
      // marginBottom: "10px",
    },
    // billInfoItem: { margin: "0", marginBottom: "5px" },
    billInfoItem: { margin: "0" },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      // marginBottom: "15px",
      fontSize: "14px",
    },
    th: {
      border: "1px solid #ddd",
      padding: "4px",
      textAlign: "center",
      backgroundColor: "#f2f2f2",
    },
    td: { border: "1px solid #ddd", padding: "4px", textAlign: "center", wordBreak: "break-word", overflowWrap: "anywhere" },
    flex: {
      display: "flex",
      justifyContent: "space-between",
      flexWrap: "wrap",
      marginTop: "5px",
      // fontSize: "12px",
    },
    flexChild: { flex: 1, margin: "5px", textAlign: "center", fontSize: "12px", fontWeight: "bold", },
  };
  const toFixedStr = (v, d = 3) => {
    return (
      Math.round((toNumber(v) + Number.EPSILON) * Math.pow(10, d)) /
      Math.pow(10, d)
    ).toFixed(d);
  };
  const toNumber = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  return (
    <div style={styles.printableBill} ref={ref}>
      <div style={styles.container}>
        <h2 style={styles.heading}>Estimate Only</h2>
        {/* Bill Info */}
        <div style={styles.billInfo}>
          <div>
            <p style={styles.billInfoItem}>
              <strong>Bill No:</strong> {billNo}
            </p>
            <p style={styles.billInfoItem}>
              <strong>Customer Name:</strong> {selectedCustomer.name || selectedCustomer || "null"}
            </p>
          </div>
          <div>
            <p style={styles.billInfoItem}>
              <strong>Date:</strong> {date}
            </p>
            <p style={styles.billInfoItem}>
              <strong>Time:</strong> {time}
            </p>
          </div>
        </div>

        {/* Bill Details */}
        <h4 style={{ margin: "5px 0" }}>Bill Details:</h4> {/* tightened spacing */}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>S.No</th>
              <th style={styles.th}>Product</th>
              <th style={styles.th}>Count</th>
              <th style={styles.th}>Wt</th>
              <th style={styles.th}>St.Wt</th>
              <th style={styles.th}>AWT</th>
              <th style={styles.th}>Touch</th>
              <th style={styles.th}>FWT</th>
              {/* <th style={styles.th}>Status</th> */}
            </tr>
          </thead>
          <tbody>
            {billItems.map((item, index) => (
              <tr key={index}>
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>{item.productName}</td>
                <td style={styles.td}>{item.count || 0}</td>
                <td style={styles.td}>{formatToFixed3Strict(item.weight)}</td>
                <td style={styles.td}>{formatToFixed3Strict(item.stoneWeight)}</td>
                <td style={styles.td}>{formatToFixed3Strict(item.afterWeight)}</td>
                <td style={styles.td}>{item.percentage}</td>
                <td style={styles.td}>{formatToFixed3Strict(item.finalWeight)}</td>
                {/* <td style={styles.td}>
                  {item.repairStatus === "IN_REPAIR"
                    ? "Repair"
                    : item.repairStatus === "PARTIAL_REPAIR"
                      ? "Partial Repair"
                      : item.repairStatus === "RETURNED"
                        ? "Return"
                        : item.repairStatus === "PARTIAL_RETURN"
                          ? "Partial Return"
                          : "Sold"}
                </td> */}
              </tr>
            ))}
            {billItems.length === 0 && (
              <tr>
                <td colSpan={8} style={styles.td}>
                  No Bill Details
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div
          className="hallmark-balance-wrapper"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "3px",
            marginTop: "3px",
          }}
        >
          {/* Left side - Hallmark Summary */}
          <div
            className="hallmark-column"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {prevHallmark > 0 ? (
              <p
                style={{
                  fontSize: "12px",
                  margin: "0",
                  fontWeight: "bold",
                }}
              >
                Opening Hallmark Balance: {formatToFixed3Strict(prevHallmark) || "0.000"}
              </p>
            ) : prevHallmark < 0 ? (
              <p
                style={{
                  fontSize: "12px",
                  margin: "0",
                  fontWeight: "bold",
                }}
              >
                Excess Hallmark Balance: {formatToFixed3Strict(prevHallmark) || "0.000"}
              </p>
            ) : (
              <p
                style={{
                  fontSize: "12px",
                  margin: "0",
                  fontWeight: "bold",
                }}
              >
                Opening Hallmark Balance: 0.000
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <p
                style={{ fontSize: "12px", margin: "0", }}
              ><b>Qty:</b> {hallmarkQty || "0.000"}</p>

              <p
                style={{ fontSize: "12px", margin: "0", }}
              >X</p>

              <p
                style={{ fontSize: "12px", margin: "0", }}
              ><b>Rate:</b> {hallMark || "0.000"}</p>

              <p
                style={{ fontSize: "12px", margin: "0", }}
              >=</p>

              <p
                style={{ fontSize: "12px", margin: "0", }}
              >{hallmarkAmount?.toFixed(3) || "0.000"}</p>

            </div>
            {/* Total Hallmark below table */}
            <p
              style={{
                marginTop: "2px",
                fontSize: "12px",
                fontWeight: "bold",
                textAlign: "left",
              }}
            >
              Total Hallmark: {totalHallmark?.toFixed(3) || "0.000"}
            </p>
          </div>

          {/* Right side - Balance Info */}
          <div
            className="balance-info"
            style={{
              flex: 1,
              textAlign: "right",
              fontSize: "12px",
              lineHeight: "1.3",
            }}
          >
            {prevBalance < 0 ? (
              <div style={{ color: "#333" }}>
                <b>Excess Balance:</b> {toFixedStr(prevBalance, 3)}
              </div>
            ) : (
              <div style={{ color: "#333" }}>
                <b>Opening Balance:</b> {toFixedStr(prevBalance, 3)}
              </div>
            )}
            <div>
              <b>FWT:</b> {toFixedStr(FWT, 3)}
            </div>
            <div>
              <b>Total FWT:</b> {toFixedStr(TotalFWT, 3)}
            </div>
          </div>
        </div>
        {/* Balance Summary */}
        <div style={{ ...styles.flex, marginTop: "8px" }}>

          <p style={styles.flexChild}>
            {hallmarkBalance < 0 ? (
              <span>
                <b>Excess Hallmark Balance: {formatToFixed3Strict(hallmarkBalance)} g</b>
              </span>
            ) : (
              <span>
                <b>Hallmark Balance: {formatToFixed3Strict(hallmarkBalance)} g</b>
              </span>
            )}
          </p>
          <p style={styles.flexChild}>
            {
              pureBalance < 0 ? (
                <span>
                  <b>Excess Balance: {formatToFixed3Strict(pureBalance)}g</b>
                </span>
              ) : (
                <span>
                  <b>Pure Balance: {formatToFixed3Strict(pureBalance)}g</b>
                </span>
              )
            }
          </p>
        </div>
      </div>
    </div>
  );
});

export default PrintableBill;
