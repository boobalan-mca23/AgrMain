import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { TablePagination, Button, TextField, MenuItem } from "@mui/material";
import "./Stock.css";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";

const RepairStockList = () => {

  const [repairList, setRepairList] = useState([]);
  const [goldsmiths, setGoldsmiths] = useState([]);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // popup states
  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);
  const [openFinalConfirm, setOpenFinalConfirm] = useState(false);

  const [selectedRepair, setSelectedRepair] = useState(null);

  // filters (DEFAULT — show ALL history)
  const [filterGoldsmith, setFilterGoldsmith] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  // ---------- INITIAL LOAD ----------
  useEffect(() => {
    fetchGoldsmiths();
    fetchRepairStock();
  }, []);

  // ---------- FETCH REPAIR STOCK ----------
  const fetchRepairStock = async () => {
    const res = await axios.get(
      `${BACKEND_SERVER_URL}/api/repair`,
      {
        params: {
          status: filterStatus || undefined,
          goldsmith: filterGoldsmith || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          search: search || undefined
        }
      }
    );

    // Sort so active repairs appear first
    const sorted = [...(res.data?.repairs || [])].sort(
      (a, b) => (a.status === "InRepair" ? -1 : 1)
    );

    setRepairList(sorted);
    setPage(0);
  };

  // ---------- FETCH GOLDSMITHS ----------
  const fetchGoldsmiths = async () => {
    const res = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
    setGoldsmiths(res.data || []);
  };

  const safeFixed = (v, d = 3) =>
    isNaN(parseFloat(v)) ? "0.000" : parseFloat(v).toFixed(d);

  // ---------- PAGINATION ----------
  const paginated = repairList.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // ---------- TOTALS ----------
  const totals = paginated.reduce(
    (acc, item) => {
      acc.weight += Number(item?.product?.netWeight ?? item?.netWeight ?? 0);
      acc.purity += Number(item?.product?.finalPurity ?? item?.purity ?? 0);
      return acc;
    },
    { weight: 0, purity: 0 }
  );

  // ---------- OPEN POPUP ----------
  const openReceivePopup = (repair) => {
    setSelectedRepair(repair);
    setOpenReceiveDialog(true);
  };

  // ---------- CONFIRM STEP 1 ----------
  const firstConfirm = () => {
    setOpenReceiveDialog(false);
    setOpenFinalConfirm(true);
  };

  // ---------- FINAL CONFIRM ----------
  const handleReceive = async () => {
    await axios.post(`${BACKEND_SERVER_URL}/api/repair/return`, {
      repairId: selectedRepair.id
    });

    setOpenFinalConfirm(false);
    fetchRepairStock();
  };

  return (
    <div className="stock-container">
      <h2 className="stock-heading">Repair Stock</h2>

      {/* FILTER BAR */}
      <div style={{ marginBottom: "15px" }}>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>

          <TextField
            select
            size="small"
            label="Goldsmith"
            value={filterGoldsmith}
            onChange={(e) => setFilterGoldsmith(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            {goldsmiths.map(g => (
              <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="InRepair">In Repair</MenuItem>
            <MenuItem value="Returned">Returned</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </TextField>

          <TextField
            type="date"
            size="small"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <TextField
            type="date"
            size="small"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

          <TextField
            size="small"
            label="Search item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Button variant="contained" size="small" onClick={fetchRepairStock}>
            Filter
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setFilterGoldsmith("");
              setFilterStatus("");
              setDateFrom("");
              setDateTo("");
              setSearch("");
              fetchRepairStock();
            }}
          >
            Reset
          </Button>

        </div>
      </div>

      {/* TABLE */}
      <div className="stock-table-container">
        {paginated.length ? (
          <table className="stock-table">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Item Name</th>
                <th>Goldsmith</th>
                <th>Net Weight (g)</th>
                <th>Final Purity</th>
                <th>Sent Date</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>{r.product?.itemName || r.itemName}</td>
                  <td>{r.goldsmith?.name || "-"}</td>
                  <td>{safeFixed(r.product?.netWeight ?? r.netWeight)}</td>
                  <td>{safeFixed(r.product?.finalPurity ?? r.purity)}</td>
                  <td>{new Date(r.sentDate).toLocaleDateString()}</td>

                  <td>
                    {r.status === "InRepair" ? (
                      <span style={{ color: "red", fontWeight: "bold" }}>
                        In Repair
                      </span>
                    ) : (
                      <span style={{ color: "green", fontWeight: "bold" }}>
                        Returned
                      </span>
                    )}
                  </td>

                  <td>{r.reason || "-"}</td>

                  <td>
                    {r.status === "InRepair" ? (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => openReceivePopup(r)}
                      >
                        Return to Stock
                      </Button>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <td colSpan={3}><strong>Total</strong></td>
                <td><strong>{safeFixed(totals.weight)}</strong></td>
                <td><strong>{safeFixed(totals.purity)}</strong></td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p style={{ textAlign: "center", color: "red" }}>
            No matching records
          </p>
        )}

        <TablePagination
          component="div"
          count={repairList.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </div>

      {/* CONFIRM 1 */}
      <Dialog
        open={openReceiveDialog}
        onClose={() => setOpenReceiveDialog(false)}
      >
        <DialogTitle>Return Product to Stock</DialogTitle>

        <DialogContent>
          <p>
            Move <b>{selectedRepair?.product?.itemName}</b> back to Product Stock?
          </p>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenReceiveDialog(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={firstConfirm}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRM 2 */}
      <Dialog
        open={openFinalConfirm}
        onClose={() => setOpenFinalConfirm(false)}
      >
        <DialogTitle>⚠ Final Confirmation</DialogTitle>

        <DialogContent>
          <p>
            Are you <b>sure</b> you want to mark
            <br />
            <b>{selectedRepair?.product?.itemName}</b>
            <br />
            as Returned?
          </p>

          <p style={{ color: "red" }}>
            This will activate the item in Product Stock.
          </p>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenFinalConfirm(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleReceive}>
            Yes, Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RepairStockList;
