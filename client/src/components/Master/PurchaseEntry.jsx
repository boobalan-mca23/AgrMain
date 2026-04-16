import React, { useEffect, useState } from "react";

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  TablePagination,
  Autocomplete,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import axios from "axios";

import { BACKEND_SERVER_URL } from "../../Config/Config";

import { ToastContainer, toast } from "react-toastify";

import { useParams, useNavigate } from "react-router-dom";

import "./Masteradditems.css";


const initialForm = {
  advanceGold: "",
  advanceTouch: "",
  jewelName: "",
  grossWeight: "",
  stoneWeight: "",
  netWeight: "",
  touch: "",
  wastageType: "%",
  wastage: "",
  wastagePure: "",
  finalPurity: "",
  goldBalance: "",
};


const round3 = (num) =>
  Number.isFinite(num) ? Number(num.toFixed(3)) : 0;

const safeFmt = (val) => {
  const num = Number(val);
  return Number.isFinite(num) ? num.toFixed(3) : "0.000";
};

function PurchaseEntry() {

  const { supplierId } = useParams();

  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);

  const [filteredEntries, setFilteredEntries] = useState([]);

  const [jewelFilter, setJewelFilter] = useState("");

  const [touchFilter, setTouchFilter] = useState("");

  const [touchOptions, setTouchOptions] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);

  const [isEdit, setIsEdit] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [form, setForm] = useState(initialForm);

  const [supplierName, setSupplierName] = useState("");

  const [rawGoldStock, setRawGoldStock] = useState([]);
  const [masterTouchList, setMasterTouchList] = useState([]);

  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);
  const [selectedEntryForReceive, setSelectedEntryForReceive] = useState(null);
  const [receiveForm, setReceiveForm] = useState({
    amount: "",
    weight: "",
    touch: "",
    date: dayjs().format('YYYY-MM-DD')
  });
  const [isEditReceive, setIsEditReceive] = useState(false);
  const [editReceiveId, setEditReceiveId] = useState(null);
  const [receiveSearch, setReceiveSearch] = useState("");
  const [receivePage, setReceivePage] = useState(0);
  const [receiveRowsPerPage, setReceiveRowsPerPage] = useState(5);

  useEffect(() => {
    fetchSupplierName();
    fetchEntries();
    fetchRawGoldStock();
    fetchMasterTouchList();
  }, [supplierId]);

  const fetchMasterTouchList = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
      setMasterTouchList(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMasterTouchList([]);
    }
  };


  useEffect(() => {
    generateFilterOptions();
    applyFilters();
  }, [entries, jewelFilter, touchFilter]);


  const fetchSupplierName = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/supplier/${supplierId}`
      );
      setSupplierName(res.data.name);
    } catch {
      toast.error("Failed to load supplier");
    }
  };


  const fetchEntries = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/purchase-entry?supplierId=${supplierId}`
      );
      setEntries(res.data);
      if (selectedEntryForReceive) {
        const refreshed = res.data.find(e => e.id === selectedEntryForReceive.id);
        if (refreshed) setSelectedEntryForReceive(refreshed);
      }
    } catch {
      toast.error("Failed to load entries");
    }
  };

  const fetchRawGoldStock = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/rawgold`);
      setRawGoldStock(res.data.allRawGold || []);
    } catch {
      console.error("Failed to load raw gold stock");
    }
  };


  const generateFilterOptions = () => {
    const touches = [...new Set(entries.map(e => e.touch))];
    setTouchOptions(touches);
  };


  const applyFilters = () => {

    let filtered = [...entries];

    if (jewelFilter)
      filtered = filtered.filter(e =>
        e.jewelName.toLowerCase().includes(jewelFilter.toLowerCase())
      );

    if (touchFilter)
      filtered = filtered.filter(e =>
        String(e.touch) === String(touchFilter)
      );

    setFilteredEntries(filtered);
  };


  const clearFilters = () => {
    setJewelFilter("");
    setTouchFilter("");
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

    // ✅ ONLY calculate goldBalance when finalPurity exists
    let goldBalance = obj.goldBalance;

    if (finalPurity > 0) {
      goldBalance = round3(advance - finalPurity);
    }

    return {
      netWeight,
      wastagePure,
      finalPurity,
      goldBalance,
    };

  };

  const handleChange = (field, value) => {

    const updated = { ...form, [field]: value };

    Object.assign(updated, recalc(updated));

    setForm(updated);
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

  const openReceiveDialogHandler = (entry) => {
    setSelectedEntryForReceive(entry);
    setReceiveForm({
      amount: "",
      weight: "",
      touch: entry.advanceTouch || "",
      date: dayjs().format('YYYY-MM-DD')
    });
    setOpenReceiveDialog(true);
    setIsEditReceive(false);
    setEditReceiveId(null);
    setReceiveSearch("");
    setReceivePage(0);
  };

  const closeReceiveDialog = () => {
    setOpenReceiveDialog(false);
    setSelectedEntryForReceive(null);
  };

  const handleSaveReceive = async () => {
    if (!receiveForm.amount && !receiveForm.weight) {
      toast.error("Please fill weight or amount");
      return;
    }
    if (!receiveForm.touch) {
      toast.error("Please select touch");
      return;
    }

    const pendingBalance = round3(selectedEntryForReceive.goldBalance - calcTotalReceived(selectedEntryForReceive));
    const weightToReceive = Number(receiveForm.weight);

    if (weightToReceive > pendingBalance + 0.001) {
      toast.error("Cannot receive more than pending balance");
      return;
    }

    try {
      await axios.post(`${BACKEND_SERVER_URL}/api/purchase-entry/receive-gold`, {
        purchaseEntryId: selectedEntryForReceive.id,
        amount: Number(receiveForm.amount),
        weight: Number(receiveForm.weight),
        touch: Number(receiveForm.touch),
        date: receiveForm.date
      });
      toast.success("Gold received and added to stock");
      fetchEntries();
      fetchRawGoldStock();
      setReceiveForm(prev => ({ ...prev, amount: "", weight: "" })); // Reset weight after save
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to receive gold");
    }
  };

  const handleDeleteReceive = async (receiveId) => {
    if (!window.confirm("Are you sure you want to delete this receive record?")) return;
    try {
      await axios.delete(`${BACKEND_SERVER_URL}/api/purchase-entry/receive-gold/${receiveId}`);
      toast.success("Receive record deleted");
      fetchEntries();
      fetchRawGoldStock();
      if (isEditReceive && editReceiveId === receiveId) {
        setIsEditReceive(false);
        setEditReceiveId(null);
        setReceiveForm({ amount: "", weight: "", touch: "" });
      }
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleEditReceiveClick = (record) => {
    setIsEditReceive(true);
    setEditReceiveId(record.id);
    setReceiveForm({
      amount: record.amount || "",
      weight: record.weight,
      touch: record.touch,
      date: dayjs(record.date).format('YYYY-MM-DD')
    });
  };

  const handleUpdateReceive = async () => {
    if (!receiveForm.touch || !receiveForm.date) {
      toast.error("Please fill touch and date");
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
      await axios.put(`${BACKEND_SERVER_URL}/api/purchase-entry/receive-gold/${editReceiveId}`, {
        amount: Number(receiveForm.amount),
        weight: Number(receiveForm.weight),
        touch: Number(receiveForm.touch),
        date: receiveForm.date
      });
      toast.success("Receipt updated");
      fetchEntries();
      fetchRawGoldStock();
      setIsEditReceive(false);
      setEditReceiveId(null);
      setReceiveForm({
        amount: "",
        weight: "",
        touch: selectedEntryForReceive.advanceTouch || "",
        date: dayjs().format('YYYY-MM-DD')
      });
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to update");
    }
  };

  const calcTotalReceived = (entry) => {
    return round3((entry.receivedGold || []).reduce((sum, r) => sum + r.weight, 0));
  };

  const openAddDialog = () => {

    setIsEdit(false);
    setSelectedId(null);
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

      advanceTouch: form.advanceTouch ? Number(form.advanceTouch) : null,

      jewelName: form.jewelName,

      grossWeight: Number(form.grossWeight),

      stoneWeight: Number(form.stoneWeight),

      netWeight: Number(form.netWeight),

      touch: Number(form.touch),

      wastageType: form.wastageType,

      wastage: Number(form.wastage),

      wastagePure: Number(form.wastagePure),

      finalPurity: Number(form.finalPurity),

      goldBalance: Number(form.goldBalance || 0),
      moveTo: "purchase"
    };

    if (!payload.jewelName && !payload.grossWeight && !payload.advanceGold) {
      toast.error("Please fill at least one field (Jewel Name, Gross Weight, or Advance Gold)");
      return;
    }

    if (payload.advanceGold > 0 && !payload.advanceTouch) {
      toast.error("Please select an Advance Gold Touch");
      return;
    }

    if (payload.advanceGold > 0 && payload.advanceTouch) {
      const selectedStock = rawGoldStock.find(r => r.touch == payload.advanceTouch);
      let availableBalance = selectedStock ? selectedStock.remainingWt : 0;

      if (isEdit) {
        const oldEntry = entries.find(e => e.id === selectedId);
        if (oldEntry && oldEntry.advanceTouch === payload.advanceTouch && oldEntry.advanceGold) {
          availableBalance += oldEntry.advanceGold;
        }
      }

      if (payload.advanceGold > availableBalance) {
        toast.error(`Insufficient Raw Gold Stock. Available: ${round3(availableBalance)}g, Required: ${payload.advanceGold}g`);
        return;
      }
    }

    try {

      if (isEdit) {

        await axios.put(
          `${BACKEND_SERVER_URL}/api/purchase-entry/${selectedId}`,
          payload
        );

        toast.success("Updated");

      } else {

        await axios.post(
          `${BACKEND_SERVER_URL}/api/purchase-entry/create`,
          payload
        );

        toast.success("Added");
      }

      const touchNum = Number(form.touch);
      if (touchNum > 0) {
        const alreadyExists = masterTouchList.some(
          (t) => Number(t.touch) === touchNum
        );
        if (!alreadyExists) {
          try {
            await axios.post(`${BACKEND_SERVER_URL}/api/master-touch/create`, { touch: touchNum });
          } catch { /* silent — touch save is non-critical */ }
        }
      }

      fetchEntries();
      fetchRawGoldStock();
      fetchMasterTouchList();
      closeDialog();

    } catch {

      toast.error("Failed");

    }

  };


  const handleDelete = async (id) => {

    if (!window.confirm("Are you sure you want to delete this purchase entry?"))
      return;

    try {

      await axios.delete(
        `${BACKEND_SERVER_URL}/api/purchase-entry/${id}`
      );

      toast.success("Deleted");

      fetchEntries();

    } catch {

      toast.error("Delete failed");

    }

  };


  return (

    <div>

      <ToastContainer />

      <h2>BC Purchase Entry - {supplierName}</h2>

      <div style={{
        display: "flex",
        gap: 20,
        marginBottom: 20,
        flexWrap: "wrap"
      }}>
        <Paper style={{
          padding: "15px 25px",
          backgroundColor: "#1976d2",
          color: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: "200px"
        }}>
          <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>Total BC Balance</span>
          <span style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
            {safeFmt(filteredEntries.reduce((sum, e) => sum + round3(Number(e.goldBalance) - calcTotalReceived(e)), 0))}g
          </span>
        </Paper>
      </div>


      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 20
      }}>

        <Button
          variant="outlined"
          onClick={() => navigate("/master/purchase-entry")}
        >
          Back
        </Button>


        <Button
          variant="contained"
          onClick={openAddDialog}
        >
          Add BC Purchase
        </Button>

      </div>


      {/* FILTER */}

      <Paper style={{ padding: 15, marginBottom: 15 }}>

        <div style={{ display: "flex", gap: 20 }}>

          <TextField
            label="Filter by Jewel Name"
            size="small"
            value={jewelFilter}
            onChange={(e) => setJewelFilter(e.target.value)}
          />


          <TextField
            select
            size="small"
            value={touchFilter}
            onChange={(e) => setTouchFilter(e.target.value)}
            SelectProps={{ native: true }}
            style={{ minWidth: 150 }}
          >

            <option value="">Filter by Touch</option>

            {touchOptions.map(t => (
              <option key={t} value={t}>{t}</option>
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

      <Paper style={{ overflowX: "auto", marginTop: "20px" }}>
        <table
          className="item-list"
          style={{ width: "100%" }}
        >

          <thead>

            <tr>

              <th>S.No</th>

              <th>Jewel</th>

              <th>Gross wt. (g)</th>

              <th>Stone wt. (g)</th>

              <th>Net wt. (g)</th>

              <th>Touch</th>

              <th>Wastage Value (g)</th>

              <th>Wastage Pure (g)</th>

              <th>Final Purity (g)</th>
 
              <th>Adv. Gold (g)</th>

              <th>Adv. Touch</th>

              <th>Gold Balance (g)</th>

              <th>Action</th>

            </tr>

          </thead>


          <tbody>
            {filteredEntries.length > 0 ? (
              filteredEntries
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((e, index) => (
                  <tr key={e.id}>
                    <td>{page * rowsPerPage + index + 1}</td>
                    <td>{e.jewelName}</td>
                    <td>{safeFmt(e.grossWeight)}</td>
                    <td>{safeFmt(e.stoneWeight)}</td>
                    <td>
                      {safeFmt(e.netWeight)}
                      <br />
                      <span style={{ color: "red", fontSize: "0.85em" }}>
                        Used: {safeFmt(e.netWeight - (e.stock?.length > 0 ? e.stock[0].netWeight : 0))}g
                      </span>
                      <br />
                      <span style={{ color: "green", fontSize: "0.85em" }}>
                        Balance: {safeFmt(e.stock?.length > 0 ? e.stock[0].netWeight : 0)}g
                      </span>
                    </td>
                    <td>{safeFmt(e.touch)}</td>
                    <td>{safeFmt(e.wastage)} ({e.wastageType})</td>
                    <td>{safeFmt(e.wastagePure)}</td>
                    <td>{safeFmt(e.finalPurity)}</td>
                    <td>{safeFmt(e.advanceGold)}</td>
                    <td>{e.advanceTouch ? safeFmt(e.advanceTouch) : "-"}</td>
                    <td style={{ minWidth: "120px", textAlign: "center" }}>
                      {safeFmt(e.goldBalance)}
                      {calcTotalReceived(e) > 0 && (
                        <div style={{ fontSize: "0.85em", color: "#1976d2", marginTop: "4px" }}>
                          Received: {safeFmt(calcTotalReceived(e))}g
                          <br />
                          <b>Pending: {safeFmt(round3(e.goldBalance - calcTotalReceived(e)))}g</b>
                        </div>
                      )}
                      <Button
                        size="small"
                        variant="outlined"
                        style={{ marginTop: "8px", fontSize: "0.7rem", padding: "2px 5px", margin: "8px auto 0", display: "block" }}
                        onClick={() => openReceiveDialogHandler(e)}
                      >
                        Receive
                      </Button>
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
                ))
            ) : (
              <tr>
                <td colSpan="13" style={{ textAlign: "center", padding: "20px", fontWeight: "bold", color: "#666" }}>
                  No BC Purchase Entry Added
                </td>
              </tr>
            )}
          </tbody>

        </table>
        <TablePagination
          component="div"
          count={filteredEntries.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Rows per page:"
        />
      </Paper>


      {/* DIALOG */}

      <Dialog open={openDialog} fullWidth>

        <DialogTitle>
          {isEdit ? "Edit Purchase Entry" : "Add Purchase Entry"}
        </DialogTitle>


        <DialogContent>

          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "8px" }}>
            <TextField
              label="Advance Gold (g)"
              fullWidth
              margin="dense"
              style={{ marginTop: 0, marginBottom: 0 }}
              value={form.advanceGold}
              onChange={(e) => {
                const value = e.target.value;

                if (/^\d*\.?\d*$/.test(value)) {
                  handleChange("advanceGold", e.target.value)
                }
              }}
            />

            <TextField
              select
              label="Advance Gold Touch"
              fullWidth
              margin="dense"
              style={{ marginTop: 0, marginBottom: 0 }}
              value={form.advanceTouch}
              onChange={(e) => handleChange("advanceTouch", e.target.value)}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
            >
              <option value="">Select Touch</option>
              {rawGoldStock.map((stock) => (
                <option key={stock.id} value={stock.touch}>
                  {stock.touch}
                </option>
              ))}
            </TextField>
          </div>

          <div style={{
            height: "20px",
            color: form.advanceTouch ? (getRemainingStockDisplay() < 0 ? "#d32f2f" : "#1976d2") : "inherit",
            fontWeight: form.advanceTouch ? "bold" : "normal",
            fontSize: "0.85rem",
            marginLeft: "4px",
            marginBottom: "12px",
            marginTop: "4px"
          }}>
            {form.advanceTouch
              ? `Remaining Raw Gold : ${getRemainingStockDisplay()}g`
              : "Select a touch point to view raw gold balance"}
          </div>

          <TextField
            label="Jewel Name"
            fullWidth
            margin="dense"
            value={form.jewelName}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || /^[a-zA-Z0-9\s]*$/.test(value)) {
                handleChange("jewelName", value);
              }
            }}
          />

          <TextField
            label="Gross Weight (g)"
            fullWidth
            margin="dense"
            value={form.grossWeight}
            onChange={(e) => {
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
            onChange={(e) => {
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

          <Autocomplete
            freeSolo
            forcePopupIcon
            options={masterTouchList.map((t) => String(t.touch))}
            value={String(form.touch || "")}
            onChange={(event, newValue) => {
              const val = newValue || "";
              if (/^\d*\.?\d*$/.test(val)) handleChange("touch", val);
            }}
            onInputChange={(event, newInputValue) => {
              if (/^\d*\.?\d*$/.test(newInputValue)) handleChange("touch", newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Touch"
                fullWidth
                margin="dense"
              />
            )}
          />

          {/* ✅ Wastage Type */}
          <TextField
            select
            label="Wastage Type"
            fullWidth
            margin="dense"
            value={form.wastageType}
            onChange={(e) =>
              handleChange("wastageType", e.target.value)
            }
            SelectProps={{ native: true }}
          >
            <option value="%">%</option>
            <option value="Touch">Touch</option>
            {/* <option value="+">+</option> */}
          </TextField>

          <TextField
            label={
              form.wastageType === "%"
                ? "Wastage (%)"
                : "Wastage (g)"
            }
            fullWidth
            margin="dense"
            value={form.wastage}
            onChange={(e) => {
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
            onChange={(e) => {
              const value = e.target.value;

              if (/^\d*\.?\d*$/.test(value)) {
                setForm({
                  ...form,
                  goldBalance: value
                })
              }
            }}
          />

        </DialogContent>

        <DialogActions>

          <Button onClick={closeDialog}>
            Cancel
          </Button>


          <Button variant="contained" onClick={handleSubmit}>
            {isEdit ? "Update" : "Save"}
          </Button>

        </DialogActions>

      </Dialog>

      {/* RECEIVE GOLD DIALOG */}
      <Dialog open={openReceiveDialog} onClose={closeReceiveDialog} fullWidth maxWidth="xs">
        <DialogTitle>Receive Gold from Supplier</DialogTitle>
        <DialogContent>
          <div style={{ margin: "10px 0", fontSize: "0.95rem", lineHeight: "1.6" }}>
            <b>Supplier:</b> {selectedEntryForReceive?.supplierName} <br />
            <b>Total Gold Balance:</b> {selectedEntryForReceive?.goldBalance}g <br />
            <b>Already Received:</b> {calcTotalReceived(selectedEntryForReceive || {})}g <br />
            <b style={{ color: "blue" }}>Pending Balance :</b> {round3(
              (selectedEntryForReceive?.goldBalance || 0) -
              ((selectedEntryForReceive?.receivedGold || []).filter(r => r.id !== editReceiveId).reduce((sum, r) => sum + r.weight, 0)) -
              (Number(receiveForm.weight) || 0)
            )}g
          </div>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Receipt Date"
              value={dayjs(receiveForm.date)}
              onChange={(newValue) => setReceiveForm({ ...receiveForm, date: newValue?.format('YYYY-MM-DD') })}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: "dense",
                  variant: "outlined"
                }
              }}
            />
          </LocalizationProvider>

          <TextField
            label="Gold Weight (g)"
            fullWidth
            margin="dense"
            variant="outlined"
            value={receiveForm.amount}
            onChange={(e) => {
              const amt = e.target.value;
              const tc = receiveForm.touch;
              const wt = (Number(amt) * Number(tc)) / 100;
              setReceiveForm({
                ...receiveForm,
                amount: amt,
                weight: round3(wt) || ""
              });
            }}
          />

          <TextField
            label="Pure Gold (g)"
            fullWidth
            margin="dense"
            variant="outlined"
            value={receiveForm.weight}
            InputProps={{ readOnly: true }}
            error={Number(receiveForm.weight) > round3((selectedEntryForReceive?.goldBalance || 0) - ((selectedEntryForReceive?.receivedGold || []).filter(r => r.id !== editReceiveId).reduce((sum, r) => sum + r.weight, 0))) + 0.001}
            helperText={
              Number(receiveForm.weight) > round3((selectedEntryForReceive?.goldBalance || 0) - ((selectedEntryForReceive?.receivedGold || []).filter(r => r.id !== editReceiveId).reduce((sum, r) => sum + r.weight, 0))) + 0.001
                ? "Exceeds pending balance"
                : ""
            }
          />

          <TextField
            select
            label="Receive to Raw Gold Touch"
            fullWidth
            margin="dense"
            variant="outlined"
            value={receiveForm.touch}
            onChange={(e) => {
              const tc = e.target.value;
              const amt = receiveForm.amount;
              const wt = (Number(amt) * Number(tc)) / 100;
              setReceiveForm({
                ...receiveForm,
                touch: tc,
                weight: round3(wt) || ""
              });
            }}
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
          >
            <option value="">Select Touch</option>
            {rawGoldStock.map((s) => (
              <option key={s.id} value={s.touch}>
                {s.touch} (Stock Bal: {round3(s.remainingWt)}g)
              </option>
            ))}
          </TextField>

          {selectedEntryForReceive?.receivedGold?.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                <h4 style={{ margin: 0 }}>Receipt History</h4>
                <TextField
                  placeholder="Search..."
                  size="small"
                  sx={{ width: "120px", '& .MuiInputBase-input': { fontSize: '0.75rem', padding: '4px 8px' } }}
                  value={receiveSearch}
                  onChange={(e) => {
                    setReceiveSearch(e.target.value);
                    setReceivePage(0);
                  }}
                />
              </div>
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5" }}>
                      <th style={{ padding: "8px", textAlign: "left" }}>S.No</th>
                      <th style={{ padding: "8px", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "8px", textAlign: "left" }}>Amount</th>
                      <th style={{ padding: "8px", textAlign: "left" }}>Pure Wt</th>
                      <th style={{ padding: "8px", textAlign: "left" }}>Touch</th>
                      <th style={{ padding: "8px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedEntryForReceive.receivedGold || [])
                      .filter(r =>
                        dayjs(r.date).format("DD/MM/YYYY").includes(receiveSearch) ||
                        String(r.weight).includes(receiveSearch) ||
                        String(r.touch).includes(receiveSearch)
                      )
                      .slice(receivePage * receiveRowsPerPage, receivePage * receiveRowsPerPage + receiveRowsPerPage)
                      .map((r, index) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #eee", background: editReceiveId === r.id ? "#fff9c4" : "transparent" }}>
                          <td style={{ padding: "8px" }}>{receivePage * receiveRowsPerPage + index + 1}</td>
                          <td style={{ padding: "8px" }}>{dayjs(r.date).format("DD/MM/YYYY")}</td>
                          <td style={{ padding: "8px" }}>{r.amount || 0}g</td>
                          <td style={{ padding: "8px" }}>{r.weight}g</td>
                          <td style={{ padding: "8px" }}>{r.touch}</td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <EditIcon
                              style={{ cursor: "pointer", fontSize: "1.1rem", color: "#1976d2", marginRight: "8px" }}
                              onClick={() => handleEditReceiveClick(r)}
                            />
                            <DeleteIcon
                              style={{ cursor: "pointer", fontSize: "1.1rem", color: "#d32f2f" }}
                              onClick={() => handleDeleteReceive(r.id)}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <TablePagination
                  component="div"
                  count={
                    (selectedEntryForReceive.receivedGold || []).filter(r =>
                      new Date(r.createdAt).toLocaleDateString().includes(receiveSearch) ||
                      String(r.weight).includes(receiveSearch) ||
                      String(r.touch).includes(receiveSearch)
                    ).length
                  }
                  rowsPerPage={receiveRowsPerPage}
                  page={receivePage}
                  onPageChange={(e, newPage) => setReceivePage(newPage)}
                  onRowsPerPageChange={(e) => {
                    setReceiveRowsPerPage(parseInt(e.target.value, 10));
                    setReceivePage(0);
                  }}
                  rowsPerPageOptions={[5, 10]}
                  labelRowsPerPage="Rows per page:"
                  sx={{
                    borderTop: "1px solid #eee",
                    '& .MuiTablePagination-toolbar': {
                      minHeight: '40px',
                      padding: 0,
                    },
                    '& .MuiTablePagination-displayedRows': {
                      fontSize: "0.80rem",
                      margin: 0
                    }
                  }}
                />
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions style={{ padding: "16px 24px" }}>
          {isEditReceive && (
            <Button onClick={() => {
              setIsEditReceive(false);
              setEditReceiveId(null);
              setReceiveForm({
                amount: "",
                weight: "",
                touch: selectedEntryForReceive.advanceTouch || "",
                date: dayjs().format('YYYY-MM-DD')
              });
            }} color="secondary">Cancel Edit</Button>
          )}
          <Button onClick={closeReceiveDialog} color="inherit">Close</Button>
          <Button
            onClick={isEditReceive ? handleUpdateReceive : handleSaveReceive}
            variant="contained"
            color="primary"
            sx={{ boxShadow: "none" }}
            disabled={
              (!receiveForm.weight && !receiveForm.amount) ||
              !receiveForm.touch ||
              !receiveForm.date
            }
          >
            {isEditReceive ? "Update Receipt" : "Record Receipt"}
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );

}

export default PurchaseEntry;
