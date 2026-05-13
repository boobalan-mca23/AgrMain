import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { TablePagination, Button, Box, Chip } from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import "./Stock.css";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from "@mui/material";

const Stock = () => {
  const [stockData, setStockData] = useState([]);

  const [page, setPage] = useState(0); 
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [groupPage, setGroupPage] = useState(0);
  const [groupRowsPerPage, setGroupRowsPerPage] = useState(5);

  const [purityPage, setPurityPage] = useState(0);
  const [purityRowsPerPage, setPurityRowsPerPage] = useState(5);

  const [openAddPopup, setOpenAddPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseStocks, setPurchaseStocks] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [addNetWeight, setAddNetWeight] = useState("");
  const [groupedBCPurity, setGroupedBCPurity] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetchUnifiedStock();
    fetchPuritySummary();
  }, []);

  const fetchPuritySummary = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/purchase-entry/purity-summary`);
      setGroupedBCPurity(res.data);
    } catch (err) {
      console.error("Failed to fetch purity summary", err);
    }
  };

  const fetchUnifiedStock = async () => {
    try {
      // Fetch both stocks
      const [prodRes, itemRes] = await Promise.all([
        axios.get(`${BACKEND_SERVER_URL}/api/productStock`),
        axios.get(`${BACKEND_SERVER_URL}/api/item-purchase/stock`)
      ]);

      const products = (prodRes.data.allStock || [])
        .filter(item => item.isActive)
        .map(item => ({ ...item, stockType: "PRODUCT", displayWeight: item.itemWeight }));

      const items = (itemRes.data.allStock || [])
        .map(item => ({ 
          ...item, 
          stockType: "ITEM_PURCHASE", 
          displayWeight: item.grossWeight,
          itemName: item.itemName, // Ensure name is mapped correctly
          wastageValue: item.wastage, // Map backend wastage to wastageValue for display consistency
        }));

      const combined = [...products, ...items].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      });

      setStockData(combined);

      if (isFirstLoad.current && combined.length > 0) {
        const lastPage = Math.floor((combined.length - 1) / rowsPerPage);
        if (lastPage >= 0) {
          setPage(lastPage);
          isFirstLoad.current = false;
        }
      }
    } catch (err) {
      console.error("Failed to fetch stock", err);
    }
  };

  const safeFixed = (num, decimals = 3) => {
    const n = parseFloat(num);
    return isNaN(n) ? "0.000" : n.toFixed(decimals);
  };

  const handleItemSold = async (item) => {
    if (window.confirm('Do you want to mark this item as "Sold"?')) {
      try {
        if (item.stockType === "PRODUCT") {
          await axios.put(`${BACKEND_SERVER_URL}/api/productStock/${item.id}`, {
            isBillProduct: false,
            isActive: false,
          });
        } else {
          await axios.put(`${BACKEND_SERVER_URL}/api/item-purchase/sold/${item.id}`);
        }
        await fetchUnifiedStock();
      } catch (error) {
        console.error("Error marking item as sold:", error);
      }
    }
  };

  const groupByTouch = (stock) => {
    const map = {};
    stock.forEach((item) => {
      const t = (item.touch ?? 0).toString();
      if (!map[t]) {
        map[t] = { touch: item.touch ?? 0, items: [] };
      }
      map[t].items.push(item);
    });

    return Object.values(map).map((g) => {
      const itemWeights = g.items.map((it) => Number(it.displayWeight ?? 0));
      const stoneWeights = g.items.map((it) => Number(it.stoneWeight ?? 0));
      const netWeights = g.items.map((it) => Number(it.netWeight ?? 0));

      const sumItem = itemWeights.reduce((a, b) => a + b, 0);
      const sumStone = stoneWeights.reduce((a, b) => a + b, 0);
      const sumNet = netWeights.reduce((a, b) => a + b, 0);

      const netPurity = (sumNet * (g.touch ?? 0)) / 100;

      return {
        touch: g.touch,
        items: g.items,
        sumItem,
        sumStone,
        sumNet,
        netPurity,
        itemWeightStr: safeFixed(sumItem),
        stoneWeightStr: safeFixed(sumStone),
        netWeightStr: safeFixed(sumNet),
      };
    });
  };

  const grouped = groupByTouch(stockData);

  const paginatedData = stockData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const groupedPaginated = grouped.slice(
    groupPage * groupRowsPerPage,
    groupPage * groupRowsPerPage + groupRowsPerPage
  );

  const purityPaginated = stockData.slice(
    purityPage * purityRowsPerPage,
    purityPage * purityRowsPerPage + purityRowsPerPage
  );

  const totals = useMemo(() => {
    return stockData.reduce((acc, it) => {
      acc.count += (it.count ?? 0);
      acc.netWeight += Number(it.netWeight ?? 0);
      acc.wastagePure += Number(it.wastagePure ?? 0);
      acc.finalPurity += Number(it.finalPurity ?? 0);
      return acc;
    }, { count: 0, netWeight: 0, wastagePure: 0, finalPurity: 0 });
  }, [stockData]);

  const groupedPaginatedTotal = groupedPaginated.reduce(
    (acc, g) => acc + Number(g.netPurity ?? 0),
    0
  );

  const purityPaginatedTotal = purityPaginated.reduce(
    (acc, it) => acc + Number(it.finalPurity ?? 0),
    0
  );

  const openAddWeightPopup = async (product) => {
    try {
      setSelectedProduct(product);
      setOpenAddPopup(true);
      setAddNetWeight("");
      setSelectedPurchase(null);

      const res = await axios.get(`${BACKEND_SERVER_URL}/api/purchase-stock/touch/${product.touch}`);
      const available = res.data.filter(ps => ps.netWeight > 0);
      setPurchaseStocks(available);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAddWeight = async () => {
    const weight = Number(addNetWeight);
    if (!selectedPurchase || weight <= 0) {
      alert("Invalid input");
      return;
    }
    if (weight > selectedPurchase.netWeight) {
      alert("Entered weight exceeds available purchase stock");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      await axios.post(`${BACKEND_SERVER_URL}/api/productStock/add-weight`, {
        stockId: selectedProduct.id,
        stockType: selectedProduct.stockType,
        purchaseStockId: selectedPurchase.id,
        addNetWeight: weight
      });

      setOpenAddPopup(false);
      await fetchUnifiedStock();
      await fetchPuritySummary();
    } catch (err) {
      alert(err.response?.data?.err || "Failed to add weight");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="stock-container">
      <h2 className="stock-heading">Stock Dashboard</h2>
      <div className="stock-summary">
        <div className="stock-card" style={{ padding: "18px" }}>
          <p className="stock-label">Total Item's Count</p>
          <p className="stock-value">{totals.count}</p>
        </div>

        <div className="stock-card">
          <p className="stock-label">Total Weight</p>
          <div className="mini-table-wrapper">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Sno</th>
                  <th>Touch (%)</th>
                  <th>Item Wt (g)</th>
                  <th>Stone Wt (g)</th>
                  <th>Net Wt (g)</th>
                  <th>Net Purity (g)</th>
                </tr>
              </thead>
              <tbody>
                {groupedPaginated.map((g, idx) => (
                  <tr key={idx}>
                    <td>{groupPage * groupRowsPerPage + idx + 1}</td>
                    <td>{g.touch}</td>
                    <td>{g.itemWeightStr}</td>
                    <td>{g.stoneWeightStr}</td>
                    <td>{g.netWeightStr}</td>
                    <td>{safeFixed(g.netPurity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: "right" }}>Total Net Purity</td>
                  <td>{safeFixed(groupedPaginatedTotal)}</td>
                </tr>
              </tfoot>
            </table>
            <TablePagination
              component="div"
              count={grouped.length}
              page={groupPage}
              onPageChange={(e, p) => setGroupPage(p)}
              rowsPerPage={groupRowsPerPage}
              onRowsPerPageChange={(e) => { setGroupRowsPerPage(parseInt(e.target.value, 10)); setGroupPage(0); }}
              rowsPerPageOptions={[5, 10]}
              sx={{ "& .MuiTablePagination-toolbar": { padding: "0 8px" } }}
            />
          </div>
          <p style={{ marginTop: "6px" }}>
            <strong>Total Weight:</strong> <span className="stock-value">{safeFixed(totals.netWeight)}</span>
          </p>
        </div>

        <div className="stock-card" style={{ padding: "18px" }}>
          <p className="stock-label">Total Wastage</p>
          <p className="stock-value">{safeFixed(totals.wastagePure)}</p>
        </div>

        <div className="stock-card">
          <p className="stock-label">Total Purity</p>
          <div className="mini-table-wrapper">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Sno</th>
                  <th>Wastage Value</th>
                  <th>Net Wt (g)</th>
                  <th>Final Purity (g)</th>
                </tr>
              </thead>
              <tbody>
                {purityPaginated.map((it, idx) => (
                  <tr key={it.id}>
                    <td>{purityPage * purityRowsPerPage + idx + 1}</td>
                    <td>{it.wastageValue} ({it.wastageType})</td>
                    <td>{safeFixed(it.netWeight)}</td>
                    <td>{safeFixed(it.finalPurity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: "right" }}>Total Final Purity</td>
                  <td>{safeFixed(purityPaginatedTotal)}</td>
                </tr>
              </tfoot>
            </table>
            <TablePagination
              component="div"
              count={stockData.length}
              page={purityPage}
              onPageChange={(e, p) => setPurityPage(p)}
              rowsPerPage={purityRowsPerPage}
              onRowsPerPageChange={(e) => { setPurityRowsPerPage(parseInt(e.target.value, 10)); setPurityPage(0); }}
              rowsPerPageOptions={[5, 10]}
              sx={{ "& .MuiTablePagination-toolbar": { padding: "0 8px" } }}
            />
          </div>
          <strong>Total Purity:</strong> <span className="stock-value">{safeFixed(totals.finalPurity)}</span>
        </div>

        <div className="stock-card">
          <p className="stock-label">Available BC Purchase</p>
          <div className="mini-table-wrapper">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>SNo</th>
                  <th>Touch (%)</th>
                  <th>Net Weight (g)</th>
                </tr>
              </thead>
              <tbody>
                {groupedBCPurity.length === 0 ? (
                  <tr><td colSpan="3">No Data</td></tr>
                ) : (
                  groupedBCPurity.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.touch}</td>
                      <td>{safeFixed(item.netWeight)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ textAlign: "right" }}>Total</td>
                  <td>{safeFixed(groupedBCPurity.reduce((acc, item) => acc + Number(item.netWeight || 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>ProductName</th>
              <th>Type</th>
              <th>ItemWeight (g)</th>
              <th>Count</th>
              <th>Touch</th>
              <th>StoneWt (g)</th>
              <th>NetWeight (g)</th>
              <th>WastageValue</th>
              <th>WastagePure (g)</th>
              <th>Final Purity (g)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={item.id}>
                <td>{page * rowsPerPage + index + 1}</td>
                <td>{item.itemName}</td>
                <td>
                  <Chip 
                    label={item.stockType === "PRODUCT" ? "PROD" : "ITEM"} 
                    size="small" 
                    color={item.stockType === "PRODUCT" ? "primary" : "secondary"} 
                    variant="outlined"
                  />
                </td>
                <td>{safeFixed(item.displayWeight)}</td>
                <td>{item.count || 0}</td>
                <td>{item.touch ?? 0}</td>
                <td>{safeFixed(item.stoneWeight)}</td>
                <td>{safeFixed(item.netWeight)}</td>
                <td>{item.wastageValue} ({item.wastageType})</td>
                <td>{safeFixed(item.wastagePure)}</td>
                <td>{safeFixed(item.finalPurity)}</td>
                <td>
                  <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddCircleOutline />}
                      onClick={() => openAddWeightPopup(item)}
                    >
                      Add BC
                    </Button>
                    {((item.stockType === "PRODUCT" && item.isBillProduct) || 
                      (item.stockType === "ITEM_PURCHASE" && item.isBilled)) && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => handleItemSold(item)}
                      >
                        Sold
                      </Button>
                    )}
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <TablePagination
          component="div"
          count={stockData.length}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </div>

      <Dialog open={openAddPopup} onClose={() => setOpenAddPopup(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add BC Weight</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <p><strong>Product:</strong> {selectedProduct?.itemName}</p>
            <p><strong>Touch:</strong> {selectedProduct?.touch}%</p>
            <p><strong>Type:</strong> {selectedProduct?.stockType}</p>

            <TextField
              select
              fullWidth
              label="Purchase Stock"
              margin="normal"
              value={selectedPurchase?.id || ""}
              onChange={(e) => setSelectedPurchase(purchaseStocks.find(p => p.id === Number(e.target.value)))}
            >
              {purchaseStocks.map(ps => (
                <MenuItem key={ps.id} value={ps.id}>
                  {ps.jewelName} — Available {safeFixed(ps.netWeight)} g
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Add BC Weight (g)"
              type="number"
              margin="normal"
              value={addNetWeight}
              onChange={(e) => setAddNetWeight(e.target.value)}
            />

            {selectedPurchase && (
              <p style={{ color: Number(addNetWeight || 0) > selectedPurchase.netWeight ? "red" : "gray" }}>
                Remaining: {safeFixed(selectedPurchase.netWeight - Number(addNetWeight || 0))} g
              </p>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddPopup(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAddWeight} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Stock;