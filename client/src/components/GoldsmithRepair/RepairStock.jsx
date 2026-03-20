import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { TablePagination, Button, Tabs, Tab } from "@mui/material";
import "./Stock.css";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Typography,
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProductStock = () => {

  const [tab, setTab] = useState(0);

  const [productStock, setProductStock] = useState([]);
  const [itemPurchaseStock, setItemPurchaseStock] = useState([]);

  const [goldsmiths, setGoldsmiths] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [selectedGoldsmith, setSelectedGoldsmith] = useState("");
  const [reason, setReason] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [repairQC, setRepairQC] = useState({
    touch: 0,
    itemWeight: 0,
    count: 1,
    stoneWeight: 0,
    wastageValue: 0,
    wastageType: null,
    wastagePure: 0,
    netWeight: 0,
    finalPurity: 0,
  });

  const calculatePurity = (qc) => {
    const netWeight = (Number(qc.itemWeight) || 0) - (Number(qc.stoneWeight) || 0);
    const actualPurity = (netWeight * (Number(qc.touch) || 0)) / 100;
    let finalPurity = 0;
    let wastagePure = 0;

    if (qc.wastageType === "Touch") {
      finalPurity = (netWeight * (Number(qc.wastageValue) || 0)) / 100;
      wastagePure = finalPurity - actualPurity;
    } else if (qc.wastageType === "%") {
      const wastageWeight = (netWeight * (Number(qc.wastageValue) || 0)) / 100;
      finalPurity = ((netWeight + wastageWeight) * (Number(qc.touch) || 0)) / 100;
      wastagePure = finalPurity - actualPurity;
    } else if (qc.wastageType === "+") {
      finalPurity = ((netWeight + (Number(qc.wastageValue) || 0)) * (Number(qc.touch) || 0)) / 100;
      wastagePure = finalPurity - actualPurity;
    }

    return { netWeight, actualPurity, finalPurity, wastagePure };
  };

  const {
    netWeight: currentNetWeight,
    actualPurity: currentActualPurity,
    finalPurity: currentFinalPurity,
    wastagePure: currentWastagePure,
  } = calculatePurity(repairQC);

  useEffect(() => {
    fetchProductStock();
    fetchItemPurchaseStock();
    fetchGoldsmiths();
  }, []);

  const fetchProductStock = async () => {
    const res = await axios.get(`${BACKEND_SERVER_URL}/api/productStock`);
    setProductStock(res.data.allStock || []);
  };

  const fetchItemPurchaseStock = async () => {
    const res = await axios.get(`${BACKEND_SERVER_URL}/api/item-purchase/itemstock`);
    setItemPurchaseStock(res.data.allStock || []);
  };

  const fetchGoldsmiths = async () => {
    const res = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
    setGoldsmiths(res.data || []);
  };

  const currentStock = tab === 0 ? productStock : itemPurchaseStock;

  const paginated = currentStock.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const safeFixed = (v, d = 3) =>
    isNaN(parseFloat(v)) ? "0.000" : parseFloat(v).toFixed(d);

  const openSendPopup = (product) => {
    setSelectedProduct(product);
    setSelectedGoldsmith("");
    setReason("");
    setRepairQC({
      itemWeight: product.itemWeight || product.grossWeight || 0,
      touch: product.touch || 0,
      count: product.count || 1,
      stoneWeight: product.stoneWeight || 0,
      wastageValue: product.wastageValue || product.wastage || 0,
      wastageType: product.wastageType || null,
      wastagePure: product.wastagePure || 0,
      netWeight: product.netWeight || 0,
      finalPurity: product.finalPurity || 0,
    });
    setOpenSendDialog(true);
  };

  const handleSend = async () => {
    if (Number(repairQC.count) <= 0) {
      toast.error("Count must be greater than zero");
      return;
    }
    if (Number(repairQC.itemWeight) <= 0) {
      toast.error("Weight must be greater than zero");
      return;
    }

    await axios.post(`${BACKEND_SERVER_URL}/api/repair/send`, {

      source: tab === 0 ? "GOLDSMITH" : "ITEM_PURCHASE",

      productId: selectedProduct.id,

      goldsmithId: selectedGoldsmith || null,

      reason: reason || null,

      repairProduct: {
        ...selectedProduct,
        weight: repairQC.itemWeight,
        count: repairQC.count,
        stoneWeight: repairQC.stoneWeight,
        touch: repairQC.touch,
        wastageValue: repairQC.wastageValue,
        wastageType: repairQC.wastageType,
        wastagePure: currentWastagePure,
        netWeight: currentNetWeight,
        finalPurity: currentFinalPurity,
        actualPurity: currentActualPurity,
      }

    });

    setOpenSendDialog(false);
    setSelectedGoldsmith("");
    setReason("");

    await fetchProductStock();
    await fetchItemPurchaseStock();
  };

  return (
    <div className="stock-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <h2 className="stock-heading">
        Stock Management – Repair Module
      </h2>

      <div className="stock-tabs-wrapper">

        <Tabs
          value={tab}
          onChange={(e, v) => {
            setTab(v);
            setPage(0);
          }}
          variant="fullWidth"
          TabIndicatorProps={{ style: { display: "none" } }}
        >

          <Tab
            label="Product Stock"
            className={tab === 0 ? "stock-tab active-tab" : "stock-tab"}
          />

          <Tab
            label="Item Purchase Stock"
            className={tab === 1 ? "stock-tab active-tab" : "stock-tab"}
          />

        </Tabs>

      </div>

      <div className="stock-table-container">        <table className="stock-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Item Name</th>
              <th>Item Wt (g)</th>
              <th>Stone Wt (g)</th>
              <th>Net Wt (g)</th>
              <th>Touch</th>
              <th>Wastage Val</th>
              <th>Wastage Pure (g)</th>
              <th>Final Purity (g)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length > 0 ? (
              paginated.map((p, i) => (
                <tr key={p.id}>
                  <td>{page * rowsPerPage + i + 1}</td>
                  <td>{p.itemName}</td>
                  <td>{safeFixed(p.itemWeight || p.grossWeight)}</td>
                  <td>{safeFixed(p.stoneWeight)}</td>
                  <td>{safeFixed(p.netWeight)}</td>
                  <td>{p.touch}</td>
                  <td>{p.wastageValue || p.wastage} ({p.wastageType})</td>
                  <td>{safeFixed(p.wastagePure)}</td>
                  <td style={{ fontWeight: "bold" }}>
                    {safeFixed(p.finalPurity)}
                  </td>
                  <td>
                    {p.isActive !== false ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => openSendPopup(p)}
                      >
                        Send to Repair
                      </Button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", color: "red", padding: "20px" }}>
                  {tab === 0 ? "No product data found" : "No item purchase stock data"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <TablePagination
          component="div"
          count={currentStock.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />

      </div>

      {/* SEND TO REPAIR POPUP */}

      <Dialog open={openSendDialog} onClose={() => setOpenSendDialog(false)} maxWidth="xl" fullWidth
        PaperProps={{ sx: { minWidth: 500, maxWidth: 700 } }}>

        <DialogTitle>Send Product to Repair</DialogTitle>

        <DialogContent sx={{ overflow: 'visible' }}>

          <div
            style={{
              borderBottom: "2px solid #ddd",
              marginBottom: "12px",
              paddingBottom: "8px"
            }}
          >
            <h3 style={{ margin: 0, color: "#2e7d32" }}>
              Item Name : {selectedProduct?.itemName}
            </h3>
          </div>

          <table style={{ width: "100%", fontSize: '0.95rem', borderCollapse: 'collapse', marginBottom: '15px' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Field</th>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Original</th>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Edit</th>
                <th style={{ borderBottom: '2px solid #ddd', padding: '8px', textAlign: 'center' }}>Current Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Item Weight (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.itemWeight || selectedProduct?.grossWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={repairQC.itemWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      // if (tab === 0 && val > (selectedProduct?.itemWeight || selectedProduct?.grossWeight || 0)) {
                      //   toast.error("Weight cannot exceed original weight for Product Stock partial repair");
                      //   return;
                      // }
                      setRepairQC({ ...repairQC, itemWeight: e.target.value });
                    }}
                    sx={{ width: '100px' }}
                  />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(repairQC.itemWeight)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Count</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{selectedProduct?.count || 1}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={repairQC.count}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      // if (tab === 0 && val > (selectedProduct?.count || 1)) {
                      //   toast.error("Count cannot exceed original count for Product Stock partial repair");
                      //   return;
                      // }
                      setRepairQC({ ...repairQC, count: e.target.value });
                    }}
                    disabled={tab === 1}
                    sx={{ width: '100px' }}
                  />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {repairQC.count}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Stone Weight (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.stoneWeight)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={repairQC.stoneWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val < 0) {
                        toast.error("Stone weight cannot be negative");
                        return;
                      }
                      setRepairQC({ ...repairQC, stoneWeight: e.target.value });
                    }}
                    sx={{ width: '100px' }}
                  />
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(repairQC.stoneWeight)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Net Weight (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed((Number(selectedProduct?.itemWeight || selectedProduct?.grossWeight) || 0) - (Number(selectedProduct?.stoneWeight) || 0))}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', color: '#888', textAlign: 'center' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(currentNetWeight)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Touch</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.touch)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(repairQC.touch)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Wastage Type</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{selectedProduct?.wastageType || "-"}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {repairQC.wastageType || "-"}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Wastage Value %</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.wastageValue || selectedProduct?.wastage)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', textAlign: 'center' }}>
                  {safeFixed(repairQC.wastageValue)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Wastage Pure (g)</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.wastagePure)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#1976d2', textAlign: 'center' }}>
                  {safeFixed(currentWastagePure)}
                </td>
              </tr>

              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap', textAlign: 'left' }}>Final Purity</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <b>{safeFixed(selectedProduct?.finalPurity)}</b>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#aaa' }}>-</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee', fontWeight: 'bold', color: '#2e7d32', textAlign: 'center' }}>
                  {safeFixed(currentFinalPurity)}
                </td>
              </tr>
            </tbody>
          </table>

          <TextField
            select
            fullWidth
            label="Assign to Goldsmith"
            value={selectedGoldsmith}
            onChange={(e) => setSelectedGoldsmith(e.target.value)}
            margin="normal"
          >
            {goldsmiths.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Reason for Repair"
            placeholder="Eg. Stone missing / polish / etc."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            margin="normal"
          />

        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenSendDialog(false)}>
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={!selectedGoldsmith}
            onClick={handleSend}
          >
            Confirm
          </Button>
        </DialogActions>

      </Dialog>

    </div>
  );
};

export default ProductStock;