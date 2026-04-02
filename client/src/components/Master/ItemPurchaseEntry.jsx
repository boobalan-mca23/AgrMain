import React, { useEffect, useState } from "react";

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  ButtonGroup,
  MenuItem,
  Typography,
} from "@mui/material";

import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import TablePagination from "@mui/material/TablePagination";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import axios from "axios";

import { BACKEND_SERVER_URL } from "../../Config/Config";

import { ToastContainer, toast } from "react-toastify";

import { useParams, useNavigate } from "react-router-dom";

import "./Masteradditems.css";


const initialForm = {
  advanceGold: "",
  itemName: "",
  grossWeight: "",
  stoneWeight: "",
  netWeight: "",
  touch: "",
  wastageType: "%",
  wastage: "",
  wastagePure: "",
  finalPurity: "",
  goldBalance: "",
  count: 1,
  advanceTouch: "",
};


const round3 = (num) =>
  Number.isFinite(num) ? Number(num.toFixed(3)) : 0;


function ItemPurchaseEntry() {

  const { supplierId } = useParams();

  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);

  const [filteredEntries, setFilteredEntries] = useState([]);

  const [itemFilter, setItemFilter] = useState("");

  const [touchFilter, setTouchFilter] = useState("");

  const [touchOptions, setTouchOptions] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);

  const [isEdit, setIsEdit] = useState(false);

  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState(initialForm);

  const [supplierName, setSupplierName] = useState("");

  const [saving, setSaving] = useState(false);

  // New states for advanced filtering and initial/current toggle
  const [valueView, setValueView] = useState("current"); // "initial" or "current"
  const [statusFilter, setStatusFilter] = useState("In Stock");

  const [rawGoldStock, setRawGoldStock] = useState([]);
  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);
  const [selectedEntryForReceive, setSelectedEntryForReceive] = useState(null);
  const [receiveForm, setReceiveForm] = useState({
    weight: "",
    touch: "",
    date: dayjs().format("YYYY-MM-DD")
  });
  const [isEditReceive, setIsEditReceive] = useState(false);
  const [editReceiveId, setEditReceiveId] = useState(null);

  const [receiveSearch, setReceiveSearch] = useState("");
  const [receivePage, setReceivePage] = useState(0);
  const [receiveRowsPerPage] = useState(5);




  useEffect(() => {
    fetchSupplierName();
    fetchEntries();
    fetchRawGoldStock();
  }, [supplierId]);

  useEffect(() => {
    generateFilterOptions();
    applyFilters();
  }, [entries, itemFilter, touchFilter, statusFilter]);

  const fetchSupplierName = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/supplier/${supplierId}`);
      setSupplierName(res.data.name);
    } catch {
      toast.error("Failed to load supplier");
    }
  };

  const fetchRawGoldStock = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/rawgold`);
      setRawGoldStock(res.data);
    } catch {
      toast.error("Failed to load raw gold stock");
    }
  };

  const openReceiveDialogHandler = (entry) => {
    setSelectedEntryForReceive(entry);
    setReceiveForm({
      weight: "",
      touch: entry.advanceTouch || "",
      date: dayjs().format("YYYY-MM-DD")
    });
    setIsEditReceive(false);
    setEditReceiveId(null);
    setOpenReceiveDialog(true);
  };

  const closeReceiveDialog = () => {
    setOpenReceiveDialog(false);
    setSelectedEntryForReceive(null);
  };

  const handleEditReceiveClick = (record) => {
    setIsEditReceive(true);
    setEditReceiveId(record.id);
    setReceiveForm({
      weight: record.weight,
      touch: record.touch,
      date: dayjs(record.date).format("YYYY-MM-DD")
    });
  };

  const calcTotalReceived = (entry) => {
    if (!entry.receivedGold) return 0;
    return round3(entry.receivedGold.reduce((sum, r) => sum + r.weight, 0));
  };

  const handleReceiveSubmit = async () => {
    if (!receiveForm.weight || !receiveForm.touch) {
      toast.error("Please fill weight and touch");
      return;
    }

    const otherReceived = (selectedEntryForReceive.receivedGold || [])
      .filter(r => r.id !== editReceiveId)
      .reduce((sum, r) => sum + r.weight, 0);
    const pendingBalance = round3(selectedEntryForReceive.goldBalance - otherReceived);

    if (Number(receiveForm.weight) > pendingBalance + 0.001) {
      toast.error("Exceeds pending balance");
      return;
    }

    try {
      const payload = {
        itemPurchaseEntryId: selectedEntryForReceive.id,
        weight: Number(receiveForm.weight),
        touch: Number(receiveForm.touch),
        date: receiveForm.date
      };

      if (isEditReceive) {
        await axios.put(`${BACKEND_SERVER_URL}/api/item-purchase/receive-gold/${editReceiveId}`, payload);
        toast.success("Updated");
      } else {
        await axios.post(`${BACKEND_SERVER_URL}/api/item-purchase/receive-gold`, payload);
        toast.success("Recorded");
      }

      fetchEntries();
      setIsEditReceive(false);
      setEditReceiveId(null);
      setReceiveForm({
        weight: "",
        touch: selectedEntryForReceive.advanceTouch || "",
        date: dayjs().format("YYYY-MM-DD")
      });
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed");
    }
  };

  const handleDeleteReceive = async (receiveId) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await axios.delete(`${BACKEND_SERVER_URL}/api/item-purchase/receive-gold/${receiveId}`);
      toast.success("Deleted");
      fetchEntries();
      if (isEditReceive && editReceiveId === receiveId) {
        setIsEditReceive(false);
        setEditReceiveId(null);
        setReceiveForm({ weight: "", touch: "" });
      }
    } catch {
      toast.error("Failed to delete");
    }
  };




  const fetchEntries = async () => {

    try {

      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/item-purchase?supplierId=${supplierId}`
      );

      setEntries(res.data);

    } catch {

      toast.error("Failed to load entries");

    }

  };

  const generateFilterOptions = () => {

    const touches = [...new Set(entries.map(e => e.touch))];

    setTouchOptions(touches);

  };

  const applyFilters = () => {

    let filtered = [...entries];

    if (itemFilter)
      filtered = filtered.filter(e =>
        e.itemName.toLowerCase().includes(
          itemFilter.toLowerCase()
        )
      );

    if (touchFilter)
      filtered = filtered.filter(e =>
        String(e.touch) === String(touchFilter)
      );

    if (statusFilter !== "All") {
      filtered = filtered.filter(e => {
        const s = (e.repairStocks?.length > 0 || e.isInRepair === true || e.isInRepair === 1 || e.isInRepair === "true") ? "In Repair"
          : (e.moveTo === "REPAIR_RETURN" || e.moveTo === "REPAIRED" || e.moveTo === "repaired") ? "Repaired"
          : (e.moveTo === "CUSTOMER_RETURN" || e.source === "CUSTOMER_RETURN" || e.moveTo === "returned") ? "Returned"
          : (e.isSold || e.isBilled || e.moveTo === "billed" || e.isSold === 1 || e.isSold === "true") ? "Sold"
          : "In Stock";
        return s === statusFilter;
      });
    }

    setFilteredEntries(filtered);

  };


  const clearFilters = () => {

    setItemFilter("");

    setTouchFilter("");

    setStatusFilter("All");

  };


  const recalc = (obj) => {

    const gross = round3(Number(obj.grossWeight) || 0);

    const stone = round3(Number(obj.stoneWeight) || 0);

    const touch = round3(Number(obj.touch) || 0);

    const wastage = round3(Number(obj.wastage) || 0);

    const advance = round3(Number(obj.advanceGold) || 0);

    const netWeight = round3(gross - stone);

    const actualPure = round3((netWeight * touch) / 100);

    let finalPurity = 0;

    if (obj.wastageType === "Touch")
      finalPurity = round3((netWeight * wastage) / 100);

    if (obj.wastageType === "%") {

      const A = round3((netWeight * wastage) / 100);

      const B = round3(A + netWeight);

      finalPurity = round3((B * touch) / 100);

    }

    if (obj.wastageType === "+") {

      const A = round3(netWeight + wastage);

      finalPurity = round3((A * touch) / 100);

    }

    const wastagePure = round3(finalPurity - actualPure);

    // ✅ FIX: calculate only when finalPurity exists
    let goldBalance = obj.goldBalance;

    if (finalPurity > 0)
      goldBalance = round3(advance - finalPurity);

    return {
      netWeight,
      wastagePure,
      finalPurity,
      goldBalance,
    };
  };

  const getRemainingStockDisplay = () => {
    if (!form.advanceTouch) return 0;
    const selectedStock = rawGoldStock.find(r => String(r.touch) === String(form.advanceTouch));
    let availableBalance = selectedStock ? selectedStock.remainingWt : 0;

    if (isEdit && selectedId) {
      const oldEntry = entries.find(e => e.id === selectedId);
      if (oldEntry && String(oldEntry.advanceTouch) === String(form.advanceTouch) && oldEntry.advanceGold) {
        availableBalance += oldEntry.advanceGold;
      }
    }

    const currentAdvance = Number(form.advanceGold) || 0;
    return round3(availableBalance - currentAdvance);
  };


  const handleChange = (field, value) => {

    const updated = { ...form, [field]: value };

    const calculated = recalc(updated);

    setForm({

      ...updated,

      netWeight: calculated.netWeight,

      wastagePure: calculated.wastagePure,

      finalPurity: calculated.finalPurity,

      // ✅ do NOT overwrite manually entered goldBalance unless purity exists
      goldBalance:
        calculated.finalPurity > 0
          ? calculated.goldBalance
          : updated.goldBalance

    });

  };


  const openAddDialog = () => {

    setIsEdit(false);

    setForm(initialForm);

    setOpenDialog(true);

  };


  const openEditDialog = (entry) => {

    setIsEdit(true);

    setSelectedId(entry.id);

    setForm(entry);

    setOpenDialog(true);

  };


  const closeDialog = () => {

    setOpenDialog(false);

  };


  const handleSubmit = async () => {

    const payload = {

      supplierId: Number(supplierId),

      advanceGold: Number(form.advanceGold || 0),

      itemName: form.itemName,

      grossWeight: Number(form.grossWeight),
      stoneWeight: Number(form.stoneWeight || 0),
      netWeight: Number(form.netWeight),
      touch: Number(form.touch),

      wastageType: form.wastageType,

      wastage: Number(form.wastage),

      wastagePure: Number(form.wastagePure),

      finalPurity: Number(form.finalPurity),
      goldBalance: Number(form.goldBalance || 0),
      advanceTouch: form.advanceTouch ? Number(form.advanceTouch) : null,
    };

    if (!payload.itemName || !payload.grossWeight || !payload.touch) {
      toast.error("Please fill all mandatory fields (Item Name, Gross Weight, Touch)");
      return;
    }

    try {

      if (isEdit) {

        await axios.put(
          `${BACKEND_SERVER_URL}/api/item-purchase/${selectedId}`,
          payload
        );

        toast.success("Updated successfully");

      } else {

        await axios.post(
          `${BACKEND_SERVER_URL}/api/item-purchase/create`,
          payload
        );

        toast.success("Added successfully");

      }

      fetchEntries();

      closeDialog();

    } catch {

      toast.error("Failed");

    } finally {

      setSaving(false);

    }

  };


  const handleDelete = async (id) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this Item Purchase?"
      );

    if (!confirmDelete) return;

    try {

      await axios.delete(
        `${BACKEND_SERVER_URL}/api/item-purchase/${id}`
      );

      toast.success("Deleted successfully");

      fetchEntries();

    } catch {

      toast.error("Delete failed");

    }

  };


  return (

    <div>

      <ToastContainer />


      <h2>
        Item Purchase Entry - {supplierName}
      </h2>


      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 20
      }}>

        <Button
          variant="outlined"
          onClick={() =>
            navigate("/master/item-purchase")
          }
        >
          Back
        </Button>


        <Button
          variant="contained"
          onClick={openAddDialog}
        >
          Add Item Purchase
        </Button>

      </div>


      {/* FILTER */}

      <Paper style={{ padding: 15, marginBottom: 15 }}>

        <div style={{ display: "flex", gap: 20 }}>

          {/* Item Name textbox */}

          <TextField
            label="Filter by Item Name"
            size="small"
            value={itemFilter}
            onChange={(e) =>
              setItemFilter(e.target.value)
            }
            variant="outlined"
            style={{ minWidth: 200 }}
          />

          <TextField
            select
            label="Status Filter"
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            variant="outlined"
            style={{ minWidth: 160 }}
          >
            {["All", "In Repair", "Repaired", "Returned", "Sold", "In Stock"].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#555" }}>View:</span>
            <ButtonGroup size="small">
              <Button
                variant={valueView === "initial" ? "contained" : "outlined"}
                onClick={() => setValueView("initial")}
                style={{
                  borderRadius: "20px 0 0 20px",
                  textTransform: "none",
                  fontWeight: valueView === "initial" ? "700" : "500",
                }}
              >
                Initial
              </Button>
              <Button
                variant={valueView === "current" ? "contained" : "outlined"}
                onClick={() => setValueView("current")}
                style={{
                  borderRadius: "0 20px 20px 0",
                  textTransform: "none",
                  fontWeight: valueView === "current" ? "700" : "500",
                }}
              >
                Current
              </Button>
            </ButtonGroup>
          </div>


          {/* Touch dropdown */}

          <TextField
            select
            label="Touch"
            size="small"
            value={touchFilter}
            onChange={(e) =>
              setTouchFilter(e.target.value)
            }
            style={{ minWidth: 150 }}
          >
            <MenuItem value="">All Touches</MenuItem>
            {touchOptions.map(t => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>


          <Button
            variant="outlined"
            size="small"
            sx={{
              height: "40px"
            }}
            onClick={clearFilters}
          >
            Clear
          </Button>

        </div>

      </Paper>

      {/* TABLE */}

      <Paper style={{ overflowX: "auto", marginTop: "60px", marginLeft: "60px", position: "absolute" }}>
        <table
          className="item-list"
          style={{ minWidth: "1400px", width: "100%" }}
        >

          <thead>

            <tr>
              <th>#</th>
              <th>ID</th>
              <th>Item Name</th>
              <th>Count</th>
              <th>Gross Wt. (g)</th>
              <th>Stone Wt. (g)</th>
              <th>Net Wt. (g)</th>
              <th>Touch</th>
              <th>Wastage Value</th>
              <th>Wastage Pure (g)</th>
              <th>Final Purity (g)</th>
              <th>Advance Gold (g)</th>
              <th>Gold Received (g)</th>
              <th>Gold Pending (g)</th>
              <th>Status</th>
              <th>Receipt</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredEntries.length > 0 ? (
              filteredEntries.map((e, i) => {
                const isInitial = valueView === "initial";
                const safeFmt = (val) => {
                  const num = Number(val);
                  return Number.isFinite(num) ? num.toFixed(3) : "0.000";
                };

                const displayGross = safeFmt(isInitial ? (e.initialGrossWeight ?? e.grossWeight) : e.grossWeight);
                const displayStone = safeFmt(isInitial ? (e.initialStoneWeight ?? e.stoneWeight) : e.stoneWeight);
                const displayNet = safeFmt(isInitial ? (e.initialNetWeight ?? e.netWeight) : e.netWeight);
                const displayWastagePure = safeFmt(isInitial ? (e.initialWastagePure ?? e.wastagePure) : e.wastagePure);
                const displayFinal = safeFmt(isInitial ? (e.initialFinalPurity ?? e.finalPurity) : e.finalPurity);
                const displayAdvance = safeFmt(isInitial ? (e.initialAdvanceGold ?? e.advanceGold) : e.advanceGold);
                const displayGoldBalance = safeFmt(isInitial ? (e.initialGoldBalance ?? e.goldBalance) : e.goldBalance);

                return (
                  <tr key={e.id}>
                    <td>{i + 1}</td>
                    <td>{e.id}</td>
                    <td>{e.itemName}</td>
                    <td>{e.count || 1}</td>
                    <td>{displayGross}</td>
                    <td>{displayStone}</td>
                    <td>{displayNet}</td>
                    <td>{safeFmt(e.touch)}</td>
                    <td>{safeFmt(e.wastage)} ({e.wastageType})</td>
                    <td>{displayWastagePure}</td>
                    <td>{displayFinal}</td>
                    <td>{displayAdvance}</td>
                    <td>{safeFmt(calcTotalReceived(e))}</td>
                    <td>{safeFmt(round3(Number(e.goldBalance) - calcTotalReceived(e)))}</td>
                    <td>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor:
                            (e.repairStocks?.length > 0 || e.isInRepair === true || e.isInRepair === 1 || e.isInRepair === "true") ? "#ff9800"
                              : (e.moveTo === "REPAIR_RETURN" || e.moveTo === "REPAIRED" || e.moveTo === "repaired") ? "#fbc02d"
                                : (e.moveTo === "CUSTOMER_RETURN" || e.source === "CUSTOMER_RETURN" || e.moveTo === "returned") ? "#2196f3"
                                  : (e.isSold || e.isBilled || e.moveTo === "billed" || e.isSold === 1 || e.isSold === "true") ? "#4caf50"
                                    : "#9e9e9e",
                          color: "white",
                        }}
                      >
                        {(e.repairStocks?.length > 0 || e.isInRepair === true || e.isInRepair === 1 || e.isInRepair === "true") ? "In Repair"
                          : (e.moveTo === "REPAIR_RETURN" || e.moveTo === "REPAIRED" || e.moveTo === "repaired") ? "Repaired"
                            : (e.moveTo === "CUSTOMER_RETURN" || e.source === "CUSTOMER_RETURN" || e.moveTo === "returned") ? "Returned"
                              : (e.isSold || e.isBilled || e.moveTo === "billed" || e.isSold === 1 || e.isSold === "true") ? "Sold"
                                : "In Stock"}
                      </span>
                    </td>
                    <td>
                      {e.goldBalance - calcTotalReceived(e) > 0.001 ? (
                        <Button
                          variant="contained"
                          size="small"
                          color="secondary"
                          onClick={() => openReceiveDialogHandler(e)}
                        >
                          Record
                        </Button>
                      ) : (
                        <span style={{ fontSize: "12px", color: "gray" }}>Completed</span>
                      )}
                    </td>
                    <td>
                      <EditIcon
                        style={{ cursor: "pointer", marginRight: 8 }}
                        onClick={() => openEditDialog(e)}
                      />
                      <DeleteIcon
                        style={{ cursor: "pointer" }}
                        onClick={() => handleDelete(e.id)}
                      />
                    </td>
                  </tr>
              );
            })
          ) : (
              <tr>
                <td colSpan="15" style={{ textAlign: "center", padding: "20px", fontWeight: "bold", color: "#666" }}>
                  No Item Purchase Entry Added
                </td>
              </tr>
            )}
          </tbody>

        </table>

      </Paper>


      {/* DIALOG */}

      <Dialog open={openDialog} fullWidth>

        <DialogTitle>
          {isEdit ? "Edit Item Purchase" : "Add Item Purchase"}
        </DialogTitle>


        <DialogContent>

          <TextField
            select
            label="Advance Touch (Raw Gold Stock)"
            fullWidth
            margin="dense"
            value={form.advanceTouch}
            onChange={(e) => handleChange("advanceTouch", e.target.value)}
          >
            <MenuItem value="">None (Subtract from Balance)</MenuItem>
            {rawGoldStock.map((s) => (
              <MenuItem key={s.id} value={s.touch}>
                Touch: {s.touch} (Avail: {s.remainingWt}g)
              </MenuItem>
            ))}
          </TextField>

          {form.advanceTouch && (
            <Typography variant="caption" color={getRemainingStockDisplay() < 0 ? "error" : "primary"}>
              Remaining Stock after this entry: {getRemainingStockDisplay()}g
            </Typography>
          )}

          <TextField
            label="Advance Gold (g)"
            fullWidth
            margin="dense"
            value={form.advanceGold}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d*\.?\d*$/.test(value)) {
                handleChange("advanceGold", e.target.value);
              }
            }}
          />


          <TextField
            label="Item Name"
            fullWidth
            margin="dense"
            required
            value={form.itemName}
            onChange={(e) => {
              const value = e.target.value;
              if (/^[a-zA-Z0-9\s]*$/.test(value)) {
                handleChange("itemName", value);
              }
            }}
          />

          <TextField
            label="Count"
            fullWidth
            margin="dense"
            type="number"
            value={form.count}
            onChange={(e) => handleChange("count", e.target.value)}
          />


          <TextField
            label="Gross Weight (g)"
            fullWidth
            margin="dense"
            required
            value={form.grossWeight}
            onChange={(e) =>
              {
              const value = e.target.value;

              if (/^\d*\.?\d*$/.test(value)) {
              handleChange("grossWeight", e.target.value)
              }
            }
            }
          />


          <TextField
            label="Stone Weight (g)"
            fullWidth
            margin="dense"
            value={form.stoneWeight}
            onChange={(e) =>
              {
              const value = e.target.value;

              if (/^\d*\.?\d*$/.test(value)) {
              handleChange("stoneWeight", e.target.value)
              }
            }
            }
          />


          <TextField
            label="Net Weight (g)"
            fullWidth
            margin="dense"
            value={form.netWeight}
            InputProps={{ readOnly: true }}
          />


          <TextField
            label="Touch"
            fullWidth
            required
            margin="dense"
            value={form.touch}
            onChange={(e) =>
              {
              const value = e.target.value;

              if (/^\d*\.?\d*$/.test(value)) {
              handleChange("touch", e.target.value)
              }
            }
            }
          />


          <TextField
            select
            label="Wastage Type"
            fullWidth
            required
            margin="dense"
            SelectProps={{ native: true }}
            value={form.wastageType}
            onChange={(e) =>
              handleChange("wastageType", e.target.value)
            }
          >
            <option value="%">%</option>
            <option value="Touch">Touch</option>
            {/* <option value="+">+</option> */}
          </TextField>


          <TextField
            label="Wastage"
            fullWidth
            margin="dense"
            value={form.wastage}
            onChange={(e) =>
              {
              const value = e.target.value;

              if (/^\d*\.?\d*$/.test(value)) {
              handleChange("wastage", e.target.value)
              }
            }
            }
          />

          <TextField
            label="Wastage Pure (g)"
            fullWidth
            margin="dense"
            value={form.wastagePure}
            InputProps={{ readOnly: true }}
          />

          <TextField
            label="Final Purity (g)"
            fullWidth
            margin="dense"
            value={form.finalPurity}
            InputProps={{ readOnly: true }}
          />


          <TextField
            label="Gold Balance (g)"
            fullWidth
            margin="dense"
            value={form.goldBalance}
            onChange={(e) =>
              {
              const value = e.target.value;

              if (/^\d*\.?\d*$/.test(value)) {
              setForm({
                ...form,
                goldBalance: e.target.value
              })
            }
          }
            }
          />

        </DialogContent>


        <DialogActions>

          <Button onClick={closeDialog}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}
          >
            {isEdit ? "Update" : "Save"}
          </Button>

        </DialogActions>

      </Dialog>


      {/* GOLD RECEIVE DIALOG */}
      <Dialog open={openReceiveDialog} onClose={closeReceiveDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Receive Gold - {selectedEntryForReceive?.itemName} (ID: {selectedEntryForReceive?.id})
          <Typography variant="subtitle2" color="primary">
            Gold Balance to Receive: {selectedEntryForReceive ? round3(selectedEntryForReceive.goldBalance - calcTotalReceived(selectedEntryForReceive)) : 0}g
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Paper elevation={0} style={{ padding: 15, backgroundColor: "#f9f9f9", marginBottom: 20 }}>
            <Typography variant="h6" gutterBottom>{isEditReceive ? "Edit Receipt" : "Record New Receipt"}</Typography>
            <div style={{ display: "flex", gap: 15, alignItems: "flex-start" }}>
              <TextField
                label="Weight (g)"
                size="small"
                value={receiveForm.weight}
                onChange={(e) => setReceiveForm({ ...receiveForm, weight: e.target.value })}
                style={{ width: 150 }}
              />
              <TextField
                label="Touch"
                size="small"
                value={receiveForm.touch}
                onChange={(e) => setReceiveForm({ ...receiveForm, touch: e.target.value })}
                style={{ width: 120 }}
              />
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Date"
                  value={dayjs(receiveForm.date)}
                  onChange={(val) => setReceiveForm({ ...receiveForm, date: val ? val.format("YYYY-MM-DD") : "" })}
                  slotProps={{ textField: { size: 'small', style: { width: 170 } } }}
                  format="DD/MM/YYYY"
                />
              </LocalizationProvider>
              <Button
                variant="contained"
                onClick={handleReceiveSubmit}
                style={{ height: 40 }}
              >
                {isEditReceive ? "Update" : "Save"}
              </Button>
              {isEditReceive && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsEditReceive(false);
                    setEditReceiveId(null);
                    setReceiveForm({ weight: "", touch: selectedEntryForReceive.advanceTouch || "", date: dayjs().format("YYYY-MM-DD") });
                  }}
                  style={{ height: 40 }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </Paper>

          <Typography variant="h6" gutterBottom>Receipt History</Typography>
          <TextField
            placeholder="Search history..."
            size="small"
            fullWidth
            value={receiveSearch}
            onChange={(e) => setReceiveSearch(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <Paper variant="outlined">
            <table className="item-list" style={{ width: "100%", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#eee" }}>
                  <th style={{ padding: "8px" }}>S.No</th>
                  <th style={{ padding: "8px" }}>Date</th>
                  <th style={{ padding: "8px" }}>Weight (g)</th>
                  <th style={{ padding: "8px" }}>Touch</th>
                  <th style={{ padding: "8px" }}>Purity (g)</th>
                  <th style={{ padding: "8px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedEntryForReceive?.receivedGold?.length > 0 ? (
                  selectedEntryForReceive.receivedGold
                    .filter(r => dayjs(r.date).format("DD/MM/YYYY").includes(receiveSearch) || String(r.weight).includes(receiveSearch))
                    .slice(receivePage * receiveRowsPerPage, receivePage * receiveRowsPerPage + receiveRowsPerPage)
                    .map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ padding: "8px" }}>{receivePage * receiveRowsPerPage + i + 1}</td>
                        <td style={{ padding: "8px" }}>{dayjs(r.date).format("DD/MM/YYYY")}</td>
                        <td style={{ padding: "8px" }}>{r.weight.toFixed(3)}</td>
                        <td style={{ padding: "8px" }}>{r.touch.toFixed(2)}</td>
                        <td style={{ padding: "8px" }}>{round3((r.weight * r.touch) / 100).toFixed(3)}</td>
                        <td style={{ padding: "8px" }}>
                          <EditIcon
                            fontSize="small"
                            style={{ cursor: "pointer", marginRight: 10, color: "#1976d2" }}
                            onClick={() => handleEditReceiveClick(r)}
                          />
                          <DeleteIcon
                            fontSize="small"
                            style={{ cursor: "pointer", color: "#d32f2f" }}
                            onClick={() => handleDeleteReceive(r.id)}
                          />
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr><td colSpan="6" align="center" style={{ padding: 10 }}>No receipts found</td></tr>
                )}
              </tbody>
            </table>
            <TablePagination
              rowsPerPageOptions={[5]}
              component="div"
              count={selectedEntryForReceive?.receivedGold?.length || 0}
              rowsPerPage={receiveRowsPerPage}
              page={receivePage}
              onPageChange={(e, p) => setReceivePage(p)}
            />
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReceiveDialog} color="primary">Close</Button>
        </DialogActions>
      </Dialog>

    </div>

  );

}

export default ItemPurchaseEntry;
