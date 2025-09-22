import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Masteradditems.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const Masteradditems = () => {
  const [touchInput, setTouchInput] = useState("");
  const [touchList, setTouchList] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchTouch();
  }, []);

  const fetchTouch = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
      setTouchList(res.data);
    } catch (err) {
      console.error("Failed to fetch touch values", err);
    }
  };

  const handleAddItem = async () => {
    if (!touchInput) {
      toast.warn("Please enter a touch value.");
      return;
    }
    console.log('touchInput',touchInput)
    try {
      await axios.post(`${BACKEND_SERVER_URL}/api/master-touch/create`, {
        touch: touchInput,
      });

      setTouchInput("");
      fetchTouch();
      toast.success("Touch value added successfully!");
    } catch (err) {
      console.error("Failed to add touch", err);
      toast.error(err.response.data.msg,{autoClose:2000});
     }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this touch value?")) {
      try {
        await axios.delete(`${BACKEND_SERVER_URL}/api/master-touch/${id}`);
        toast.success("Touch value deleted!");
        fetchTouch();
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
      await axios.put(`${BACKEND_SERVER_URL}/api/master-touch/${id}`, {
        touch: editValue,
      });
      toast.success("Touch value updated!");
      setEditId(null);
      setEditValue("");
      fetchTouch();
    } catch (err) {
      console.error("Failed to update touch", err);
      toast.error(err.response.data.error,{autoClose:2000});
    }
  };

  return (
    <div className="master-container">
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />

      <div className="add-item-form">
        <h2 style={{ textAlign: "center" }}>Add Touch Entries</h2>
        <label>Touch:</label>
        <input
          type="number"
          step="0.001"
          value={touchInput}
          onChange={(e) => setTouchInput(e.target.value)}
          onWheel={(e) => e.target.blur()}
          placeholder="Enter touch value"
        />

        <button onClick={handleAddItem}>Add Touch</button>
      </div>

      <div className="item-list">
        <h2 style={{ textAlign: "center" }}>Touch Entries</h2>
        {touchList.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>SI.No</th>
                <th>Touch Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {touchList.map((item, index) => (
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
                      item.touch
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
                        <button
                          style={{
                            background: "#1DA3A3",
                            color: "#fff",
                            padding: "4px 8px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            marginRight: "5px",
                          }}
                          onClick={() => handleEdit(item.id, item.touch)}
                        >
                          Edit
                        </button>
                        {/* <button
                          style={{
                            background: "#e63946",
                            color: "#fff",
                            padding: "4px 8px",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </button> */}
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

export default Masteradditems;
