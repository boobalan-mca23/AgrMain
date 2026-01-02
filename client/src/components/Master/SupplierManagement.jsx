import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Masteradditems.css";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const SupplierManagement = () => {
  const [supplierList, setSupplierList] = useState([]);

  const [form, setForm] = useState({
    name: "",
    contactNumber: "",
    address: "",
    gstOrBusinessId: "",
    openingBalance: "",
  });

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    contactNumber: "",
    address: "",
    gstOrBusinessId: "",
    openingBalance: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/supplier`);
      setSupplierList(res.data);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    }
  };

  const handleAddSupplier = async () => {
    if (!form.name.trim()) return toast.warn("Supplier name is required");
    if (!form.contactNumber.trim())
      return toast.warn("Contact number is required");

    try {
      await axios.post(`${BACKEND_SERVER_URL}/api/supplier/create`, form);
      toast.success("Supplier added successfully!");

      setForm({
        name: "",
        contactNumber: "",
        address: "",
        gstOrBusinessId: "",
        openingBalance: "",
      });

      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.msg || "Failed to add supplier");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?"))
      return;

    try {
      await axios.delete(`${BACKEND_SERVER_URL}/api/supplier/${id}`);
      toast.success("Supplier deleted!");
      fetchSuppliers();
    } catch (err) {
      toast.error("Failed to delete supplier");
    }
  };

  const handleEdit = (supplier) => {
    setEditId(supplier.id);
    setEditForm({
      name: supplier.name,
      contactNumber: supplier.contactNumber,
      address: supplier.address,
      gstOrBusinessId: supplier.gstOrBusinessId,
      openingBalance: supplier.openingBalance,
    });
  };

  const handleCancelEdit = () => {
    setEditId(null);
  };

  const handleSaveEdit = async (id) => {
    if (!editForm.name.trim()) return toast.warn("Supplier name is required");
    if (!editForm.contactNumber.trim())
      return toast.warn("Contact number is required");

    try {
      await axios.put(`${BACKEND_SERVER_URL}/api/supplier/${id}`, editForm);
      toast.success("Supplier updated!");
      setEditId(null);
      fetchSuppliers();
    } catch (err) {
      toast.error("Failed to update supplier");
    }
  };

  return (
    <div className="master-container">
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />

      {/* Add Supplier Form */}
      <div className="add-item-form">
        <h2 style={{ textAlign: "center" }}>Add Supplier</h2>

        <div className="form-grid-2">
          {/* Row 1 */}
          <div>
            <label>Supplier Name:</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label>Contact Number:</label>
            <input
              type="number"
              value={form.contactNumber}
              onChange={(e) =>
                setForm({ ...form, contactNumber: e.target.value })
              }
              onWheel={(e) => e.target.blur()}
            />
          </div>

          {/* Row 2 */}
          <div className="full-width">
            <label>Address:</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {/* Row 3 */}
          <div>
            <label>GST / Business ID:</label>
            <input
              type="text"
              value={form.gstOrBusinessId}
              onChange={(e) =>
                setForm({ ...form, gstOrBusinessId: e.target.value })
              }
            />
          </div>

          <div>
            <label>Opening Balance:</label>
            <input
              type="number"
              value={form.openingBalance}
              onChange={(e) =>
                setForm({ ...form, openingBalance: e.target.value })
              }
              onWheel={(e) => e.target.blur()}
            />
          </div>
        </div>

        <button onClick={handleAddSupplier}>Add Supplier</button>
      </div>

      {/* Supplier List */}
      <div className="item-list item-list-supplier">
        <h2 style={{ textAlign: "center" }}>Supplier List</h2>

        {supplierList.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>SI.No</th>
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

                  {editId === item.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={editForm.contactNumber}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              contactNumber: e.target.value,
                            })
                          }
                          onWheel={(e) => e.target.blur()}
                        />
                      </td>

                      <td>
                        <textarea
                          value={editForm.address}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              address: e.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          value={editForm.gstOrBusinessId}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              gstOrBusinessId: e.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          value={editForm.openingBalance}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              openingBalance: e.target.value,
                            })
                          }
                        />
                      </td>

                      <td>
                        <button
                          style={{
                            marginRight: "5px",
                            background: "#4CAF50",
                            color: "#fff",
                            padding: "4px 8px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                          onClick={() => handleSaveEdit(item.id)}
                        >
                          Save
                        </button>

                        <button
                          style={{
                            background: "#f44336",
                            color: "#fff",
                            padding: "4px 8px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{item.name}</td>
                      <td>{item.contactNumber}</td>
                      <td>{item.address}</td>
                      <td>{item.gstOrBusinessId}</td>
                      <td>{item.openingBalance}</td>

                      <td>
                        <EditIcon
                          style={{
                            cursor: "pointer",
                            marginRight: "10px",
                            color: "#388e3c",
                          }}
                          onClick={() => handleEdit(item)}
                        />

                        <DeleteIcon
                          style={{ cursor: "pointer", color: "#d32f2f" }}
                          onClick={() => handleDelete(item.id)}
                        />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No suppliers added</p>
        )}
      </div>
    </div>
  );
};

export default SupplierManagement;
