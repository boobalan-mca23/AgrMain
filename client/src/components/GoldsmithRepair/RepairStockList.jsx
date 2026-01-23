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
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // popup states
  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);

  const [selectedRepair, setSelectedRepair] = useState(null);

  // filters (DEFAULT — show ALL history)
  const [filterGoldsmith, setFilterGoldsmith] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const [qc, setQc] = useState({
    itemWeight: 0,
    count: 1,
    stoneWeight: 0,
    netWeight: 0,
    touch: 0,
    wastageType: "",
    wastageValue: 0,
    originalWastagePure: 0, 
    wastageDelta: 0,       
    finalPurity: 0
  });

  const netWeight = Math.max(0,Number(qc.itemWeight || 0) - Number(qc.stoneWeight || 0));

  const actualPurity = (netWeight * Number(qc.touch || 0)) / 100;

  const updatedWastagePure = Number(qc.originalWastagePure || 0) + Number(qc.wastageDelta || 0);

  const finalPurity = actualPurity + updatedWastagePure;

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

  const openReceivePopup = (repair) => {
    const p = repair.product;
    setSelectedRepair(repair);
    console.log("checking p",p)
    setQc({
      itemWeight: p?.itemWeight ?? 0,
      count: p?.count ?? 1,
      stoneWeight: p?.stoneWeight ?? 0,
      netWeight: p?.netWeight ?? 0,
      touch: p?.touch ?? 0,
      wastageType: p?.wastageType ?? "",
      wastageValue: p?.wastageValue ?? 0,

      originalWastagePure: p?.wastagePure ?? 0, 
      wastageDelta: 0,                          

      finalPurity: p?.finalPurity ?? 0
    });

    setOpenReceiveDialog(true);
  };

  // ---------- FINAL CONFIRM ----------
  const handleReceive = async () => {
    await axios.post(`${BACKEND_SERVER_URL}/api/repair/return`, {
      repairId: selectedRepair.id,
      itemWeight: qc.itemWeight,
      stoneWeight: qc.stoneWeight,
      netWeight,
      wastagePure: updatedWastagePure,
      finalPurity
    });

    setOpenReceiveDialog(false);
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
                <th>Item Wt (g)</th>
                <th>Net Wt (g)</th>
                <th>Touch</th>
                <th>Final Purity (g)</th>
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
                  <td>{safeFixed(r.product?.itemWeight ?? r.itemWeight)}</td>
                  <td>{safeFixed(r.product?.netWeight ?? r.netWeight)}</td>
                  <td>{r.product?.touch ?? r.touch}</td>
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
          <h4>Item Name : {selectedRepair?.product?.itemName}</h4>

          <table
            style={{
              width: "100%",
              fontSize: 15,
              borderCollapse: "collapse",
              tableLayout: "fixed"  
            }}
          >

            <tbody>
              <tr>
                <td>Item Weight</td>
                <td><strong>{safeFixed(qc.itemWeight)} g</strong></td>
                <td>
                  <TextField
                    size="small"
                    type="number"
                    value={qc.itemWeight}
                    onChange={(e) =>
                      setQc({ ...qc, itemWeight: e.target.value })
                    }
                  />
                </td>
              </tr>

              <tr>
                <td>Count</td>
                <td><strong>{qc.count}</strong></td>
                <td>—</td>
              </tr>

              <tr>
                <td>Stone Weight</td>
                <td><strong>{safeFixed(qc.stoneWeight)} g</strong></td>
                <td>
                  <TextField
                    size="small"
                    type="number"
                    value={qc.stoneWeight}
                    onChange={(e) =>
                      setQc({ ...qc, stoneWeight: e.target.value })
                    }
                  />
                </td>
              </tr>

              <tr>
                <td>Net Weight</td>
                <td><strong>{safeFixed(netWeight)} g</strong></td>
                <td>—</td>
              </tr>

              <tr>
                <td>Touch</td>
                <td><strong>{qc.touch}</strong></td>
                <td>—</td>
              </tr>

              <tr>
                <td>Actual Purity</td>
                <td><strong>{safeFixed(actualPurity)} g</strong></td>
                <td>—</td>
              </tr>

              <tr>
                <td>Wastage ({qc.wastageType || "-"})</td>
                <td>
                  <strong>
                    {qc.wastageValue}
                  </strong>
                </td>
                <td>—</td>
              </tr>

              <tr>
                <td>Wastage Pure</td>
                <td>
                  <strong>{safeFixed(updatedWastagePure)} g</strong>
                  <div style={{ fontSize: 12, color: "#777" }}>
                  </div>
                </td>
                <td>
                  <TextField
                    size="small"
                    type="number"
                    fullWidth
                    placeholder="+ / - value"
                    value={qc.wastageDelta}
                    onChange={(e) =>
                      setQc({ ...qc, wastageDelta: e.target.value })
                    }
                  />
                </td>
              </tr>

              <tr>
                <td>Final Purity</td>
                <td style={{ color: "#2e7d32" }}>
                  <strong>{safeFixed(finalPurity)} g</strong>
                </td>
                <td>—</td>
              </tr>
            </tbody>
          </table>


        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenReceiveDialog(false)}>Cancel</Button>

          <Button
            variant="contained"
            color="success"
            onClick={handleReceive}
          >
            Confirm & Return to Stock
          </Button>
        </DialogActions>

      </Dialog>

    </div>
  );
};

export default RepairStockList;
