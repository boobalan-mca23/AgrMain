import React, { useEffect, useState } from "react";

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
} from "@mui/material";

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


  useEffect(() => {

    fetchSupplierName();

    fetchEntries();

  }, [supplierId]);


  useEffect(() => {

    generateFilterOptions();

    applyFilters();

  }, [entries, itemFilter, touchFilter]);


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

    setFilteredEntries(filtered);

  };


  const clearFilters = () => {

    setItemFilter("");

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

    // ✅ FIX: calculate only when finalPurity exists
    let goldBalance = obj.goldBalance;

    if (finalPurity > 0)
      goldBalance = round3(advance - finalPurity);

    return {

      netWeight,

      wastagePure,

      finalPurity,

      goldBalance

    };

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


          {/* Touch dropdown */}

          <TextField
            select
            size="small"
            value={touchFilter}
            onChange={(e) =>
              setTouchFilter(e.target.value)
            }
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

      <Paper style={{ overflowX: "auto", marginTop: "60px", marginLeft: "60px", position: "absolute" }}>
        <table
          className="item-list"
          style={{ minWidth: "1400px", width: "100%" }}
        >

          <thead>

            <tr>
              <th>S.No</th>
              <th>Item</th>
              <th>Gross Wt. (g)</th>
              <th>Stone Wt. (g)</th>
              <th>Net Wt. (g)</th>
              <th>Touch</th>
              <th>Wastage Value</th>
              <th>Wastage Pure (g)</th>
              <th>Final Purity (g)</th>
              <th>Advance Gold (g)</th>
              <th>Gold Balance (g)</th>
              <th>Action</th>
            </tr>

          </thead>


          <tbody>
            {filteredEntries.length > 0 ? (
              filteredEntries.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>{e.itemName}</td>
                  <td>{e.grossWeight}</td>
                  <td>{e.stoneWeight}</td>
                  <td>{e.netWeight}</td>
                  <td>{e.touch}</td>
                  <td>{e.wastage} ({e.wastageType})</td>
                  <td>{e.wastagePure}</td>
                  <td>{e.finalPurity}</td>
                  <td>{e.advanceGold}</td>
                  <td>{e.goldBalance}</td>
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
                <td colSpan="12" style={{ textAlign: "center", padding: "20px", fontWeight: "bold", color: "#666" }}>
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
            label="Advance Gold (g)"
            fullWidth
            margin="dense"
            value={form.advanceGold}
            onChange={(e) =>
              {
              const value = e.target.value;

              if (/^\d*\.?\d*$/.test(value)) {
              handleChange("advanceGold", e.target.value)
              }
            }
            }
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
            <option value="+">+</option>
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

    </div>

  );

}

export default ItemPurchaseEntry;
