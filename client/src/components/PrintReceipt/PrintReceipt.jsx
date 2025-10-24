import React from "react";

const PrintReceipt = React.forwardRef((props, ref) => {
  const { receipt, customerName, oldbalance, oldHallMark, cashBalance, pureBalance, hallMark } = props;

  return (
    <>
      {/* Header Section */}
      <div>
        <h3 style={{textAlign:"center"}}>AGR Receipt Voucher</h3>
      </div>
      <div style={styles.header}>
        <h3 style={styles.h3}>Receipt Entries</h3>
        <h3 style={styles.h3}>Customer Name: {customerName}</h3>
        <h3 style={styles.h3}>Old Balance: {(oldbalance).toFixed(3)}</h3>
        <h3 style={styles.h3}>Old Hall Mark: {(oldHallMark).toFixed(3)}</h3>
      </div>

      {/* Table Section */}
      {receipt.length >= 1 ? (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>S.No</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>GoldRate</th>
              <th style={styles.th}>Gold</th>
              <th style={styles.th}>Touch</th>
              <th style={styles.th}>Purity</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>HallMark</th>
            </tr>
          </thead>
          <tbody>
            {receipt.map((item, index) => (
              <tr
                key={index + 1}
                style={index % 2 === 0 ? styles.row : styles.rowAlt}
              >
                <td style={styles.td}>{index + 1}</td>
                <td style={styles.td}>{new Date(item?.date).toLocaleDateString("en-GB") || "-"}</td>
                <td style={styles.td}>{item?.type || "-"}</td>
                <td style={styles.td}>{item?.goldRate || "-"}</td>
                <td style={styles.td}>{item?.gold || "-"}</td>
                <td style={styles.td}>{item?.touch || "-"}</td>
                <td style={styles.td}>{item?.purity || "-"}</td>
                <td style={styles.td}>{item?.amount || "-"}</td>
                <td style={styles.td}>{item?.hallMark || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={styles.noReceipt}>No Receipts</p>
      )}

      {/* Balance Section */}
      <div style={styles.balance}>
     
        <strong style={styles.balanceItem}>Cash Balance:₹ { Number(cashBalance).toLocaleString("en-IN", {
                  
                })}</strong>
        <strong style={styles.balanceItem}>
          {pureBalance < 0 ? "Excess Balance: " : "Pure Balance: "}
          {(pureBalance).toFixed(3)}g
        </strong>
        <strong style={styles.balanceItem}>HallMark Balance: {(hallMark).toFixed(3)}g</strong>
      </div>
    </>
  );
});

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "15px",
    flexWrap: "wrap", // ✅ responsive
  },
  h3: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#333",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    marginTop: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  th: {
    backgroundColor: "#f4f6f8",
    color: "#333",
    fontWeight: "600",
    padding: "10px",
    border: "1px solid #ddd",
    textAlign: "center",
  },
  td: {
    padding: "8px 10px",
    border: "1px solid #ddd",
    textAlign: "center",
  },
  row: {
    backgroundColor: "#fff",
  },
  rowAlt: {
    backgroundColor: "#fafafa",
  },
  noReceipt: {
    fontStyle: "italic",
    color: "#777",
    textAlign: "center",
    marginTop: "20px",
  },
  balance: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    backgroundColor: "#f9f9f9",
    flexWrap: "wrap", // ✅ responsive
    gap: "15px",
  },
  balanceItem: {
    margin: 0,

  },
};

export default PrintReceipt;
