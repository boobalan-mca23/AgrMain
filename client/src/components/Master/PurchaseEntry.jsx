import React, { useEffect, useState, useRef } from "react";
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
import "react-toastify/dist/ReactToastify.css";
import "./Masteradditems.css";

const initialForm = {
  supplierId: "",
  jewelName: "",
  grossWeight: "",
  stoneWeight: "",
  netWeight: "",
  touch: "",
  wastage: "",
  wastageType: "%",
  wastagePure: "",
  finalPurity: "",
};

const round3 = (num) => Number.isFinite(num) ? Number(num.toFixed(3)) : 0;

function PurchaseEntry() {
  const [suppliers, setSuppliers] = useState([]);
  const [entries, setEntries] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const jewelRef = useRef(null);

  useEffect(() => {
    fetchSuppliers();
    fetchEntries();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/supplier`);
      setSuppliers(res.data);
    } catch {
      toast.error("Failed to load suppliers");
    }
  };

  const fetchEntries = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/purchase-entry`);
      setEntries(res.data);
    } catch {
      toast.error("Failed to load entries");
    }
  };

  const recalc = (obj) => {
    const gross = round3(Number(obj.grossWeight) || 0);
    const stone = round3(Number(obj.stoneWeight) || 0);
    const touch = round3(Number(obj.touch) || 0);
    const wastage = round3(Number(obj.wastage) || 0);

    const netWeight = round3(gross - stone);
    const actualPure = round3((netWeight * touch) / 100);
    let finalPurity = 0;

    if (obj.wastageType === "Touch") {
      finalPurity = round3((netWeight * wastage) / 100);
    }

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

    return {
      netWeight,
      wastagePure,
      finalPurity,
    };
  };

  const handleChange = (field, value) => {
    const updated = { ...form, [field]: value };

    if (
      [
        "grossWeight",
        "stoneWeight",
        "touch",
        "wastage",
        "wastageType",
      ].includes(field)
    ) {
      Object.assign(updated, recalc(updated));
    }

    setForm(updated);
  };


  const openAddDialog = () => {
    setIsEdit(false);
    setSelectedId(null);
    setForm(initialForm);
    setOpenDialog(true);
    requestAnimationFrame(() => jewelRef.current?.focus());
  };

  const openEditDialog = (entry) => {
    setIsEdit(true);
    setSelectedId(entry.id);

    setForm({
      supplierId: entry.supplierId,
      jewelName: entry.jewelName,

      grossWeight: entry.grossWeight,
      stoneWeight: entry.stoneWeight,
      netWeight: entry.netWeight,

      touch: entry.touch,

      wastageType: entry.wastageType || "%",
      wastage: entry.wastage,
      wastagePure: entry.wastagePure,

      finalPurity: entry.finalPurity,
    });

    setOpenDialog(true);
    requestAnimationFrame(() => jewelRef.current?.focus());
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setForm(initialForm);
  };

  const handleSubmit = async () => {
    if (!form.supplierId) return toast.warn("Select supplier");
    if (!form.jewelName.trim()) return toast.warn("Enter jewel name");

    if (!form.grossWeight || Number(form.grossWeight) <= 0)
      return toast.warn("Enter valid gross weight");

    if (!form.touch || Number(form.touch) <= 0)
      return toast.warn("Enter valid touch");

    if (!form.wastageType)
      return toast.warn("Select wastage type");

    if (form.wastage === "" || Number(form.wastage) < 0)
      return toast.warn("Enter valid wastage value");

    if (!form.netWeight || Number(form.netWeight) <= 0)
      return toast.warn("Net weight must be greater than 0");

    if (!form.finalPurity || Number(form.finalPurity) <= 0)
      return toast.warn("Final purity must be greater than 0");

    const payload = {
      supplierId: Number(form.supplierId),
      jewelName: form.jewelName.trim(),
      grossWeight: Number(form.grossWeight),
      stoneWeight: Number(form.stoneWeight) || 0,
      netWeight: Number(form.netWeight),
      touch: Number(form.touch),
      wastageType: form.wastageType,
      wastage: Number(form.wastage),
      wastagePure: Number(form.wastagePure),
      finalPurity: Number(form.finalPurity),
      moveTo: "purchase",
    };

    try {
      setSaving(true);

      if (isEdit) {
        await axios.put(
          `${BACKEND_SERVER_URL}/api/purchase-entry/${selectedId}`,
          payload
        );
        toast.success("Entry updated");
      } else {
        await axios.post(
          `${BACKEND_SERVER_URL}/api/purchase-entry/create`,
          payload
        );
        toast.success("Entry added");
      }

      closeDialog();
      fetchEntries();
    } catch {
      toast.error("Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;

    try {
      await axios.delete(`${BACKEND_SERVER_URL}/api/purchase-entry/${id}`);
      toast.success("Entry deleted");
      fetchEntries();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="master-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Button
          variant="contained"
          onClick={openAddDialog}
        >
          Add Purchase Entry
        </Button>
      </div>

      <Paper style={{ overflowX: "auto", marginTop: "60px", marginLeft: "60px", position: "absolute" }}>
        <table
          className="item-list"
          style={{ minWidth: "1400px", width: "100%" }}
        >
          <thead>
            <tr>
              <th>S.No</th>
              <th>Supplier</th>
              <th>Jewel</th>
              <th>Gross Weight (g)</th>
              <th>Stone Weight (g)</th>
              <th>Net Weight (g)</th>
              <th>Touch</th>
              <th>Wastage Type</th>
              <th>Wastage Value</th>
              <th>Wastage Pure (g)</th>
              <th>Final Purity (g)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id}>
                <td>{i + 1}</td>
                <td>{e.supplier?.name}</td>
                <td>{e.jewelName}</td>
                <td>{Number(e.grossWeight).toFixed(3)}</td>
                <td>{Number(e.stoneWeight).toFixed(3)}</td>
                <td>{Number(e.netWeight).toFixed(3)}</td>
                <td>{Number(e.touch).toFixed(3)}</td>
                <td>{e.wastageType}</td>
                <td>{Number(e.wastage)}</td>
                <td>{Number(e.wastagePure).toFixed(3)}</td>
                <td>{Number(e.finalPurity).toFixed(3)}</td>
                <td>
                  <EditIcon
                    style={{ cursor: "pointer", marginRight: 8, color: "#388e3c" }}
                    onClick={() => openEditDialog(e)}
                  />
                  <DeleteIcon
                    style={{ cursor: "pointer", color: "#d32f2f" }}
                    onClick={() => handleDelete(e.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Paper>


      <Dialog open={openDialog} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {isEdit ? "Edit Purchase Entry" : "Add Purchase Entry"}
        </DialogTitle>

        <DialogContent>
          <TextField
            select
            fullWidth
            margin="dense"
            SelectProps={{ native: true }}
            value={form.supplierId}
            onChange={(e) => handleChange("supplierId", e.target.value)}
          >
            <option value="">Select Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </TextField>

          <TextField
            label="Jewel Name"
            fullWidth
            margin="dense"
            value={form.jewelName}
            onChange={(e) => handleChange("jewelName", e.target.value)}
          />

          <TextField
            label="Gross Weight"
            fullWidth
            margin="dense"
            value={form.grossWeight}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d*\.?\d*$/.test(v)) handleChange("grossWeight", v);
            }}
          />

          <TextField
            label="Stone Weight"
            fullWidth
            margin="dense"
            value={form.stoneWeight}
            onChange={(e) => handleChange("stoneWeight", e.target.value)}
          />

          <TextField
            label="Net Weight"
            fullWidth
            margin="dense"
            value={form.netWeight}
            InputProps={{ readOnly: true }}
          />

          <TextField
            label="Touch"
            fullWidth
            margin="dense"
            value={form.touch}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d*\.?\d*$/.test(v)) handleChange("touch", v);
            }}
          />

          <TextField
            select
            label="Wastage Type"
            fullWidth
            margin="dense"
            SelectProps={{ native: true }}
            value={form.wastageType}
            onChange={(e) => handleChange("wastageType", e.target.value)}
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
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d*\.?\d*$/.test(v)) handleChange("wastage", v);
            }}
          />

          <TextField
            label="Wastage Pure"
            fullWidth
            margin="dense"
            value={form.wastagePure}
            InputProps={{ readOnly: true }}
          />

          <TextField
            label="Final Purity"
            fullWidth
            margin="dense"
            value={form.finalPurity}
            InputProps={{ readOnly: true }}
          />

        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} variant="contained">
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default PurchaseEntry;
