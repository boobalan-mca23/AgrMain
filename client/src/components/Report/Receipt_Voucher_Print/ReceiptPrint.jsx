import React from "react";
const ReceiptPrintReport = (props) => {
  const { fromDate, toDate, customerName, receipt,selectedCustomer } = props;
  return (
    <>
      <div>
        <div>
          <h3 style={styles.title}>Receipt Voucher Report</h3>
        </div>
        <div style={styles.ReceiptPrintHead}>
          <p>
            <strong>From Date</strong>: {fromDate}
          </p>
          <p>
            <strong>To Date</strong>: {toDate}
          </p>
          <p>
            <strong>Customer Name</strong>: {customerName}
          </p>
          
        </div>
        <div>
            <p style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <strong>
              {selectedCustomer?.customerBillBalance?.balance > 0
                ? "Pure Balance: "
                : selectedCustomer?.customerBillBalance?.balance < 0
                ? "Excess Pure Balance: "
                : " Balance "}
              {Number(
                selectedCustomer?.customerBillBalance?.balance || 0
              ).toFixed(3)}
            </strong>
            <span
              style={{ borderLeft: "2px solid #999", height: "30px" }}
            ></span>
            <strong>
              HallMark Balance:
              {Number(
                selectedCustomer?.customerBillBalance?.hallMarkBal || 0
              ).toFixed(3)}
            </strong>
          </p>
        </div>

        <div>
          {receipt.length >= 1 ? (
            <>
              <table style={styles.ReportTable}>
                <thead>
                  <tr>
                    <th style={styles.ReportTableHead}>S.no</th>
                    <th style={styles.ReportTableHead}>Date</th>
                    <th style={styles.ReportTableHead}>Type</th>
                    <th style={styles.ReportTableHead}>GoldRate</th>
                    <th style={styles.ReportTableHead}>Gold</th>
                    <th style={styles.ReportTableHead}>Touch</th>
                    <th style={styles.ReportTableHead}>Purity</th>
                    <th style={styles.ReportTableHead}>Amount</th>
                    <th style={styles.ReportTableHead}>HallMark</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.map((item, index) => (
                    <tr>
                      <td style={styles.ReportTablebody}>{index + 1}</td>
                      <td style={styles.ReportTablebody}>{item.date || "-"}</td>
                      <td style={styles.ReportTablebody}>{item.type || "-"}</td>
                      <td style={styles.ReportTablebody}>
                        {item.goldRate || 0}
                      </td>
                      <td style={styles.ReportTablebody}>{item.gold || 0}</td>
                      <td style={styles.ReportTablebody}>{item.touch || 0}</td>
                      <td style={styles.ReportTablebody}>{item.purity || 0}</td>
                      <td style={styles.ReportTablebody}>{item.amount || 0}</td>
                      <td style={styles.ReportTablebody}>
                        {item.hallMark || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>No Receipt Enteries</p>
          )}
        </div>
      </div>
    </>
  );
};

const styles = {
  title: {
    textAlign: "center",
  },
  ReceiptPrintHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  ReportTable: {
    width: "100%",
    borderCollapse: "collapse",
    padding: "3px",
    textAlign: "center",
  },
  ReportTableHead: {
    border: "1px solid black",
  },
  ReportTablebody: {
    border: "1px solid black",
  },
};
export default ReceiptPrintReport;
