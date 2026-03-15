import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper
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


function SupplierManagement() {

  const [supplierList, setSupplierList] = useState([]);

  const [filteredSuppliers, setFilteredSuppliers] = useState([]);

  const [supplierFilter, setSupplierFilter] = useState("");

  const [openDialog, setOpenDialog] = useState(false);

  const [isEdit, setIsEdit] = useState(false);

  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState(initialForm);


  useEffect(() => {

    fetchSuppliers();

  }, []);


  useEffect(() => {

    applyFilter();

  }, [supplierFilter, supplierList]);


  const fetchSuppliers = async () => {

    try {

      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/supplier`
      );

      setSupplierList(res.data);

      setFilteredSuppliers(res.data);

    } catch {

      toast.error("Failed to load suppliers");

    }

  };


  const applyFilter = () => {

    if (!supplierFilter.trim()) {

      setFilteredSuppliers(supplierList);

      return;

    }

    const filtered = supplierList.filter((supplier) =>
      supplier.name
        .toLowerCase()
        .includes(supplierFilter.toLowerCase())
    );

    setFilteredSuppliers(filtered);

  };


  const clearFilter = () => {

    setSupplierFilter("");

    setFilteredSuppliers(supplierList);

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

    if (!form.name.trim())
      return toast.warn("Supplier name required");

    if (
      form.contactNumber &&
      !/^\d{10}$/.test(form.contactNumber)
    )
      return toast.warn("Contact must be 10 digits");

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

    if (!window.confirm("Delete this supplier?"))
      return;

    try {

      await axios.delete(
        `${BACKEND_SERVER_URL}/api/supplier/${id}`
      );

      toast.success("Supplier deleted");

      fetchSuppliers();

    } catch {

      toast.error("Delete failed");

    }

  };


  return (

    <div>

      <ToastContainer position="top-right" autoClose={3000} />


      <h2>Supplier Management</h2>


      {/* FILTER BAR */}

      <Paper
        style={{
          padding: 15,
          marginBottom: 15,
          display: "flex",
          gap: 20,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap"
        }}
      >

        <div style={{ display: "flex", gap: 20 }}>

          <TextField
            label="Search Supplier Name"
            value={supplierFilter}
            onChange={(e) =>
              setSupplierFilter(e.target.value)
            }
            variant="outlined"
            style={{ minWidth: 300 }}
          />

          <Button
            variant="outlined"
            onClick={clearFilter}
          >
            Clear
          </Button>

        </div>


        <Button
          variant="contained"
          onClick={openAddDialog}
        >
          Add Supplier
        </Button>

      </Paper>


      {/* TOTAL COUNT */}

      <div
        style={{
          marginBottom: 10,
          fontWeight: 600,
          fontSize: 18
        }}
      >
        Total Suppliers: {filteredSuppliers.length}
      </div>


      {/* TABLE */}

      <Paper>

        <table
          className="item-list"
          style={{ width: "100%" }}
        >

          <thead>

            <tr>
              <th style={{ textAlign: "center" }}>S.No</th>
              <th style={{ textAlign: "center" }}>Name</th>
              <th style={{ textAlign: "center" }}>Contact</th>
              <th style={{ textAlign: "center" }}>Address</th>
              <th style={{ textAlign: "center" }}>GST</th>
              <th style={{ textAlign: "center" }}>Opening Balance (g)</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>

          </thead>


          <tbody>

            {filteredSuppliers.length === 0 && (

              <tr>

                <td colSpan="7" style={{ textAlign: "center" }}>
                  No suppliers found
                </td>

              </tr>

            )}


            {filteredSuppliers.map((supplier, index) => (

              <tr key={supplier.id}>
                <td style={{ textAlign: "center" }}>{index + 1}</td>
                <td style={{ textAlign: "center" }}>{supplier.name}</td>
                <td style={{ textAlign: "center" }}>{supplier.contactNumber}</td>
                <td style={{ textAlign: "center" }}>{supplier.address}</td>
                <td style={{ textAlign: "center" }}>{supplier.gstOrBusinessId}</td>
                <td style={{ textAlign: "center" }}>
                  {Number(
                    supplier.openingBalance || 0
                  ).toFixed(3)}
                </td>

                <td style={{ textAlign: "center" }}>

                  <EditIcon
                    style={{
                      cursor: "pointer",
                      marginRight: 8,
                      color: "#388e3c"
                    }}
                    onClick={() =>
                      openEditDialog(supplier)
                    }
                  />

                  <DeleteIcon
                    style={{
                      cursor: "pointer",
                      color: "#d32f2f"
                    }}
                    onClick={() =>
                      handleDelete(supplier.id)
                    }
                  />

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </Paper>


      {/* DIALOG */}

      <Dialog open={openDialog} onClose={closeDialog} fullWidth>

        <DialogTitle>
          {isEdit ? "Edit Supplier" : "Add Supplier"}
        </DialogTitle>


        <DialogContent>

          <TextField
            label="Supplier Name"
            fullWidth
            margin="dense"
            value={form.name}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow letters, numbers, and spaces
              if (/^[a-zA-Z0-9\s]*$/.test(value)) {
                setForm({
                  ...form,
                  name: value
                });
              }
            }}
          />


          <TextField
            label="Contact Number"
            fullWidth
            margin="dense"
            inputProps={{ maxLength: 10 }}
            value={form.contactNumber}
            onChange={(e) =>
              setForm({
                ...form,
                contactNumber:
                  e.target.value.replace(/\D/g, "")
              })
            }
          />


          <TextField
            label="Address"
            fullWidth
            margin="dense"
            multiline
            rows={2}
            value={form.address}
            onChange={(e) =>
              setForm({
                ...form,
                address: e.target.value
              })
            }
          />


          <TextField
            label="GST / Business ID"
            fullWidth
            margin="dense"
            value={form.gstOrBusinessId}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow letters and numbers
              if (/^[a-zA-Z0-9]*$/.test(value)) {
                setForm({
                  ...form,
                  gstOrBusinessId: value
                });
              }
            }}
          />


          <TextField
            label="Opening Balance (g)"
            fullWidth
            margin="dense"
            value={form.openingBalance}
            onChange={(e) => {

              const value = e.target.value;

              if (/^\d*\.?\d*$/.test(value)) {

                setForm({
                  ...form,
                  openingBalance: value
                });

              }

            }}
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
            Save
          </Button>

        </DialogActions>

      </Dialog>


    </div>

  );

}

export default SupplierManagement;
