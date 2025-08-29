

import { useState,useEffect } from "react";
import axios from 'axios'
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./Stock.css";
const Stock = () => {
   const [stockData,setStockData]=useState([])

   useEffect(()=>{
       const fetchProductStock=async()=>{
         const res=await axios.get(`${BACKEND_SERVER_URL}/api/productStock`)
         console.log('res from productStock',res.data.allStock)
         setStockData(res.data.allStock)
       }
       fetchProductStock()
      
   },[])






  const stockSummary = [
    { label: "Total Items", value: 10 },
    { label: "Total Weight", value: "125.000g" },
    { label: "Total Wastage (Goldsmith)", value: "5.000g" },
    { label: "Total Purity (Jewel Stock)", value: "110.000g" },
  ];
   

  // const uniqueTypes = [...new Set(stockData.map((item) => item.type))].sort();

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

      {/* <div className="stock-filters">
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
      </div> */}

      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Serial No</th>
              <th>ProductName</th>
              <th>ItemWeight (g)</th>
              <th>Tocuh </th>
              <th>StoneWt (g)</th>
              <th>WastageValue (g)</th>
              <th>Final Purity</th>
            </tr>
          </thead>
          <tbody>
            {stockData.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.itemName}</td>
                <td>{item.itemWeight.toFixed(3)}</td>
                <td>{item.touch}</td>
                <td>{item.stoneWeight.toFixed(3)}</td>
                <td>{item.wastageValue.toFixed(3)}</td>
                <td>{item.finalWeight.toFixed(3)}</td>
                
                {/* <td>
                  {item.source === "Jewel Stock" && item.purityValue !== null
                    ? item.purityValue.toFixed(3)
                    : "N/A"}
                </td>
                <td>
                  {item.source === "Goldsmith" && item.wastage !== null
                    ? item.wastage.toFixed(3)
                    : "N/A"}
                </td> */}
                {/* <td
                  className={
                    item.status === "Sold" ? "sold-status" : "in-stock-status"
                  }
                >
                  {item.status}
                </td>
                <td>{item.displayDateIn}</td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Stock;
