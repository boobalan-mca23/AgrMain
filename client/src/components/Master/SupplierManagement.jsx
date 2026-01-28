import React, { useState, useEffect } from "react";
import axios from "axios";
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
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Masteradditems.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const initialForm = {
  name: "",
  contactNumber: "",
  address: "",
  gstOrBusinessId: "",
  openingBalance: "",
};

const SupplierManagement = () => {
  const [supplierList, setSupplierList] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/supplier`);
      setSupplierList(res.data);
    } catch {
      toast.error("Failed to load suppliers");
    }
  };

  const openAddDialog = () => {
    setIsEdit(false);
    setSelectedId(null);
    setForm(initialForm);
    setOpenDialog(true);
  };

  const openEditDialog = (supplier) => {
    setIsEdit(true);
    setSelectedId(supplier.id);
    setForm({
      name: supplier.name,
      contactNumber: supplier.contactNumber,
      address: supplier.address,
      gstOrBusinessId: supplier.gstOrBusinessId,
      openingBalance: supplier.openingBalance,
    });
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setForm(initialForm);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.warn("Supplier name required");

    if (form.contactNumber && !/^\d{10}$/.test(form.contactNumber)) {
      return toast.warn("Contact number must be exactly 10 digits");
    }

    if (form.openingBalance && isNaN(form.openingBalance)) {
      return toast.warn("Opening balance must be a valid number");
    }

    try {
      if (isEdit) {
        await axios.put(
          `${BACKEND_SERVER_URL}/api/supplier/${selectedId}`,
          form
        );
        toast.success("Supplier updated");
      } else {
        await axios.post(
          `${BACKEND_SERVER_URL}/api/supplier/create`,
          form
        );
        toast.success("Supplier added");
      }

      closeDialog();
      fetchSuppliers();
    } catch {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;

    try {
      await axios.delete(`${BACKEND_SERVER_URL}/api/supplier/${id}`);
      toast.success("Supplier deleted");
      fetchSuppliers();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="master-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button variant="contained" onClick={openAddDialog}>
          Add Supplier
        </Button>
      </div>

      {supplierList.length > 0 ? (
        <Paper style={{ overflowX: "auto", marginTop: "60px", marginLeft: "60px", position: "absolute" }}>
          <table className="item-list" style={{ minWidth: "1200px" }}>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Address</th>
                <th>GST</th>
                <th>Opening Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {supplierList.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.contactNumber}</td>
                  <td>{item.address}</td>
                  <td>{item.gstOrBusinessId}</td>
                  <td>{item.openingBalance}</td>
                  <td>
                    <EditIcon
                      style={{ cursor: "pointer", marginRight: 8, color: "#388e3c" }}
                      onClick={() => openEditDialog(item)}
                    />
                    <DeleteIcon
                      style={{ cursor: "pointer", color: "#d32f2f" }}
                      onClick={() => handleDelete(item.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Paper>
      ) : (
        <div
          style={{
            marginTop: "80px",
            padding: "12px",
            textAlign: "center",
            color: "#fff",
            backgroundColor: "#d32f2f",
            borderRadius: "6px",
            fontWeight: "bold",
          }}
        >
          No supplier data found
        </div>
      )}

      <Dialog open={openDialog} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {isEdit ? "Edit Supplier" : "Add Supplier"}
        </DialogTitle>

        <DialogContent>
          <TextField
            label="Supplier Name"
            fullWidth
            margin="dense"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <TextField
              label="Contact Number"
              fullWidth
              margin="dense"
              value={form.contactNumber}
              inputProps={{ maxLength: 10 }}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ""); // allow only numbers
                setForm({ ...form, contactNumber: value });
              }}
            />

          <TextField
            label="Address"
            fullWidth
            margin="dense"
            multiline
            rows={2}
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
          />

          <TextField
            label="GST / Business ID"
            fullWidth
            margin="dense"
            value={form.gstOrBusinessId}
            onChange={(e) =>
              setForm({ ...form, gstOrBusinessId: e.target.value })
            }
          />

          <TextField
            label="Opening Balance"
            fullWidth
            margin="dense"
            value={form.openingBalance}
            onChange={(e) => {
              const value = e.target.value;

              // allow only numbers and one decimal point
              if (/^\d*\.?\d*$/.test(value)) {
                setForm({ ...form, openingBalance: value });
              }
            }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SupplierManagement;