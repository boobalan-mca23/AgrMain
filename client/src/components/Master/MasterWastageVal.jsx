import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Masteradditems.css";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import { BACKEND_SERVER_URL } from "../../Config/Config";
 
const MasterWastageVal = () => {
  const [wasteVal, setWasteVal] = useState("");
  const [wasteValList, setWasteValList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
 
  useEffect(() => {
    fetchWastageVal();
  }, []);
 
  const fetchWastageVal = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-wastage`);
     console.log("wastage fecth test:",res.data)
      setWasteValList(res.data);
    } catch (err) {
      console.error("Failed to fetch touch values", err);
    }
  };
 
  const handleAddItem = async () => {
    if (!wasteVal) {
      toast.warn("Please enter a touch value.");
      return;
    }
    console.log('wasteVal',wasteVal)
    try {
      await axios.post(`${BACKEND_SERVER_URL}/api/master-wastage/create`, {
        wastage: wasteVal,
      });
 
      setWasteVal("");
      fetchWastageVal();
      toast.success("Touch value added successfully!");
    } catch (err) {
      console.error("Failed to add touch", err);
      toast.error(err.response.data.msg,{autoClose:2000});
     }
  };
 
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this touch value?")) {
      try {
        await axios.delete(`${BACKEND_SERVER_URL}/api/master-wastage/${id}`);
        toast.success("Touch value deleted!");
        fetchWastageVal();
      } catch (err) {
        console.error("Failed to delete touch", err);
        toast.error("Failed to delete. Please try again.");
      }
    }
  };
 
  const handleEdit = (id, value) => {
    setEditId(id);
    setEditValue(value);
  };
 
  const handleCancelEdit = () => {
    setEditId(null);
    setEditValue("");
  };
 
  const handleSaveEdit = async (id) => {
    if (!editValue) {
      toast.warn("Touch value cannot be empty.");
      return;
    }
    try {
      console.log("testing update", editValue)  
      await axios.put(`${BACKEND_SERVER_URL}/api/master-wastage/${id}`, {
        wastage: editValue,
      });
      toast.success("Touch value updated!");
      setEditId(null);
      setEditValue("");
      fetchWastageVal();
    } catch (err) {
      console.error("Failed to update touch", err);
      toast.error(err.response.data.msg, { autoClose: 1000 });

    }
  };
 
  return (
    <div className="master-container">
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
 
      <div className="add-item-form">
        <h2 style={{ textAlign: "center" }}>Add Wastage</h2>
        <label>Wastage:</label>
        <input
          type="number"
          step="0.001"
          value={wasteVal}
          onChange={(e) => setWasteVal(e.target.value)}
          onWheel={(e) => e.target.blur()}
          placeholder="Enter Wastage value"
        />
 
        <button onClick={handleAddItem}>Add Wastage</button>
      </div>
 
      <div className="item-list">
        <h2 style={{ textAlign: "center" }}>Wastage Entries</h2>
        {wasteValList.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>SI.No</th>
                <th>Wastage Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {wasteValList.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    {editId === item.id ? (
                      <input
                        type="number"
                        step="0.001"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{ width: "90%", padding: "4px" }}
                      />
                    ) : (
                      item.wastage
                    )}
                  </td>
                  <td>
                  {editId === item.id ? (
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
                        onClick={() => handleEdit(item.id, item.wastage)}
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
          <p>No touch values added</p>
        )}
      </div>
    </div>
  );
};
 
export default MasterWastageVal;
