import React, { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Mastercustomer.css";

export default function PurchaseStock() {
  const [stock, setStock] = useState([]);
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    fetchStock();
  }, []);

  async function fetchStock() {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/purchase-stock`);
      setStock(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  const del = async (id) => {
    if (!window.confirm("Delete from purchase stock? This will remove stock record.")) return;
    try {
      await axios.delete(`${BACKEND_SERVER_URL}/api/purchase-stock/${id}`);
      toast.success("Deleted");
      fetchStock();
    } catch (e) {
      toast.error("Failed");
    }
  };

  return (
    <div className="master-container">
      <ToastContainer />

      <div className="item-list item-list-supplier" style={{ width: "100%" }}>
        <h2 style={{ textAlign: "center" }}>Purchase Stock</h2>

        {stock.length === 0 ? (
          <p>No items</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SI.No</th>
                <th>Supplier</th>
                <th>Jewel</th>
                <th>Gross</th>
                <th>Stone</th>
                <th>Net</th>
                <th>Wastage</th>
                <th>Touch</th>
                <th>Final Purity</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {stock.map((s, idx) => (
                <tr key={s.id}>
                  <td>{idx + 1}</td>
                  <td>{s.supplier?.name}</td>
                  <td>{s.jewelName}</td>
                  <td>{s.grossWeight}</td>
                  <td>{s.stoneWeight}</td>
                  <td>{s.netWeight}</td>
                  <td>{s.wastage}</td>
                  <td>{s.touch}</td>
                  <td>{s.finalPurity}</td>

                  <td>
                    <button
                      style={{
                        padding: "4px 8px",
                        marginRight: "8px",
                        background: "#1976d2",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      onClick={() => setViewItem(s)}
                    >
                      View
                    </button>

                    <button
                      style={{
                        padding: "4px 8px",
                        background: "#d32f2f",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      onClick={() => del(s.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewItem && (
        <div className="popup-overlay">
          <div className="popup-card">
            <h3>Purchase Stock Details</h3>

            <div className="detail-row">
              <span>Supplier:</span> <b>{viewItem.supplier?.name}</b>
            </div>
            <div className="detail-row">
              <span>Jewel:</span> <b>{viewItem.jewelName}</b>
            </div>
            <div className="detail-row">
              <span>Gross:</span> <b>{viewItem.grossWeight}</b>
            </div>
            <div className="detail-row">
              <span>Stone:</span> <b>{viewItem.stoneWeight}</b>
            </div>
            <div className="detail-row">
              <span>Net:</span> <b>{viewItem.netWeight}</b>
            </div>
            <div className="detail-row">
              <span>Wastage:</span> <b>{viewItem.wastage}</b>
            </div>
            <div className="detail-row">
              <span>Touch:</span> <b>{viewItem.touch}</b>
            </div>
            <div className="detail-row">
              <span>Final Purity:</span> <b>{viewItem.finalPurity}</b>
            </div>

            <button className="close-btn" onClick={() => setViewItem(null)}>
              X
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
