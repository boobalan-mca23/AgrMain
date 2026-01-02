import { useState, useEffect,useMemo } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { TablePagination, Button } from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import "./Stock.css";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel
} from "@mui/material";

const Stock = () => {
  const [stockData, setStockData] = useState([]);

  const [page, setPage] = useState(0); // main table page
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // NEW: mini-table pagination for grouped-by-touch table
  const [groupPage, setGroupPage] = useState(0);
  const [groupRowsPerPage, setGroupRowsPerPage] = useState(5);

  // NEW: mini-table pagination for per-item final purity table
  const [purityPage, setPurityPage] = useState(0);
  const [purityRowsPerPage, setPurityRowsPerPage] = useState(5);

  const [openAddPopup, setOpenAddPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseStocks, setPurchaseStocks] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [addNetWeight, setAddNetWeight] = useState("");
  const [isBackchain, setIsBackchain] = useState(false);
  const [backchainPurity, setBackchainPurity] = useState("");

  const paginatedData = stockData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const currentPageTotal = useMemo(() => {
    return paginatedData.reduce(
      (acc, item) => {
        acc.itemWt += Number(item.itemWeight ?? 0);
        acc.finalWt += Number(item.finalPurity ?? 0);
        return acc;
      },
      { itemWt: 0, finalWt: 0 }
    );
  }, [paginatedData]);

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
    const activeOnly = res.data.allStock.filter((item) => item.isActive);
    setStockData(activeOnly);
    console.log("Fetched stock data:", activeOnly);
  };

  const calculatePurity = (touch, netWeight) => {
    const purityValue = (touch * netWeight) / 100;
    return purityValue.toFixed(3);
  };

  const calculatePurityTotal = (stock) => {
    const totalPurity = stock.reduce((acc, item) => {
      return acc + ((item.touch ?? 0) / 100) * (item.netWeight ?? 0);
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

  const handleItemSold = async (id) => {
    if (window.confirm('Do you want to make this item be "Sold"')) {
      stockData.forEach((item) => {
        if (item.id === id) {
          console.log("Found item:", item);
          const updateItem = async () => {
            try {
              const res = await axios.put(
                `${BACKEND_SERVER_URL}/api/productStock/${id}`,
                {
                  isBillProduct: false,
                  isActive: false,
                }
              );
              console.log("Update response:", res.data);
              setStockData((prevData) =>
                prevData.map((it) =>
                  it.id === id ? { ...it, isBillProduct: false } : it
                )
              );
              await fetchProductStock();
            } catch (error) {
              console.error("Error updating item:", error);
            }
          };
          updateItem();
        }
      });
    } else {
      console.log("cancelled");
    }
  };

  // ---------- new helper: group by touch ----------
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
      const itemWeights = g.items.map((it) => Number(it.itemWeight ?? 0));
      const stoneWeights = g.items.map((it) => Number(it.stoneWeight ?? 0));
      const netWeights = g.items.map((it) => Number(it.netWeight ?? 0));

      const sumItem = itemWeights.reduce((a, b) => a + b, 0);
      const sumStone = stoneWeights.reduce((a, b) => a + b, 0);
      const sumNet = netWeights.reduce((a, b) => a + b, 0);

      const netPurity = (sumNet * (g.touch ?? 0)) / 100;

      const itemWeightStr = safeFixed(sumItem) || "0.000";
      const stoneWeightStr = safeFixed(sumStone) || "0.000";
      const netWeightStr = safeFixed(sumNet) || "0.000";

      return {
        touch: g.touch,
        items: g.items,
        sumItem,
        sumStone,
        sumNet,
        netPurity,
        itemWeightStr,
        stoneWeightStr,
        netWeightStr,
      };
    });
  };

  // For total purity mini-table: compute final purity per item as netWeight * wastageValue / 100
  const computeFinalPurityForItem = (item) => {
    const net = Number(item.netWeight ?? 0);
    const wast = Number(item.wastageValue ?? 0);
    return (net * wast) / 100;
  };

// ---------- new helper: group by touch ----------
const grouped = groupByTouch(stockData);

// --------------- NEW: paginated sources for mini-tables ----------------
const groupedPaginated = grouped.slice(
  groupPage * groupRowsPerPage,
  groupPage * groupRowsPerPage + groupRowsPerPage
);

const purityPaginated = stockData.slice(
  purityPage * purityRowsPerPage,
  purityPage * purityRowsPerPage + purityRowsPerPage
);

// --------------- PAGINATED TOTALS (page-wise) ----------------
const groupedPaginatedTotal = groupedPaginated.reduce(
  (acc, g) => acc + Number(g.netPurity ?? 0),
  0
);

