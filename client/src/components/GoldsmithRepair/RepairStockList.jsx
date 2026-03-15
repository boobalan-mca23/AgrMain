import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./Stock.css";
import {
  TablePagination,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CloseIcon from "@mui/icons-material/Close";


const RepairStockList = () => {

  const [repairList, setRepairList] = useState([]);
  const [goldsmiths, setGoldsmiths] = useState([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);

  const [selectedRepair, setSelectedRepair] = useState(null);

  const [filterGoldsmith, setFilterGoldsmith] = useState("all");
  const [filterStatus, setFilterStatus] = useState("InRepair");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("PRODUCT");

  const [qc, setQc] = useState({
    itemWeight: 0,
    count: 1,
    stoneWeight: 0,
    netWeight: 0,
    touch: 0,
    wastageType: "%",
    wastageValue: 0,
    originalWastagePure: 0,
    wastageDelta: 0,
    finalPurity: 0
  });

  const netWeight = Math.max(0, Number(qc.itemWeight || 0) - Number(qc.stoneWeight || 0));

  const actualPurity = (netWeight * Number(qc.touch || 0)) / 100;

  const updatedWastagePure = Number(qc.originalWastagePure || 0) + Number(qc.wastageDelta || 0);

  const finalPurity = actualPurity + updatedWastagePure;

  useEffect(() => {
    fetchGoldsmiths();
  }, []);

  useEffect(() => {
    fetchRepairStock();
  }, [filterGoldsmith, filterStatus, dateFrom, dateTo, search, activeTab]);

  const fetchRepairStock = async () => {
    const res = await axios.get(
      `${BACKEND_SERVER_URL}/api/repair`,
      {
        params: {
          status: filterStatus !== "all" ? filterStatus : undefined,
          goldsmith: filterGoldsmith !== "all" ? filterGoldsmith : undefined,
          from: dateFrom ? dateFrom.format("YYYY-MM-DD") : undefined,
          to: dateTo ? dateTo.format("YYYY-MM-DD") : undefined,
          search: search || undefined
        }
      }
    );

    const sorted = [...(res.data?.repairs || [])].sort(
      (a, b) => (a.status === "InRepair" ? -1 : 1)
    );

    setRepairList(sorted);
    setPage(0);
  };

  const fetchGoldsmiths = async () => {
    const res = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
    setGoldsmiths(res.data || []);
  };

  const safeFixed = (v, d = 3) =>
    isNaN(parseFloat(v)) ? "0.000" : parseFloat(v).toFixed(d);

  const filteredRepairs = repairList.filter((r) => {

    if (activeTab === "PRODUCT")
      return r.productId !== null;

    if (activeTab === "ITEM")
      return r.itemPurchaseId !== null;

    return true;

  });

  const paginated = filteredRepairs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const openReceivePopup = (repair) => {

    const p = repair.product || repair.itemPurchase;

    setSelectedRepair(repair);

    setQc({
      itemWeight: p?.itemWeight ?? p?.grossWeight ?? 0,
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

  const handleReceive = async () => {
    await axios.post(`${BACKEND_SERVER_URL}/api/repair/return`, {
      repairId: selectedRepair.id,
      itemWeight: qc.itemWeight,
      stoneWeight: qc.stoneWeight,
      netWeight,
      wastagePure: updatedWastagePure,
      wastageDelta: qc.wastageDelta,
      finalPurity,
      ...qc
    });

    setOpenReceiveDialog(false);
    fetchRepairStock();
  };

  return (
    <div className="stock-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2 className="stock-heading">Repair Stock</h2>

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
            <MenuItem value="all">All</MenuItem>
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
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="InRepair">In Repair</MenuItem>
            <MenuItem value="Returned">Returned</MenuItem>
          </TextField>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From Date"
              value={dateFrom}
              format="DD/MM/YYYY"
              onChange={(newValue) => {
                if (newValue && dateTo && newValue.isAfter(dateTo, "day")) {
                  toast.error("From Date cannot be after To Date");
                  return;
                }
                setDateFrom(newValue);
              }}
              slotProps={{ textField: { size: "small", sx: { width: 260 } } }}
            />
          </LocalizationProvider>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="To Date"
              value={dateTo}
              format="DD/MM/YYYY"
              minDate={dateFrom || undefined}
              onChange={(newValue) => {
                if (newValue && dateFrom && newValue.isBefore(dateFrom, "day")) {
                  toast.error("To Date cannot be before From Date");
                  return;
                }
                setDateTo(newValue);
              }}
              slotProps={{ textField: { size: "small", sx: { width: 260 } } }}
            />
          </LocalizationProvider>

          <TextField
            size="small"
            label="Search item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setFilterGoldsmith("all");
              setFilterStatus("all");
              setDateFrom(null);
              setDateTo(null);
              setSearch("");
            }}
          >
            Reset
          </Button>

        </div>
      </div>

      <div style={{ marginBottom: 15 }}>

        <Button
          variant={activeTab === "PRODUCT" ? "contained" : "outlined"}
          onClick={() => setActiveTab("PRODUCT")}
          style={{ marginRight: 10 }}
        >
          Product Stock
        </Button>

        <Button
          variant={activeTab === "ITEM" ? "contained" : "outlined"}
          onClick={() => setActiveTab("ITEM")}
          style={{ marginRight: 10 }}
        >
          Item Purchase Stock
        </Button>

        {/* <Button
          variant={activeTab === "ALL" ? "contained" : "outlined"}
          onClick={() => setActiveTab("ALL")}
        >
          All
        </Button> */}

      </div>

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
                  <td>{page * rowsPerPage + i + 1}</td>
                  <td>
                    {r.product?.itemName ||
                    r.itemPurchase?.itemName ||
                    r.itemName}
                  </td>
                  <td>{r.goldsmith?.name || "-"}</td>
                  <td>
                    {safeFixed(
                      r.product?.itemWeight ??
                      r.itemPurchase?.grossWeight ??
                      r.itemWeight
                    )}
                  </td>
                  <td>
                    {safeFixed(
                      r.product?.netWeight ??
                      r.itemPurchase?.netWeight ??
                      r.netWeight
                    )}
                  </td>
                  <td>{r.product?.touch ??
                    r.itemPurchase?.touch ??
                    r.touch}
                  </td>
                  <td>
                    {safeFixed(
                      r.product?.finalPurity ??
                      r.itemPurchase?.finalPurity ??
                      r.purity
                    )}
                  </td>
                  <td>{dayjs(r.sentDate).format("DD/MM/YYYY")}</td>
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
          count={filteredRepairs.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </div>

      <Dialog
        open={openReceiveDialog}
        onClose={() => setOpenReceiveDialog(false)}
      >
        <DialogTitle>Return Product to Stock</DialogTitle>

        <DialogContent>
          <h4>
          Item Name :
          {selectedRepair?.product?.itemName ||
          selectedRepair?.itemPurchase?.itemName}
          </h4>

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
                    inputProps={{ min: 0 }}
                    value={qc.itemWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val < 0) {
                        toast.error("Weight cannot be negative");
                        return;
                      }
                      setQc({ ...qc, itemWeight: e.target.value });
                    }}
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
                    inputProps={{ min: 0 }}
                    value={qc.stoneWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val < 0) {
                        toast.error("Stone weight cannot be negative");
                        return;
                      }
                      setQc({ ...qc, stoneWeight: e.target.value });
                    }}
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
