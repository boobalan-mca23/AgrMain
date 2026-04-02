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
  openingBCBalance: 0,
  openingItemBalance: 0,
  displayBC: 0,
  displayItem: 0,
  displayGrand: 0
};


function SupplierManagement() {

  const [supplierList, setSupplierList] = useState([]);

  const [filteredSuppliers, setFilteredSuppliers] = useState([]);

  const [supplierFilter, setSupplierFilter] = useState("");

  const [openDialog, setOpenDialog] = useState(false);

  const [isEdit, setIsEdit] = useState(false);

  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState(initialForm);
  const [moduleTransactions, setModuleTransactions] = useState({ bc: 0, item: 0, general: 0 });
  const [saving, setSaving] = useState(false);


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
    setModuleTransactions({ bc: 0, item: 0, general: 0 });
    setForm(initialForm);
    setOpenDialog(true);

  };


  const openEditDialog = (supplier) => {

    setIsEdit(true);

    setSelectedId(supplier.id);

    const transBC = (supplier.totalBCBalance || 0) - (supplier.openingBCBalance || 0);
    const transItem = (supplier.totalItemBalance || 0) - (supplier.openingItemBalance || 0);
    
    setModuleTransactions({
        bc: transBC,
        item: transItem,
        general: 0 // No transactions for general currently
    });

    setForm({
      name: supplier.name,
      contactNumber: supplier.contactNumber,
      address: supplier.address,
      gstOrBusinessId: supplier.gstOrBusinessId,
      // Removed openingBalance from state
      openingBCBalance: supplier.openingBCBalance || 0,
      openingItemBalance: supplier.openingItemBalance || 0,
      displayBC: supplier.totalBCBalance || 0,
      displayItem: supplier.totalItemBalance || 0,
      displayGrand: supplier.totalBalance || 0
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

    if (form.contactNumber && !/^\d{10}$/.test(form.contactNumber))
      return toast.warn("Contact must be exactly 10 digits");

    // if (!form.gstOrBusinessId.trim())
    //   return toast.warn("GST / Business ID required");

    if (form.gstOrBusinessId && !/^[a-zA-Z0-9]*$/.test(form.gstOrBusinessId))
      return toast.warn("GST ID must be alphanumeric");

    try {
      setSaving(true);
      const { displayBC, displayItem, displayGrand, ...payload } = form;

      if (isEdit) {

        await axios.put(
          `${BACKEND_SERVER_URL}/api/supplier/${selectedId}`,
          payload
        );

        toast.success("Supplier updated");

      } else {

        await axios.post(
          `${BACKEND_SERVER_URL}/api/supplier/create`,
          payload
        );

        toast.success("Supplier added");

      }

      closeDialog();

      fetchSuppliers();

    } catch {

      toast.error("Operation failed");

    } finally {
      setSaving(false);
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
              <th style={{ textAlign: "center" }}>BC Balance (g)</th>
              <th style={{ textAlign: "center" }}>Item Balance (g)</th>
              <th style={{ textAlign: "center" }}>Total Balance (g)</th>
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
                <td style={{ textAlign: "center" }}>{supplier.contactNumber || "-"}</td>
                <td style={{ textAlign: "center" }}>{supplier.address || "-"}</td>
                <td style={{ textAlign: "center" }}>{supplier.gstOrBusinessId || "-"}</td>
                <td style={{ textAlign: "center" }}>
                   {Number(supplier.totalBCBalance || 0).toFixed(3)}
                </td>
                <td style={{ textAlign: "center" }}>
                   {Number(supplier.totalItemBalance || 0).toFixed(3)}
                </td>
                <td style={{ textAlign: "center", fontWeight: "bold", background: "#f8f9fa" }}>
                  {Number(supplier.totalBalance || 0).toFixed(3)}
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
             label="BC Balance (g)"
             fullWidth
             margin="dense"
             value={form.displayBC}
             onChange={(e) => {
               const val = Number(e.target.value) || 0;
               const newOpening = val - moduleTransactions.bc;
               setForm({
                 ...form,
                 displayBC: e.target.value, // Keep literal for typing
                 openingBCBalance: newOpening,
                 displayGrand: (Number(val) || 0) + (Number(form.displayItem) || 0)
               });
             }}
           />
 
           <TextField
             label="Item Balance (g)"
             fullWidth
             margin="dense"
             value={form.displayItem}
             onChange={(e) => {
               const val = Number(e.target.value) || 0;
               const newOpening = val - moduleTransactions.item;
               setForm({
                 ...form,
                 displayItem: e.target.value, // Keep literal for typing
                 openingItemBalance: newOpening,
                 displayGrand: (Number(form.displayBC) || 0) + (Number(val) || 0)
               });
             }}
           />
 
           <TextField
             label="Grand Total Balance (g)"
             fullWidth
             margin="dense"
             value={form.displayGrand}
             disabled // Grand Total is naturally the sum of the two module inputs
           />

        </DialogContent>


        <DialogActions>

          <Button onClick={closeDialog}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>

        </DialogActions>

      </Dialog>


    </div>

  );

}

export default SupplierManagement;
