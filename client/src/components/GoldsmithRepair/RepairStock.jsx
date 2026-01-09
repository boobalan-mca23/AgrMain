import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { TablePagination, Button } from "@mui/material";
import "./Stock.css";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from "@mui/material";

const ProductStock = () => {
  const [stock, setStock] = useState([]);
  const [goldsmiths, setGoldsmiths] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [selectedGoldsmith, setSelectedGoldsmith] = useState("");
  const [reason, setReason] = useState("");           // ⭐ NEW
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchStock();
    fetchGoldsmiths();
  }, []);

  const fetchStock = async () => {
    const res = await axios.get(`${BACKEND_SERVER_URL}/api/productStock`);
    setStock(res.data.allStock || []);
  };

  const fetchGoldsmiths = async () => {
    const res = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
    setGoldsmiths(res.data || []);
  };

  const paginated = stock.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const safeFixed = (v, d = 3) =>
    isNaN(parseFloat(v)) ? "0.000" : parseFloat(v).toFixed(d);

  // ---------- OPEN REPAIR POPUP ----------
  const openSendPopup = (product) => {
    setSelectedProduct(product);
    setSelectedGoldsmith("");
    setReason("");                     // ⭐ reset
    setOpenSendDialog(true);
  };

  // ---------- SEND TO REPAIR ----------
  const handleSend = async () => {
    await axios.post(`${BACKEND_SERVER_URL}/api/repair/send`, {
      source: "GOLDSMITH",
      productId: selectedProduct.id,
      goldsmithId: selectedGoldsmith || null,
      reason: reason || null           // ⭐ send reason
    });

    setOpenSendDialog(false);
    setSelectedGoldsmith("");
    setReason("");
    await fetchStock();
  };

  return (
    <div className="stock-container">
      <h2 className="stock-heading">Product Stock</h2>

      <div className="stock-table-container">
        {paginated.length ? (
          <table className="stock-table">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Item</th>
                <th>Weight</th>
                <th>Purity</th>
                <th>Status</th>
                <th>Send To Repair</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.itemName}</td>
                  <td>{safeFixed(p.netWeight)}</td>
                  <td>{safeFixed(p.finalPurity)}</td>
                  <td>{p.isActive ? "Active" : "Inactive"}</td>

                  <td>
                    {p.isActive ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => openSendPopup(p)}
                      >
                        Send to Repair
                      </Button>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: "center", color: "red" }}>
            No Product Stock Found
          </p>
        )}

        <TablePagination
          component="div"
          count={stock.length}
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
      <Dialog open={openSendDialog} onClose={() => setOpenSendDialog(false)}>
        <DialogTitle>Send Product to Repair</DialogTitle>

        <DialogContent>

        {/* ITEM HEADER */}
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

        {/* ITEM INFO CARD */}
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "15px"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "8px" }}>
            <div><b>Touch</b></div>
            <div>{safeFixed(selectedProduct?.touch)}</div>

            <div><b>Stone Weight (g)</b></div>
            <div>{safeFixed(selectedProduct?.stoneWeight)}</div>

            <div><b>Net Weight (g)</b></div>
            <div>{safeFixed(selectedProduct?.netWeight)}</div>

            <div><b>Wastage Value (g)</b></div>
            <div>{safeFixed(selectedProduct?.wastageValue)}</div>

            <div><b>Wastage Pure (g)</b></div>
            <div>{safeFixed(selectedProduct?.wastagePure)}</div>

            <div><b>Final Purity</b></div>
            <div style={{ fontWeight: "bold", color: "#2e7d32" }}>
              {safeFixed(selectedProduct?.finalPurity)}
            </div>
          </div>
        </div>

        {/* ASSIGN TO GOLDSMITH */}
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

        {/* REASON */}
        <TextField
          fullWidth
          label="Reason for Repair"
          placeholder="Eg. Stone missing / polish / solder break"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          margin="normal"
        />

      </DialogContent>


        <DialogActions>
          <Button onClick={() => setOpenSendDialog(false)}>Cancel</Button>

          {/* disable until filled (optional) */}
          <Button
            variant="contained"
            disabled={!selectedGoldsmith || !reason}
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
