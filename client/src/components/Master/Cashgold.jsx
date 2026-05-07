import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Cashgold.css";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { Button, TablePagination, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { checkCashOrGold } from "../cashOrGoldValidation/cashOrGoldValidation";
function Cashgold() {
  const today = new Date();
  const formattedToday = today.toISOString().split("T")[0]; // "2025-09-16"
  const [showFormPopup, setShowFormPopup] = useState(false);
  const [entries, setEntries] = useState([]);
  const [goldRate, setGoldRate] = useState(0);
  const [masterTouch, setMasterTouch] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    logId: null,
    date: formattedToday,
    type: "Select",
    cashAmount: "",
    goldValue: "",
    touch: "",
    purity: "",
    pureGold: "",
  });
  const [goldCashError, setGoldCashError] = useState({});
  const [saveDiasable, setSaveDisable] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const isFirstLoad = useRef(true);

  const handleClose = () => {
    setShowFormPopup(false);
    setFormData({
      id: null,
      logId: null,
      date: formattedToday,
      type: "Select",
      cashAmount: "",
      goldValue: "",
      touch: "",
      purity: "",
      pureGold: "",
    });
    setGoldRate(0);
    setGoldCashError({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedForm = { ...formData, [name]: value };

    // Reset fields if type changes
    if (name === "type") {
      updatedForm = {
        ...updatedForm,
        cashAmount: "",
        goldValue: "",
        touch: "",
        purity: "",
        pureGold: "",
      };
      setGoldRate(0);
    }

    if (name === "goldValue" || name === "touch") {
      const goldValue = parseFloat(
        name === "goldValue" ? value : formData.goldValue
      );
      const touch = parseFloat(name === "touch" ? value : formData.touch);

      if (!isNaN(goldValue) && !isNaN(touch)) {
        updatedForm.purity = ((goldValue * touch) / 100).toFixed(3);
      } else {
        updatedForm.purity = "";
      }
    }

    setFormData(updatedForm);
  };

  useEffect(() => {
    if (formData.type === "Cash" || formData.type === "Cash RTGS") {
      const cashAmount = parseFloat(formData.cashAmount);
      const rate = parseFloat(goldRate);
      const touch = parseFloat(formData.touch);
      let calculatedPurity = "";
      let calculatedPureGold = "";

      if (!isNaN(cashAmount) && cashAmount > 0 && !isNaN(rate) && rate > 0 && !isNaN(touch) && touch > 0) {
        // Fine gold weight
        calculatedPurity = ((cashAmount / rate) * (touch / 100)).toFixed(3);
        // Pure gold (Physical weight)
        calculatedPureGold = ((parseFloat(calculatedPurity) / touch) * 100).toFixed(3);
      }

      setFormData((prevFormData) => ({
        ...prevFormData,
        purity: calculatedPurity,
        pureGold: calculatedPureGold,
      }));
    }
  }, [formData.cashAmount, goldRate, formData.type, formData.touch]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let calculatedPurity = 0;
    if (formData.type === "Cash" || formData.type === "Cash RTGS") {
      calculatedPurity = formData.purity;
    } else if (formData.type === "Gold") {
      calculatedPurity = formData.purity;
    }

    const payload = {
      id: formData.id,
      logId: formData.logId,
      date: formData.date,
      type: formData.type,
      cashAmount:
        (formData.type === "Cash" || formData.type === "Cash RTGS") ? parseFloat(formData.cashAmount) : null,
      goldValue:
        formData.type === "Gold" ? parseFloat(formData.goldValue) : null,
      touch: parseFloat(formData.touch) || null,
      purity: parseFloat(calculatedPurity),
      goldRate: (formData.type === "Cash" || formData.type === "Cash RTGS") ? parseFloat(goldRate) : null,
    };
    if (payload.type === "Select") {
      return toast.warn("Please Select Gold or Cash Type");
    }
    const isValidationIsTrue = checkCashOrGold(payload, setGoldCashError);

    if (Object.keys(isValidationIsTrue).length === 0) {
      try {
        setSaveDisable(true);
        if (formData.id) {
          // Edit
          const response = await axios.put(
            `${BACKEND_SERVER_URL}/api/entries/${formData.id}`,
            payload
          );
          toast.success("Entry updated successfully!");
          setEntries((prev) =>
            prev.map((entry) => (entry.id === response.data.id ? response.data : entry))
          );
        } else {
          // Create
          const response = await axios.post(
            `${BACKEND_SERVER_URL}/api/entries`,
            payload
          );
          toast.success("Value added successfully!");
          const newItem = response.data;
          const updatedEntries = [...entries, newItem];
          setEntries(updatedEntries);

          // Jump to the last page to show the new entry
          const newPage = Math.max(0, Math.floor((updatedEntries.length - 1) / rowsPerPage));
          setPage(newPage);
        }

        handleClose();
        setSaveDisable(false);
        fetchTouch(); // Refresh touch generic options
      } catch (err) {
        setSaveDisable(false);
        toast.error("Failed to save entry. Please try again.");
        console.error("Error submitting entry:", err);
      }
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      id: entry.id,
      logId: entry.logId,
      date: new Date(entry.date).toISOString().split("T")[0],
      type: entry.type,
      cashAmount: entry.cashAmount || "",
      goldValue: entry.goldValue || "",
      touch: entry.touch || "",
      purity: entry.purity || "",
      pureGold: (entry.type === "Cash" || entry.type === "Cash RTGS") && entry.touch && entry.purity ? ((parseFloat(entry.purity) / parseFloat(entry.touch)) * 100).toFixed(3) : "",
    });
    setGoldRate(entry.goldRate || 0);
    setShowFormPopup(true);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this value?")) return;
    try {
      await axios.delete(`${BACKEND_SERVER_URL}/api/entries/${id}`);
      const updatedEntries = entries.filter((entry) => entry.id !== id);
      setEntries(updatedEntries);

      // Adjust page if the last item on the page was deleted
      const maxPage = Math.max(0, Math.floor((updatedEntries.length - 1) / rowsPerPage));
      if (page > maxPage) {
        setPage(maxPage);
      }

      toast.success("Entry deleted successfully!");
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete entry.");
    }
  };

  const calculateTotalPurity = () => {
    return entries
      .reduce((total, entry) => {
        return total + parseFloat(entry.purity || 0);
      }, 0)
      .toFixed(3);
  };

  useEffect(() => {
    fetchEntries();
    fetchTouch();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${BACKEND_SERVER_URL}/api/entries`);
      console.log("response cashgold", response.data);
      const data = response.data;
      setEntries(data);

      if (isFirstLoad.current && data.length > 0) {
        const lastPage = Math.floor((data.length - 1) / rowsPerPage);
        setPage(lastPage);
        isFirstLoad.current = false;
      }
    } catch (error) {
      console.error("Error fetching entries:", error);
    }
  };
  const fetchTouch = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
      console.log("masterTouch", res.data);
      setMasterTouch(res.data);
    } catch (err) {
      console.error("Failed to fetch touch values", err);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedEntries = entries.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <div className="cashgold-container">
      <ToastContainer position="top-right" autoClose={3000} />
      {/* <h2>Cash/Gold</h2> */}
      {/* <button className="add-btn" >
        Add Cash or Gold
      </button> */}
       <Button
       
          style={{
            backgroundColor: "#F5F5F5",
            color: "black",
            borderColor: "#25274D",
            borderStyle: "solid",
            borderWidth: "2px",
          }}
          variant="contained"
          onClick={() => setShowFormPopup(true)}
        >
           Add Cash or Gold
        </Button>

      {showFormPopup && (
        <div className="popup-overlay">
          <div className="popup-cont">
            <h3>{formData.id ? "Edit Cash or Gold Details" : "Enter Cash or Gold Details"}</h3>
            <button
              className="close-btn"
              onClick={() => handleClose()}
            >
              ×
            </button>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Type:</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  <option value="Select">Select</option>
                  <option value="Cash">Cash</option>
                  <option value="Cash RTGS">Cash RTGS</option>
                  <option value="Gold">Gold</option>
                </select>
              </div>

              {(formData.type === "Cash" || formData.type === "Cash RTGS") && (
                <>
                  <div className="form-group">
                    <label>Cash Amount:</label>
                    <input
                      type="number"
                      name="cashAmount"
                      value={formData.cashAmount}
                      onChange={handleChange}
                      required
                      step="0.01"
                      onWheel={(e) => e.target.blur()}
                    />
                    {goldCashError.cashAmount && (
                      <p style={{ color: "red" }}>{goldCashError.cashAmount}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Gold Rate (per gram):</label>
                    <input
                      type="number"
                      value={goldRate}
                      onChange={(e) => setGoldRate(e.target.value)}
                      required
                      step="0.01"
                      onWheel={(e) => e.target.blur()}
                    />
                    {goldCashError.goldRate && (
                      <p style={{ color: "red" }}>{goldCashError.goldRate}</p>
                    )}
                  </div>
                  <div className="direct-Touch">
                    <label>Touch (%):</label>
                    <Autocomplete
                      freeSolo
                      forcePopupIcon
                      options={masterTouch.map((item) => item.touch.toString())}
                      value={formData.touch ? formData.touch.toString() : ""}
                      onChange={(event, newValue) => {
                        handleChange({
                          target: {
                            name: "touch",
                            value: newValue || "",
                          },
                        });
                      }}
                      noOptionsText=""
                      sx={{
                        width: 400,
                        "& .MuiInputBase-root": {
                          height: 40,
                          padding: "2px !important",
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          name="touch"
                          required
                          size="small"
                          onChange={(e) => handleChange(e)}
                          inputProps={{
                            ...params.inputProps,
                            style: { padding: "8px" },
                          }}
                        />
                      )}
                    />
                    {goldCashError.touch && (
                      <p style={{ color: "red" }}>{goldCashError.touch}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Purity (g):</label>
                    <input
                      type="number"
                      name="purity"
                      value={formData.purity}
                      readOnly
                      className="read-only"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pure Gold (g):</label>
                    <input
                      type="number"
                      name="pureGold"
                      value={formData.pureGold}
                      readOnly
                      className="read-only"
                    />
                  </div>
                </>
              )}

              {formData.type === "Gold" && (
                <>
                  <div className="form-group">
                    <label>Gold Value (g):</label>
                    <input
                      type="number"
                      name="goldValue"
                      value={formData.goldValue}
                      onChange={handleChange}
                      required
                      step="0.001"
                      onWheel={(e) => e.target.blur()}
                    />
                    {goldCashError.goldValue && (
                      <p style={{ color: "red" }}>{goldCashError.goldValue}</p>
                    )}
                  </div>
                  <div className="direct-Touch">
                    <label>Touch (%):</label>
                    <Autocomplete
                      freeSolo
                      forcePopupIcon
                      options={masterTouch.map((item) => item.touch.toString())}
                      value={formData.touch ? formData.touch.toString() : ""}
                      onChange={(event, newValue) => {
                        handleChange({
                          target: {
                            name: "touch",
                            value: newValue || "",
                          },
                        });
                      }}
                      noOptionsText=""
                      sx={{
                        width: 400,
                        "& .MuiInputBase-root": {
                          height: 40, // same height as your other input
                          padding: "2px !important",
                        },
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          name="touch"
                          required
                          size="small"
                          onChange={(e) => handleChange(e)}
                          inputProps={{
                            ...params.inputProps,
                            style: { padding: "8px" }, // adjust inner text padding
                          }}
                        />
                      )}
                    />

                    {goldCashError.touch && (
                      <p style={{ color: "red" }}>{goldCashError.touch}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Purity (g):</label>
                    <input
                      type="number"
                      name="purity"
                      value={formData.purity}
                      readOnly
                      className="read-only"
                    />
                  </div>
                </>
              )}

              <div className="button-group">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={saveDiasable ? true : false}
                  style={{ background: saveDiasable ? "grey" : "green" }}
                >
                  {saveDiasable ? "Saving.." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="entries-section">
        {/* <h3>Entries</h3> */}
        <table className="entries-table">
          <thead>
            <tr>
              <th>Sl. No.</th>
              <th>Date</th>
              <th>Type</th>
              <th>Amount/Value</th>
              <th>Touch</th>
              <th>Rate</th>
              <th>Purity (g)</th>
              <th>Pure Gold (g)</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEntries.length > 0 ? (
              <>
                {paginatedEntries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{page * rowsPerPage + index + 1}</td>
                    <td>{new Date(entry.date).toLocaleDateString("en-IN")}</td>
                    <td>{entry.type}</td>
                    <td>
                      {(entry.type === "Cash" || entry.type === "Cash RTGS")
                        ? `₹${parseFloat(entry.cashAmount).toFixed(2)}`
                        : `${parseFloat(entry.goldValue).toFixed(3)}g`}
                    </td>
                    <td>
                      {entry.touch ? `${entry.touch}%` : "-"}
                    </td>
                    <td>
                      {(entry.type === "Cash" || entry.type === "Cash RTGS")
                        ? `₹${parseFloat(entry.goldRate).toFixed(2)}/g`
                        : `-`}
                    </td>
                    <td>{parseFloat(entry.purity).toFixed(3)}</td>
                     <td>
                      {(entry.type === "Cash" || entry.type === "Cash RTGS") && entry.touch && entry.purity
                        ? ((parseFloat(entry.purity) / parseFloat(entry.touch)) * 100).toFixed(3)
                        : "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <IconButton onClick={() => handleEdit(entry)} style={{ color: "#0074d9" }}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(entry.id)} style={{ color: "red" }}>
                        <DeleteIcon />
                      </IconButton>
                    </td>
                  </tr>
                ))}

                <tr className="totals-row">
                  <td colSpan="6">
                    <strong>Total Purity</strong>
                  </td>
                  <td>
                    <strong>{calculateTotalPurity()}g</strong>
                  </td>
                  <td colSpan="3"></td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan="10" style={{ textAlign: "center" }}>No details found</td>
              </tr>
            )}
          </tbody>
        </table>
        <TablePagination
          component="div"
          count={entries.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </div>
    </div>
  );
}

export default Cashgold;