const purityPaginatedTotal = purityPaginated.reduce(
  (acc, it) => acc + Number(computeFinalPurityForItem(it) ?? 0),
  0
);

// --------------- GRAND TOTALS (all data) ----------------
const groupedNetPurityTotal = grouped.reduce(
  (acc, g) => acc + (g.netPurity ?? 0),
  0
);

const totalFinalPurity = stockData.reduce(
  (acc, it) => acc + computeFinalPurityForItem(it),
  0
);

// --------------- HANDLERS ----------------
const handleGroupChangePage = (event, newPage) => {
  setGroupPage(newPage);
};
const handleGroupChangeRowsPerPage = (event) => {
  setGroupRowsPerPage(parseInt(event.target.value, 10));
  setGroupPage(0);
};

const handlePurityChangePage = (event, newPage) => {
  setPurityPage(newPage);
};
const handlePurityChangeRowsPerPage = (event) => {
  setPurityRowsPerPage(parseInt(event.target.value, 10));
  setPurityPage(0);
};

const openAddWeightPopup = async (product) => {
  try {
    setSelectedProduct(product);
    setOpenAddPopup(true);
    setAddNetWeight("");
    setSelectedPurchase(null);
    setIsBackchain(false);
    setBackchainPurity("");

    const res = await axios.get(
      `${BACKEND_SERVER_URL}/api/purchase-stock/touch/${product.touch}`
    );

    // show only available stocks
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

  // ✅ Backchain validation
  if (isBackchain) {
    const bcPurity = Number(backchainPurity);

    if (!bcPurity || bcPurity <= 0) {
      alert("Enter valid backchain purity");
      return;
    }

    if (bcPurity >= selectedProduct.touch) {
      alert("Backchain purity must be lower than product purity");
      return;
    }
  }

  try {
    await axios.post(
      `${BACKEND_SERVER_URL}/api/productStock/add-weight`,
      {
        productStockId: selectedProduct.id,
        purchaseStockId: selectedPurchase.id,
        addNetWeight: weight,
        isBackchain,
        backchainPurity: isBackchain ? Number(backchainPurity) : null
      }
    );

    setOpenAddPopup(false);
    await fetchProductStock();
  } catch (err) {
    alert(err.response?.data?.err || "Failed to add weight");
  }
};

  return (
    <div className="stock-container">
      <h2 className="stock-heading">Stock Dashboard</h2>
      {/* <div className="stock-summary">
        
        </div> */}
      <div className="stock-summary">
        <div 
        style={{
          backgroundColor: "#f0f4ff",
          padding: "18px",
          borderRadius: "8px",
          boxShadow: "0 0 6px rgba(0, 0, 0, 0.1)"
        }} 
        // className="stock-card"
        >
          <p className="stock-label">Total Item's Count</p>
          <p className="stock-value">
            {stockData.length > 0 ? (
              <>
                {stockData.reduce((acc, it) => acc + (it.count ?? 0), 0)}
              </>
            ) : (
              0
            )}
          </p>
        </div>

         
        <div className="stock-card">
          <p className="stock-label">Total Weight</p>
        
          {/* --- mini-table: grouped by touch --- */}
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
                {grouped.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center" }}>
                      No data
                    </td>
                  </tr>
                )}
                {groupedPaginated.map((g, idx) => (
                  <tr key={groupPage * groupRowsPerPage + idx}>
                    <td>{groupPage * groupRowsPerPage + idx + 1}</td>
                    <td>{g.touch}</td>
                    <td style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                      {g.itemWeightStr}
                    </td>
                    <td style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                      {g.stoneWeightStr}
                    </td>
                    <td style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                      {g.netWeightStr}
                    </td>
                    <td>{safeFixed(g.netPurity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: "right" }}>
                    <strong>Total Net Purity</strong>
                  </td>
                  <td>
                    <strong>{safeFixed(groupedPaginatedTotal)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* NEW: pagination for grouped mini-table */}
            {grouped.length > 0 && (
              <TablePagination
                component="div"
                count={grouped.length}
                page={groupPage}
                onPageChange={handleGroupChangePage}
                rowsPerPage={groupRowsPerPage}
                onRowsPerPageChange={handleGroupChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
                // keep density small to avoid CSS shift
                sx={{ "& .MuiTablePagination-toolbar": { padding: "0 8px" } }}
              />
            )}
          </div>

          <p style={{ marginTop: "6px" }}>
            <strong>Total Weight:</strong> 
            <span className="stock-value">{calculatePurityTotal(stockData)}</span>
          </p>
        </div>

        <div 
         style={{
          backgroundColor: "#f0f4ff",
          padding: "18px",
          borderRadius: "8px",
          boxShadow: "0 0 6px rgba(0, 0, 0, 0.1)"
         }}
        // className="stock-card"
         >
          <p className="stock-label">Total Wastage </p>
          <p className="stock-value">{calculatewastgePure(stockData)}</p>
        </div>

        <div className="stock-card">
          <p className="stock-label">Total Purity</p>

          {/* --- mini-table: per item final purity using wastage value --- */}
          <div className="mini-table-wrapper">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Sno</th>
                  <th>Wastage Val (%)</th>
                  <th>Net Wt (g)</th>
                  <th>Final Purity (g)</th>
                </tr>
              </thead>
              <tbody>
                {stockData.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center" }}>
                      No data
                    </td>
                  </tr>
                )}
                {purityPaginated.map((it, idx) => {
                  const finalPur = computeFinalPurityForItem(it);
                  const serial = purityPage * purityRowsPerPage + idx + 1;
                  return (
                    <tr key={it.id ?? serial}>
                      <td>{serial}</td>
                      <td>{safeFixed(it.wastageValue)}</td>
                      <td>{safeFixed(it.netWeight)}</td>
                      <td>{safeFixed(finalPur)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: "right" }}>
                    <strong>Total Final Purity</strong>
                  </td>
                  <td>
                    <strong>{safeFixed(purityPaginatedTotal)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* NEW: pagination for per-item final purity mini-table */}
            {stockData.length > 0 && (
              <TablePagination
                component="div"
                count={stockData.length}
                page={purityPage}
                onPageChange={handlePurityChangePage}
                rowsPerPage={purityRowsPerPage}
                onRowsPerPageChange={handlePurityChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{ "& .MuiTablePagination-toolbar": { padding: "0 8px" } }}
              />
            )}
          </div>
            <strong>Total Purity:</strong> 
            <span className="stock-value">{safeFixed(totalFinalPurity)}</span>
  
        </div>
      </div>

      <div className="stock-table-container">
        {paginatedData.length >= 1 ? (
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
              {paginatedData.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.itemName}</td>

                  {/* NOTE: DON'T call handlers during render. See suggested fix below. */}
                  <td>
                    {safeFixed(item.itemWeight)}
                  </td>

                  <td>{item.count || 0}</td>
                  <td>{item.touch ?? 0}</td>
                  <td>{safeFixed(item.stoneWeight)}</td>
                  <td>{safeFixed(item.netWeight)}</td>
                  <td>{safeFixed(item.wastageValue)}</td>
                  <td>{safeFixed(item.wastagePure)}</td>
                  <td>{safeFixed(item.finalPurity)}</td>
                  <td>
                    <>
                      
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddCircleOutline />}
                          onClick={() => openAddWeightPopup(item)}
                          sx={{ mr: 1 }}
                        >
                          Add
                        </Button>
                  

                      {item.isBillProduct && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => handleItemSold(item.id)}
                        >
                          Sold
                        </Button>
                      )}
                    </>

                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>{safeFixed(currentPageTotal.itemWt)}</strong>
                </td>
                <td colSpan={6}></td>
                <td>
                  <strong>{safeFixed(currentPageTotal.finalWt)}</strong>
                </td>
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
      <Dialog
        open={openAddPopup}
        onClose={() => setOpenAddPopup(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Net Weight</DialogTitle>

        <DialogContent>
          <p><strong>Product:</strong> {selectedProduct?.itemName}</p>
          <p><strong>Touch:</strong> {selectedProduct?.touch}%</p>

          <TextField
            select
            fullWidth
            label="Purchase Stock"
            margin="normal"
            value={selectedPurchase?.id || ""}
            onChange={(e) => {
              const ps = purchaseStocks.find(
                p => p.id === Number(e.target.value)
              );
              setSelectedPurchase(ps);
            }}
          >
            {purchaseStocks.map(ps => (
              <MenuItem key={ps.id} value={ps.id}>
                {ps.jewelName} — Available {ps.netWeight} g
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Add Net Weight (g)"
            type="number"
            margin="normal"
            value={addNetWeight}
            onChange={(e) => setAddNetWeight(e.target.value)}
            inputProps={{ min: 0 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isBackchain}
                onChange={(e) => setIsBackchain(e.target.checked)}
              />
            }
            label="Is Backchain"
          />

          {isBackchain && (
            <TextField
              fullWidth
              label="Backchain Purity (%)"
              type="number"
              margin="normal"
              value={backchainPurity}
              onChange={(e) => setBackchainPurity(e.target.value)}
              inputProps={{
                min: 0,
                max: selectedProduct?.touch
              }}
            />
          )}

          {selectedPurchase && (
            <p style={{ color: "gray" }}>
              Available: {selectedPurchase.netWeight} g
            </p>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenAddPopup(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAddWeight}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Stock;