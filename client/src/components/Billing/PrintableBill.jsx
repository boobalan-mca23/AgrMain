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
    td: { border: "1px solid #ddd", padding: "4px", textAlign: "center" },
    flex: {
      display: "flex",
      justifyContent: "space-between",
      flexWrap: "wrap",
      marginTop: "5px",
      // fontSize: "12px",
    },
    flexChild: { flex: 1, margin: "5px", textAlign: "center",fontSize: "12px", fontWeight: "bold", },
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
              <strong>Customer Name:</strong> {selectedCustomer?.name || ""}
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
              <th style={styles.th}>%</th>
              <th style={styles.th}>FWT</th>
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
                        gap: 4,
                        mt: 2,
                      }}
                    >
                      <div
                        className="hallmark-column"
                        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                      >
                        <p style={{ fontSize: "13px",marginTop:"0px"}}>
                        <b>Hallmark Balance:</b>{prevHallmark || "0.000"}{" "}
                          </p>
                        <table style={{border: "1px solid #ddd !important"}}>
                          <thead>
                            <tr>
                              <th 
                              // colSpan={2}
                              style={{ textAlign: "center !important", fontSize: "14px !important"}}
                              >
                                Qty
                              </th>
                              <th
                              // colSpan={2} 
                              style={{ textAlign: "center !important", fontSize: "14px !important"}}
                               >
                              Current Hallmark
                              </th>
                              <th 
                              // colSpan={2} 
                              style={{ textAlign: "center !important", fontSize: "14px !important"}}
                              >
                                Total
                                </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{textAlign:'center'}}>{hallmarkQty || "0.000"}</td>
                              <td style={{textAlign:'center'}}>{hallMark || "0.000"}</td>
                              <td style={{textAlign:'center'}}>{hallmarkAmount.toFixed(3) || "0.000"}</td>
                            </tr>
                            <tr>
                              <td style={{fontSize:'14px'}}><b>Total Hallmark:</b>{totalHallmark.toFixed(3)}</td>
                            </tr>
                          </tbody>
                        </table>
                       </div>
                          <div className="balance-info" style={{textAlign: "right", fontSize: "13px",}}> 
                              <>
                                  <div className="negative">
                                    <b>Opening Balance: </b>{toFixedStr(prevBalance, 3)}
                                  </div>
                                  <div><b>FWT: </b>{toFixedStr(FWT, 3)}
                                  </div>
                                  <div>
                                    <b>Total FWT: </b>{toFixedStr(TotalFWT,3)}
                                    </div>
                              </>
                      </div>
                    </div>

        {/* Received Details */}
        {rows.length > 0 && (
          <>
            <h4 style={{ margin: "5px 0" }}>Received Details:</h4>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>S.No</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Gold Rate (₹)</th>
                  <th style={styles.th}>Gold (g)</th>
                  <th style={styles.th}>Touch %</th>
                  <th style={styles.th}>Purity (g)</th>
                  <th style={styles.th}>Amount (₹)</th>
                  <th style={styles.th}>Hallmark</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  
                  <tr key={index}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>{row.date}</td>
                    <td style={styles.td}>
                      {row.goldRate || "-"}
                    </td>
                    <td style={styles.td}>
                      {row.gold && row.gold !== 0
                        ? formatToFixed3Strict(row.gold)
                        : "-"}
                    </td>
                    <td style={styles.td}>{row.touch || "-"}</td>
                    <td style={styles.td}>
                      {row.purity && row.purity !== 0
                        ? formatToFixed3Strict(row.purity)
                        : "-"}
                    </td>
                    <td style={styles.td}>{row.amount || "-"}</td>
                    <td style={styles.td}>{row.receiveHallMark || "-"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
              <tr>
                <td colSpan={8} style={styles.td}>
                  No Received details added 
                </td>
              </tr>
            )}
              </tbody>
            </table>
          </>
        )}

        {/* Profit Summary */}
        {/* <div style={{ marginTop: "15px" }}>
          <h4>Profit Summary:</h4>
          <div style={styles.flex}>
          <p style={styles.flexChild}>Bill Details Profit: {selectedBill?.billDetailsprofit || "0.000"}</p>
          <p style={styles.flexChild}>Stone Profit: {selectedBill?.Stoneprofit || "0.000"}</p>
          <p style={styles.flexChild}>Total Profit: {selectedBill?.Totalprofit || "0.000"}</p>
          </div>
        </div> */}

        {/* Profit Summary */}
            {/* <div style={{ marginTop: "15px" }}>
              <h4 style={{ marginBottom: "8px" }}>Profit Summary:</h4>
              <div style={{ display: "flex", justifyContent: "flex-end", textAlign: "right" }}>
                <div>
                  <p>Bill Details Profit: {selectedBill?.billDetailsprofit || "0.000"}</p>
                  <p>Stone Profit: {selectedBill?.Stoneprofit || "0.000"}</p>
                    <p>-----------------------------</p>
                  <p>Total Profit: {selectedBill?.Totalprofit || "0.000"}</p>
                </div>
              </div>
            </div> */}


            {/*--------*/}
             {/* <div style={{ marginTop: "15px" }}>
          <h4>Profit Summary:</h4>
          <div>
              <p>Bill Details Profit: {selectedBill?.billDetailsprofit || "0.000"}</p>
          <p>Stone Profit: {selectedBill?.Stoneprofit || "0.000"}</p>
          -------------------------------
          <p>Total Profit: {selectedBill?.Totalprofit || "0.000"}</p>
          </div> */}
      
        {/* </div>  */}
        
        {/* <br/><br/> */}
        {/* Balance Summary */}
        <div style={{...styles.flex, marginTop: "8px"}}>
          <p style={styles.flexChild}>
            <b>Cash Balance: ₹{formatToFixed3Strict(cashBalance)} </b>
          </p>
          <p style={styles.flexChild}>
            <b>Pure Balance:{formatToFixed3Strict(pureBalance)}g</b>
          </p>
          <p style={styles.flexChild}>
            <b>Hallmark Balance: {formatToFixed3Strict(hallmarkBalance)} g</b>
          </p>
        </div>
      </div>
    </div>
  );
});

export default PrintableBill;
