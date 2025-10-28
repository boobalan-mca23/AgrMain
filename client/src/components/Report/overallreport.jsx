import React, { useEffect, useState, useRef } from "react";
import "./overallreport.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OverallReportNew = () => {
  const [reportData, setReportData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    setReportData([]);
    try {
      const [customersRes, billsRes, stockRes, entriesRes] = await Promise.all([
        fetch(`${BACKEND_SERVER_URL}/api/customers`),
        fetch(`${BACKEND_SERVER_URL}/api/bill`),
        fetch(`${BACKEND_SERVER_URL}/api/productStock`),
        fetch(`${BACKEND_SERVER_URL}/api/entries`),
      ]);

      if (!customersRes.ok) throw new Error("Failed to fetch Customers data");
      if (!billsRes.ok) throw new Error("Failed to fetch Bills data");
      if (!stockRes.ok) throw new Error("Failed to fetch Product Stock data");
      if (!entriesRes.ok) throw new Error("Failed to fetch Entries data");

      const [customersData, bills, productStock, entriesData] = await Promise.all([
        customersRes.json(),
        billsRes.json(),
        stockRes.json(),
        entriesRes.json(),
      ]);

      setCustomers(customersData);
      setFilteredCustomers(customersData);

      const billData = bills?.data || [];

      const cashBalanceTotal = billData.reduce(
        (sum, b) => sum + (parseFloat(b.cashBalance) || 0),
        0
      );
      const pureBalanceTotal = customersData.reduce(
        (sum, c) => sum + (parseFloat(c.customerBillBalance?.balance) || 0),
        0
      );
      const hallmarkBalanceTotal = customersData.reduce(
        (sum, c) => sum + (parseFloat(c.customerBillBalance?.hallMarkBal) || 0),
        0
      );

      const billDetailsProfit = billData.reduce(
        (sum, b) => sum + (parseFloat(b.billDetailsprofit) || 0),
        0
      );
      const stoneProfit = billData.reduce(
        (sum, b) => sum + (parseFloat(b.Stoneprofit) || 0),
        0
      );
      const totalProfit = billData.reduce(
        (sum, b) => sum + (parseFloat(b.Totalprofit) || 0),
        0
      );

      const stockItems = productStock?.allStock || [];
      const totalStockCount = stockItems.length;
      const totalStockTouch = stockItems.reduce(
        (sum, s) => sum + (parseFloat(s.touch) || 0),
        0
      );

      const totalEntriesPurity = entriesData.reduce(
        (sum, e) => sum + (parseFloat(e.purity) || 0),
        0
      );

      setReportData([
        { label: "Cash Balance Total", value: `${cashBalanceTotal.toFixed(2)}` },
        { label: "Pure Balance Total", value: `${pureBalanceTotal.toFixed(3)} g` },
        { label: "Hallmark Balance Total", value: `${hallmarkBalanceTotal.toFixed(3)} g` },
        { label: "Bill Details Profit", value: `${billDetailsProfit.toFixed(2)}` },
        { label: "Stone Profit", value: `${stoneProfit.toFixed(2)}` },
        { label: "Total Profit", value: `${totalProfit.toFixed(2)}` },
        {
          label: "Product Stock",
          value: `${totalStockCount} Items (Touch ${totalStockTouch.toFixed(3)})`,
        },
        { label: "Entries Gold Purity", value: `${totalEntriesPurity.toFixed(3)} g` },
        { label: "Total Customers", value: `${customersData.length}` },
      ]);
    } catch (err) {
      console.error("Error fetching report:", err);
      toast.error(err.message || "Failed to fetch report data");
      setReportData([{ label: "Error", value: "Could not load data" }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    setFilteredCustomers(
      customers.filter((c) => c.name?.toLowerCase().includes(lower))
    );
  }, [searchTerm, customers]);

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const newWin = window.open("", "_blank", "width=1000,height=700");
    newWin.document.write(`
      <html>
        <head>
          <title>Customer Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    newWin.document.close();

    newWin.onload = function () {
      newWin.focus();
      newWin.print();
      newWin.close();
    };
  };


  return (
    <div className="overall-report-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="report-header">
        <h2>Overall Report (New)</h2>
        <p className="report-subtitle">Summary of all balances, stock, and profits</p>
      </div>

      {loading ? (
        <p>Loading report...</p>
      ) : (
        <>
          <div className="report-cards-container no-print">
            {reportData.map((item, idx) => (
              <div key={idx} className="report-card">
                <div className="card-label">{item.label}</div>
                <div className="card-value">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="customer-balances-section">
            <div className="no-print">
              {/* <h3>Customer Bill Balances</h3> */}
              <input
                type="text"
                className="customer-search-input"
                placeholder="Search customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div ref={printRef}>
              <h2>Customer Bill Balances</h2>
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Pure Balance</th>
                    <th>Hallmark Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c, index) => (
                      <tr key={c.id || index}>
                        <td>{index + 1}</td>
                        <td>{c.name}</td>
                        <td>{c.phone || "-"}</td>
                        <td>{(parseFloat(c.customerBillBalance?.balance) || 0).toFixed(3)}</td>
                        <td>{(parseFloat(c.customerBillBalance?.hallMarkBal) || 0).toFixed(3)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5">No matching customers found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="print-btn-container no-print">
              <button className="print-btn" onClick={handlePrint}>
                Print Report
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OverallReportNew;
