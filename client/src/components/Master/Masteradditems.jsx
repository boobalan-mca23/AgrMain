import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Masteradditems.css";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { BACKEND_SERVER_URL } from "../../Config/Config";

const Masteradditems = () => {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [editItemId, setEditItemId] = useState(null);
  const [editValue, setEditValue] = useState("");

   // Regex: only letters, numbers, spaces allowed
  const validName = /^[a-zA-Z0-9\s]+$/;

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-items`);
      setItems(res.data);
    } catch (err) {
      console.error("Failed to fetch items", err);
    }
  };

  const handleAddItem = async () => {
    if (itemName.trim()) {
     
     

      if (!validName.test(itemName.trim())) {
        toast.warn("Special characters are not allowed.", { autoClose: 2000 });
        return;
      }

      try {
        await axios.post(`${BACKEND_SERVER_URL}/api/master-items/create`, {
          itemName: itemName.trim(),
        });
        setItemName("");
        fetchItems();
        toast.success("Item added successfully!");
      } catch (err) {
        console.error("Failed to add item", err);
        toast.error(err.response?.data?.msg || "Something went wrong", {
          autoClose: 2000,
        });
      }
    } else {
      toast.warn("Please enter item name.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await axios.delete(`${BACKEND_SERVER_URL}/api/master-items/${id}`);
        toast.success("Item deleted successfully!");
        fetchItems();
      } catch (err) {
        console.error("Failed to delete item", err);
        toast.error("Failed to delete item. Please try again.");
      }
    }
  };

  const handleEdit = (id, currentName) => {
    setEditItemId(id);
    setEditValue(currentName);
  };

  const handleCancelEdit = () => {
    setEditItemId(null);
    setEditValue("");
  };

  const handleSaveEdit = async (id) => {
    if (!editValue.trim()) {
      toast.warn("Item name cannot be empty.");
      return;
    }
     if (!validName.test(editValue.trim())) {
        toast.warn("Special characters are not allowed.", { autoClose: 2000 });
        return;
      }
    try {
      await axios.put(`${BACKEND_SERVER_URL}/api/master-items/${id}`, {
        itemName: editValue.trim(),
      });
      toast.success("Item updated successfully!");
      setEditItemId(null);
      setEditValue("");
      fetchItems();
    } catch (err) {
      console.error("Failed to update item", err);
      toast.error(err.response?.data?.msg || "Something went wrong", {
          autoClose: 2000,
        });
    }
  };

  return (
    <>
      <div className="master-container">
        <ToastContainer position="top-right" autoClose={2000} hideProgressBar />

        {/* Add Item Form */}
        <div className="add-item-form">
          <h2 style={{ textAlign: "center" }}>Add Item</h2>
          <label>Item Name:</label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Enter item name"
          />
          <button onClick={handleAddItem}>Add Item</button>
        </div>

        {/* Item List */}
        <div className="item-list">
          <h2 style={{ textAlign: "center" }}>Added Items</h2>
          {items.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>SI.No</th>
                  <th>Item Name</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      {editItemId === item.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{ width: "90%", padding: "4px" }}
                        />
                      ) : (
                        item.itemName
                      )}
                    </td>
                    <td>
                    {editItemId === item.id ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <EditIcon
                          style={{ cursor: "pointer", marginRight: "10px", color: "#388e3c" }}
                          onClick={() => handleEdit(item.id, item.itemName)}
                        />
                        <DeleteIcon
                          style={{ cursor: "pointer", color: "#d32f2f" }}
                          onClick={() => handleDelete(item.id)}
                        />
                      </>
                    )}
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No items added</p>
          )}
        </div>
      </div>
    </>
  );
};

export default Masteradditems;
