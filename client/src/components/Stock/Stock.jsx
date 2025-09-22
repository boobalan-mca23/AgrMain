

import { useState,useEffect } from "react";
import axios from 'axios'
import { BACKEND_SERVER_URL } from "../../Config/Config";
import {
  TablePagination,
} from "@mui/material";

import "./Stock.css";

const Stock = () => {
   const [stockData,setStockData]=useState([])

   const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const paginatedData = stockData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
const currentPageTotal = paginatedData.reduce(
    (acc, item) => {
      acc.itemWt += item.itemWeight;
      acc.finalWt += item.finalWeight;
      return acc;
    },
    {itemWt: 0,finalWt: 0 } // Initial accumulator
  );

   const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

   useEffect(()=>{
       const fetchProductStock=async()=>{
         const res=await axios.get(`${BACKEND_SERVER_URL}/api/productStock`)
         console.log('res from productStock',res.data.allStock)
         setStockData(res.data.allStock)
       }
       fetchProductStock()
      
   },[])






  // const stockSummary = [
  //   { label: "Total Items", value:stockData.length },
  //   { label: "Total Weight", value: "125.000g" },
  //   { label: "Total Wastage (Goldsmith)", value: "5.000g" },
  //   { label: "Total Purity (Jewel Stock)", value: "110.000g" },
  // ];
   

  // const uniqueTypes = [...new Set(stockData.map((item) => item.type))].sort();

  const [filterSource, setFilterSource] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const calculatePurity=(touch,itemWeight)=>{
    const purityValue=(touch/100)*itemWeight
    return purityValue.toFixed(3)
  }
 const calculatePurityTotal = (stock) => {
  const totalPurity = stock.reduce((acc, item) => {
    return acc + (item.touch / 100) * item.itemWeight;
  }, 0);

  return totalPurity.toFixed(3);
};

const calculatewastgePure=(stock)=>{
  const totalWastage = stock.reduce((acc,item)=>{
    return acc+ item.wastagePure
  },0)
  return totalWastage.toFixed(3)
}

  return (
    <div className="stock-container">
      <h2 className="stock-heading">Stock Dashboard</h2>

      <div className="stock-summary">
        
          <div  className="stock-card">
            <p className="stock-label">Total Items</p>
            <p className="stock-value">{stockData.length}</p>
          </div>
           <div  className="stock-card">
            <p className="stock-label">Total Weight</p>
            <div className="stock-weight-grid">
              {stockData.length>0 && stockData.map((item,index)=>(
               <div key={index+1}>
                <p>{item.touch} % - {item.itemWeight}={calculatePurity(item.touch,item.itemWeight)}</p>
               </div>
            ))}
            </div>
           <p><strong>Total Purity:</strong>{calculatePurityTotal(stockData)}</p>
          </div>
          <div  className="stock-card">
            <p className="stock-label">Total Wastage </p>
            <p className="stock-value">{calculatewastgePure(stockData)}</p>
          </div>
            <div  className="stock-card">
            <p className="stock-label">Total Purity</p>
            <p className="stock-value">{(calculatePurityTotal(stockData)-calculatewastgePure(stockData)).toFixed(3)}</p>
          </div>
           
      
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
       {
        stockData.length>=1 ? ( 
        
        
        <table className="stock-table">
          <thead>
            <tr>
              <th>Serial No</th>
              <th>ProductName</th>
              <th>ItemWeight (g)</th>
              <th>Count</th>
              <th>Tocuh </th>
              <th>StoneWt (g)</th>
              <th>NetWeight (g)</th>
              <th>WastageValue (g)</th>
              <th>WastagePure (g)</th>
              <th>Final Purity</th>
            </tr>
          </thead>
          <tbody>
          {stockData.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.itemName}</td>
                <td>{item.itemWeight.toFixed(3)}</td>
                <td>{item.count||0}</td>
                <td>{item.touch}</td>
                <td>{item.stoneWeight.toFixed(3)}</td>
                <td>{item.netWeight.toFixed(3)}</td>
                <td>{item.wastageValue.toFixed(3)}</td>
                <td>{item.wastagePure.toFixed(3)}</td>
                <td>{item.finalWeight.toFixed(3)}</td>
              </tr>
               ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}><strong>Total</strong></td>
              <td><strong>{(currentPageTotal.itemWt).toFixed(3)}</strong></td>
              <td colSpan={6}></td>
              <td><strong>{(currentPageTotal.finalWt).toFixed(3)}</strong></td>
          
            </tr>
          </tfoot>
        </table>):(<p style={{textAlign:"center",color:"red",fontSize:"larger"}}>No Stock Information</p>)
       }
         {stockData.length >= 1 && (
            <TablePagination
              component="div"
              count={stockData.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
            />
          )}
      </div>
    </div>
  );
};

export default Stock;
