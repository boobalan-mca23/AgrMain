import { useState, useEffect } from "react";
import axios from 'axios'
import { BACKEND_SERVER_URL } from "../../Config/Config";
import {
  TablePagination,
  Button,
} from "@mui/material";
import {
  AddCircleOutline,
} from "@mui/icons-material";
import "./Stock.css";
 
const Stock = () => {
  const [stockData, setStockData] = useState([]);
 
  const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(5);
 
  const paginatedData = stockData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
 
  const currentPageTotal = paginatedData.reduce(
    (acc, item) => {
      acc.itemWt += item.itemWeight ?? 0;
      acc.finalWt += item.finalWeight ?? 0;
      return acc;
    },
    { itemWt: 0, finalWt: 0 } // Initial accumulator
  );
 
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
 
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
 
  useEffect(() => {
    fetchProductStock();
  }, []);
    const fetchProductStock = async () => {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/productStock`);
      const activeOnly = res.data.allStock.filter(item => item.isActive);
      setStockData(activeOnly);
    };
 
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
 
  const calculatePurity = (touch, itemWeight) => {
    const purityValue = (touch / 100) * itemWeight;
    return purityValue.toFixed(3);
  };
 
  const calculatePurityTotal = (stock) => {
    const totalPurity = stock.reduce((acc, item) => {
      return acc + ((item.touch ?? 0) / 100) * (item.itemWeight ?? 0);
    }, 0);
    return totalPurity.toFixed(3);
  };
 
  const calculatewastgePure = (stock) => {
    const totalWastage = stock.reduce((acc, item) => {
      return acc + (item.wastagePure ?? 0);
    }, 0);
    return totalWastage.toFixed(3);
  };

    const safeFixed = (num, decimals = 3) => {
      const n = parseFloat(num);
      return isNaN(n) ? "0.000" : n.toFixed(decimals);
    };

  const handleItemSold = async (id)=> {
    if(window.confirm('Do you want to make this item be "Sold"')){
    stockData.forEach(item => {
      if(item.id === id){
        console.log("Found item:", item);
        const updateItem = async () => {
          try {
            const res = await axios.put(`${BACKEND_SERVER_URL}/api/productStock/${id}`, {
              isBillProduct: false,
              isActive: false,
            });
            console.log('Update response:', res.data);
            setStockData(prevData => prevData.map(it => it.id === id ? { ...it, isBillProduct: false } : it));
            await fetchProductStock();
          } catch (error) {
            console.error('Error updating item:', error);
          }
        };
        updateItem();
       
      }
    });}else{
      console.log('cancelled')
    }
  }  
 
  return (
    <div className="stock-container">
      <h2 className="stock-heading">Stock Dashboard</h2>
 
      <div className="stock-summary">
        <div className="stock-card">
          <p className="stock-label">Total Items</p>
          <p className="stock-value">{stockData.length}</p>
        </div>
 
        <div className="stock-card">
          <p className="stock-label">Total Weight</p>
          <div className="stock-weight-grid">
            {stockData.length > 0 &&
              stockData.map((item, index) => (
                <div key={index + 1}>
                  <p>
                    {item.touch} % - {item.itemWeight} ={" "}
                    {calculatePurity(item.touch ?? 0, item.itemWeight ?? 0)}
                  </p>
                </div>
              ))}
          </div>
          <p>
            <strong>Total Purity:</strong>
            {calculatePurityTotal(stockData)}
          </p>
        </div>
 
        <div className="stock-card">
          <p className="stock-label">Total Wastage </p>
          <p className="stock-value">{calculatewastgePure(stockData)}</p>
        </div>
 
        <div className="stock-card">
          <p className="stock-label">Total Purity</p>
          <p className="stock-value">
            {(calculatePurityTotal(stockData) - calculatewastgePure(stockData)).toFixed(3)}
          </p>
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
        {stockData.length >= 1 ? (
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {stockData.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.itemName}</td>
                  <td>{item.itemWeight < 0.050 ? handleItemSold(item.id):safeFixed(item.itemWeight)}</td>
                  <td>{item.count || 0}</td>
                  <td>{item.touch ?? 0}</td>
                  <td>{safeFixed(item.stoneWeight)}</td>
                  <td>{safeFixed(item.netWeight)}</td>
                  <td>{safeFixed(item.wastageValue)}</td>
                  <td>{safeFixed(item.wastagePure)}</td>
                  <td>{safeFixed(item.finalWeight)}</td>
                  <td>{item.isBillProduct && <Button
                        variant="contained"
                        startIcon={<AddCircleOutline />}
                        onClick={()=>handleItemSold(item.id)}
                        sx={{
                          bgcolor: "primary.main",
                          "&:hover": { bgcolor: "primary.dark" },
                          px: 3,
                          py: 1.5,
                          borderRadius: "8px",
                          textTransform: "none",
                        }}
                      >
                      Sold
                    </Button>||"-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}><strong>Total</strong></td>
                <td><strong>{safeFixed(currentPageTotal.itemWt)}</strong></td>
                <td colSpan={6}></td>
                <td><strong>{safeFixed(currentPageTotal.finalWt)}</strong></td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p style={{ textAlign: "center", color: "red", fontSize: "larger" }}>
            No Stock Information
          </p>
        )}
 
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
