import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import {
  TablePagination,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  Typography
} from "@mui/material";
import "./Stock.css";
import { toast, ToastContainer } from "react-toastify";

const ItemPurchaseStock = () => {

  const [stockData, setStockData] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [goldsmiths, setGoldsmiths] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [openRepairDialog, setOpenRepairDialog] = useState(false);
  const [openReturnDialog, setOpenReturnDialog] = useState(false);

  const [repairForm, setRepairForm] = useState({
    goldsmithId: "",
    count: 1,
    weight: 0,
    stoneWeight: 0,
    reason: ""
  });

  const [returnForm, setReturnForm] = useState({
    count: 1,
    weight: 0,
    stoneWeight: 0,
    reason: ""
  });


  useEffect(() => {
    fetchStock();
    fetchGoldsmiths();
  }, []);


  const fetchStock = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/item-purchase/stock`);
      setStockData(res.data.allStock);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGoldsmiths = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
      setGoldsmiths(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const markSold = async (id) => {
    if (!window.confirm("Mark item as sold?")) return;
    try {
      await axios.put(`${BACKEND_SERVER_URL}/api/item-purchase/sold/${id}`);
      fetchStock();
    } catch {
      toast.error("Failed to mark as sold");
    }
  };

  const handleOpenRepair = (item) => {
    setSelectedItem(item);
    setRepairForm({
      goldsmithId: "",
      count: item.count || 1,
      weight: item.grossWeight,
      stoneWeight: item.stoneWeight,
      reason: ""
    });
    setOpenRepairDialog(true);
  };

  const handleOpenReturn = (item) => {
    setSelectedItem(item);
    setReturnForm({
      count: item.count || 1,
      weight: item.grossWeight,
      stoneWeight: item.stoneWeight,
      reason: ""
    });
    setOpenReturnDialog(true);
  };

  const submitRepair = async () => {
    if (!repairForm.goldsmithId) {
      toast.warn("Select Goldsmith");
      return;
    }
    try {
      await axios.post(`${BACKEND_SERVER_URL}/api/repair-stock/send`, {
        productId: selectedItem.id,
        goldsmithId: repairForm.goldsmithId,
        reason: repairForm.reason,
        source: "ITEM_PURCHASE",
        repairProduct: {
          count: Number(repairForm.count),
          weight: Number(repairForm.weight),
          stoneWeight: Number(repairForm.stoneWeight)
        }
      });
      toast.success("Sent to repair");
      setOpenRepairDialog(false);
      fetchStock();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send to repair");
    }
  };

  const submitReturn = async () => {
    try {
      await axios.post(`${BACKEND_SERVER_URL}/api/item-purchase/return/${selectedItem.id}`, {
        count: Number(returnForm.count),
        weight: Number(returnForm.weight),
        stoneWeight: Number(returnForm.stoneWeight),
        reason: returnForm.reason
      });
      toast.success("Returned to supplier successfully");
      setOpenReturnDialog(false);
      fetchStock();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to return to supplier");
    }
  };

  const safeFixed = (num) => {
    const n = parseFloat(num);
    return isNaN(n) ? "0.000" : n.toFixed(3);
  };


  // PAGINATION
  const paginatedData = stockData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );


  // SUMMARY CALCULATIONS
  const totals = useMemo(() => {
    return stockData.reduce((acc, item) => {
      acc.items += (item.count || 1);
      acc.weight += Number(item.netWeight || 0);
      acc.wastage += Number(item.wastagePure || 0);
      acc.purity += Number(item.finalPurity || 0);
      return acc;
    }, { items: 0, weight: 0, wastage: 0, purity: 0 });
  }, [stockData]);


  const currentPageTotals = useMemo(() => {
    return paginatedData.reduce((acc, item) => {
      acc.weight += Number(item.netWeight || 0);
      acc.wastage += Number(item.wastagePure || 0);
      acc.purity += Number(item.finalPurity || 0);
      return acc;
    }, { weight: 0, wastage: 0, purity: 0 });
  }, [paginatedData]);


  const handleChangePage = (e, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value));
    setPage(0);
  };


  return (
    <div className="stock-container">
      <ToastContainer position="top-right" autoClose={2000} />
      <h2 className="stock-heading">Item Purchase Stock</h2>

      <div className="stock-summary">
        <div className="stock-card">
          <p>Total Items</p>
          <h3>{totals.items}</h3>
        </div>
        <div className="stock-card">
          <p>Total Net Weight (g)</p>
          <h3>{safeFixed(totals.weight)}</h3>
        </div>
        <div className="stock-card">
          <p>Total Wastage Pure (g)</p>
          <h3>{safeFixed(totals.wastage)}</h3>
        </div>
        <div className="stock-card">
          <p>Total Final Purity (g)</p>
          <h3>{safeFixed(totals.purity)}</h3>
        </div>
      </div>

      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>SNo</th>
              <th>Item Name</th>
              <th>Count</th>
              <th>ItemWeight (g)</th>
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
                <td>{item.count || 1}</td>
                <td>{safeFixed(item.grossWeight)}</td>
                <td>{item.touch}</td>
                <td>{safeFixed(item.stoneWeight)}</td>
                <td>{safeFixed(item.netWeight)}</td>
                <td>{item.wastage} ({item.wastageType})</td>
                <td>{safeFixed(item.wastagePure)}</td>
                <td>{safeFixed(item.finalPurity)}</td>
                <td>
                  <Box sx={{ display: "flex", gap: "5px" }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleOpenRepair(item)}
                    >
                      Repair
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      onClick={() => handleOpenReturn(item)}
                    >
                      Return
                    </Button>
                    {item.isBilled && !item.isSold && (
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => markSold(item.id)}
                      >
                        Sold
                      </Button>
                    )}
                  </Box>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}><strong>Total</strong></td>
              <td><strong>{safeFixed(currentPageTotals.weight)}</strong></td>
              <td></td>
              <td><strong>{safeFixed(currentPageTotals.wastage)}</strong></td>
              <td><strong>{safeFixed(currentPageTotals.purity)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <TablePagination
          component="div"
          count={stockData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </div>

      {/* Repair Dialog */}
      <Dialog open={openRepairDialog} onClose={() => setOpenRepairDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Send to Repair</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body2" color="textSecondary">Item: {selectedItem?.itemName}</Typography>
            <TextField
              select
              label="Select Goldsmith"
              size="small"
              fullWidth
              value={repairForm.goldsmithId}
              onChange={(e) => setRepairForm({ ...repairForm, goldsmithId: e.target.value })}
            >
              {goldsmiths.map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Repair Count"
              size="small"
              type="number"
              value={repairForm.count}
              onChange={(e) => setRepairForm({ ...repairForm, count: e.target.value })}
              helperText={`Available: ${selectedItem?.count || 1}`}
            />
            <TextField
              label="Repair Weight"
              size="small"
              type="number"
              value={repairForm.weight}
              onChange={(e) => setRepairForm({ ...repairForm, weight: e.target.value })}
            />
            <TextField
              label="Stone Weight"
              size="small"
              type="number"
              value={repairForm.stoneWeight}
              onChange={(e) => setRepairForm({ ...repairForm, stoneWeight: e.target.value })}
            />
            <TextField
              label="Reason"
              size="small"
              multiline
              rows={2}
              value={repairForm.reason}
              onChange={(e) => setRepairForm({ ...repairForm, reason: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRepairDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitRepair}>Send</Button>
        </DialogActions>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={openReturnDialog} onClose={() => setOpenReturnDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Return Purchased Item</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body2" color="textSecondary">Item: {selectedItem?.itemName}</Typography>
            <TextField
              label="Return Count"
              size="small"
              type="number"
              value={returnForm.count}
              onChange={(e) => setReturnForm({ ...returnForm, count: e.target.value })}
              helperText={`Available: ${selectedItem?.count || 1}`}
            />
            <TextField
              label="Return Weight"
              size="small"
              type="number"
              value={returnForm.weight}
              onChange={(e) => setReturnForm({ ...returnForm, weight: e.target.value })}
            />
            <TextField
              label="Stone Weight"
              size="small"
              type="number"
              value={returnForm.stoneWeight}
              onChange={(e) => setReturnForm({ ...returnForm, stoneWeight: e.target.value })}
            />
            <TextField
              label="Reason"
              size="small"
              multiline
              rows={2}
              value={returnForm.reason}
              onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReturnDialog(false)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={submitReturn}>Return</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ItemPurchaseStock;