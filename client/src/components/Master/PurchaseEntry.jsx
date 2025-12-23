import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Masteradditems.css";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const PurchaseEntry = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [entries, setEntries] = useState([]);

  const [form, setForm] = useState({
    supplierId: "",
    jewelName: "",
    grossWeight: "",
    stoneWeight: "",
    netWeight: "",
    wastage: "",
    touch: "",
    finalPurity: "",
    moveTo: "product",
  });

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ ...form });

  useEffect(() => {
    fetchSuppliers();
    fetchEntries();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/supplier`);
      setSuppliers(res.data);
    } catch (err) {
      console.error("Fetch suppliers error", err);
    }
  };

  const fetchEntries = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/purchase-entry`);
      setEntries(res.data);
    } catch (err) {
      console.error("Fetch entries error", err);
    }
  };

  const recalc = (obj) => {
    const gross = Number(obj.grossWeight) || 0;
    const stone = Number(obj.stoneWeight) || 0;
    const wastage = Number(obj.wastage) || 0;
    const touch = Number(obj.touch) || 0;
    const net = parseFloat((gross - stone).toFixed(3));
    const finalPurity = parseFloat(((net + wastage) * (touch / 100)).toFixed(3));
    return { net, finalPurity };
  };

  const handleChange = (field, value) => {
    const updated = { ...form, [field]: value };
    if (["grossWeight", "stoneWeight", "wastage", "touch"].includes(field)) {
      const { net, finalPurity } = recalc(updated);
      updated.netWeight = net;
      updated.finalPurity = finalPurity;
    }
    setForm(updated);
  };

  const handleAdd = async () => {
    if (!form.supplierId) return toast.warn("Select supplier");
    if (!form.jewelName) return toast.warn("Enter jewel name");

    const payload = {
      supplierId: Number(form.supplierId),
      jewelName: form.jewelName,
      grossWeight: Number(form.grossWeight) || 0,
      stoneWeight: Number(form.stoneWeight) || 0,
      netWeight: Number(form.netWeight) || 0,
      wastage: Number(form.wastage) || 0,
      touch: Number(form.touch) || 0,
      finalPurity: Number(form.finalPurity) || 0,
      moveTo: form.moveTo === "product" ? "product" : "purchase",
    };

    try {
      await axios.post(`${BACKEND_SERVER_URL}/api/purchase-entry/create`, payload);
      toast.success("Purchase entry saved");
      setForm({
        supplierId: "",
        jewelName: "",
        grossWeight: "",
        stoneWeight: "",
        netWeight: "",
        wastage: "",
        touch: "",
        finalPurity: "",
        moveTo: "product",
      });
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to save entry");
    }
  };

  const handleEdit = (entry) => {
    setEditId(entry.id);
    setEditForm({
      supplierId: entry.supplierId,
      jewelName: entry.jewelName,
      grossWeight: entry.grossWeight,
      stoneWeight: entry.stoneWeight,
      netWeight: entry.netWeight,
      wastage: entry.wastage,
      touch: entry.touch,
      finalPurity: entry.finalPurity,
      moveTo: entry.moveTo,
    });
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.supplierId) return toast.warn("Select supplier");
    if (!editForm.jewelName) return toast.warn("Enter jewel name");

    const payload = {
      supplierId: Number(editForm.supplierId),
      jewelName: editForm.jewelName,
      grossWeight: Number(editForm.grossWeight) || 0,
      stoneWeight: Number(editForm.stoneWeight) || 0,
      netWeight: Number(editForm.netWeight) || 0,
      wastage: Number(editForm.wastage) || 0,
      touch: Number(editForm.touch) || 0,
      finalPurity: Number(editForm.finalPurity) || 0,
      moveTo: editForm.moveTo === "product" ? "product" : "purchase",
    };

    try {
      await axios.put(`${BACKEND_SERVER_URL}/api/purchase-entry/${id}`, payload);
      toast.success("Entry updated");
      setEditId(null);
      fetchEntries();
    } catch (err) {
      toast.error("Failed to update entry");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete entry?")) return;
    try {
      await axios.delete(`${BACKEND_SERVER_URL}/api/purchase-entry/${id}`);
      toast.success("Entry deleted");
      fetchEntries();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="master-container">
      <ToastContainer position="top-right" autoClose={2000} />

      {/* Form at top */}
      <div className="add-item-form" style={{ marginBottom: 24, width: "100%" }}>
        <h2 style={{ textAlign: "center" }}>Purchase Entry</h2>

        <label>Supplier</label>
        <select
          value={form.supplierId}
          onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
        >
          <option value="">Select supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <label>Jewel Name</label>
        <input
          type="text"
          value={form.jewelName}
          onChange={(e) => setForm({ ...form, jewelName: e.target.value })}
        />

        <label>Gross Weight</label>
        <input
          type="number"
          step="0.001"
          value={form.grossWeight}
          onChange={(e) => handleChange("grossWeight", e.target.value)}
        />

        <label>Stone Weight</label>
        <input
          type="number"
          step="0.001"
          value={form.stoneWeight}
          onChange={(e) => handleChange("stoneWeight", e.target.value)}
        />

        <label>Net Weight</label>
        <input type="number" step="0.001" value={form.netWeight} readOnly />

        <label>Wastage</label>
        <input
          type="number"
          step="0.001"
          value={form.wastage}
          onChange={(e) => handleChange("wastage", e.target.value)}
        />

        <label>Touch (Purity)</label>
        <input
          type="number"
          step="0.1"
          value={form.touch}
          onChange={(e) => handleChange("touch", e.target.value)}
        />

        <label>Final Purity</label>
        <input type="number" step="0.001" value={form.finalPurity} readOnly />

        <label>Move To</label>
        <select
          value={form.moveTo}
          onChange={(e) => setForm({ ...form, moveTo: e.target.value })}
        >
          <option value="product">Move to Product Stock</option>
          <option value="purchase">Move to Purchase Stock</option>
        </select>

        <button onClick={handleAdd} style={{ marginTop: 12 }}>
          Save Entry
        </button>
      </div>

      {/* List below */}
      <div className="item-list item-list-supplier" style={{ width: "100%" }}>
        <h2 style={{ textAlign: "center" }}>Purchase Entries</h2>

        {entries.length === 0 ? (
          <p>No entries found</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SI.No</th>
                <th>Supplier</th>
                <th>Jewel</th>
                <th>Gross</th>
                <th>Stone</th>
                <th>Net</th>
                <th>Wastage</th>
                <th>Touch</th>
                <th>Final Purity</th>
                <th>Move To</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {entries.map((en, idx) => (
                <tr key={en.id}>
                  <td>{idx + 1}</td>

                  {editId === en.id ? (
                    <>
                      <td>
                        <select
                          value={editForm.supplierId}
                          onChange={(e) =>
                            setEditForm({ ...editForm, supplierId: e.target.value })
                          }
                        >
                          <option value="">Select</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={editForm.jewelName}
                          onChange={(e) => setEditForm({ ...editForm, jewelName: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          value={editForm.grossWeight}
                          onChange={(e) => setEditForm({ ...editForm, grossWeight: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          value={editForm.stoneWeight}
                          onChange={(e) => setEditForm({ ...editForm, stoneWeight: e.target.value })}
                        />
                      </td>
                      <td>
                        <input type="number" step="0.001" value={editForm.netWeight} readOnly />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.001"
                          value={editForm.wastage}
                          onChange={(e) => setEditForm({ ...editForm, wastage: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={editForm.touch}
                          onChange={(e) => setEditForm({ ...editForm, touch: e.target.value })}
                        />
                      </td>
                      <td>
                        <input type="number" step="0.001" value={editForm.finalPurity} readOnly />
                      </td>
                      <td>
                        <select value={editForm.moveTo} onChange={(e) => setEditForm({ ...editForm, moveTo: e.target.value })}>
                          <option value="product">Product Stock</option>
                          <option value="purchase">Purchase Stock</option>
                        </select>
                      </td>

                      <td>
                        <button onClick={() => handleSaveEdit(en.id)} style={{ marginRight: 6 }}>
                          Save
                        </button>
                        <button onClick={() => setEditId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{en.supplier?.name ?? en.supplierId}</td>
                      <td>{en.jewelName}</td>
                      <td>{en.grossWeight}</td>
                      <td>{en.stoneWeight}</td>
                      <td>{en.netWeight}</td>
                      <td>{en.wastage}</td>
                      <td>{en.touch}</td>
                      <td>{en.finalPurity}</td>
                      <td>{en.moveTo === "product" ? "Product Stock" : "Purchase Stock"}</td>

                      <td>
                        <EditIcon style={{ cursor: "pointer", marginRight: 8 }} onClick={() => handleEdit(en)} />
                        <DeleteIcon style={{ cursor: "pointer" }} onClick={() => handleDelete(en.id)} />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PurchaseEntry;
