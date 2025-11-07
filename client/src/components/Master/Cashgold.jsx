import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Cashgold.css";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
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
    date: formattedToday,
    type: "Select",
    cashAmount: "",
    goldValue: "",
    touch: "",
    purity: "",
  });
  const [goldCashError, setGoldCashError] = useState({});
  const [saveDiasable, setSaveDisable] = useState(false);

  const handleClose=()=>{
   setShowFormPopup(false)
   setFormData({
    date: formattedToday,
    type: "Select",
    cashAmount: "",
    goldValue: "",
    touch: "",
    purity: "",
  })
  setGoldCashError({})
  }


  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...formData, [name]: value };

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
    if (formData.type === "Cash") {
      const cashAmount = parseFloat(formData.cashAmount);
      const rate = parseFloat(goldRate);
      if (!isNaN(cashAmount) && cashAmount > 0 && !isNaN(rate) && rate > 0) {
        setFormData((prevFormData) => ({
          ...prevFormData,
          purity: (cashAmount / rate).toFixed(3),
        }));
      } else {
        setFormData((prevFormData) => ({
          ...prevFormData,
          purity: "",
        }));
      }
    }
  }, [formData.cashAmount, goldRate, formData.type]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let calculatedPurity = 0;
    if (formData.type === "Cash") {
      calculatedPurity = formData.purity;
    } else if (formData.type === "Gold") {
      calculatedPurity = formData.purity;
    }

    const payload = {
      date: formData.date,
      type: formData.type,
      cashAmount:
        formData.type === "Cash" ? parseFloat(formData.cashAmount) : null,
      goldValue:
        formData.type === "Gold" ? parseFloat(formData.goldValue) : null,
      touch: formData.type === "Gold" ? parseFloat(formData.touch) : null,
      purity: parseFloat(calculatedPurity),
      goldRate: formData.type === "Cash" ? parseFloat(goldRate) : null,
    };
    if (payload.type === "Select") {
      return toast.warn("Please Select Gold or Cash Type");
    }
    const isValidationIsTrue = checkCashOrGold(payload, setGoldCashError);

    if (Object.keys(isValidationIsTrue).length === 0) {
      try {
        setSaveDisable(true);
        const response = await axios.post(
          `${BACKEND_SERVER_URL}/api/entries`,
          payload
        );
        toast.success("Value added successfully!");
        setEntries((prev) => [response.data, ...prev]);
        setFormData({
          date: formattedToday,
          type: "Select",
          cashAmount: "",
          goldValue: "",
          touch: "",
          purity: "",
        });
        setGoldRate(0);
        setShowFormPopup(false);
        setSaveDisable(false);
      } catch (err) {
        setSaveDisable(false);
        toast.error("Failed to add entry. Please try again.");
        console.error("Error submitting entry:", err);
      }
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
      setEntries(response.data);
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

  return (
    <div className="cashgold-container">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>Cash/Gold</h2>
      <button className="add-btn" onClick={() => setShowFormPopup(true)}>
        Add Cash or Gold
      </button>

      {showFormPopup && (
        <div className="popup-overlay">
          <div className="popup-cont">
            <h3>Enter Cash or Gold Details</h3>
            <button
              className="close-btn"
              onClick={() =>handleClose()}
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
                  <option value="Gold">Gold</option>
                </select>
              </div>

              {formData.type === "Cash" && (
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
                      value={formData.touch || ""}
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
                  {saveDiasable ? "CashOrGold is Saving.." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="entries-section">
        <h3>Entries</h3>
        {entries.length === 0 ? (
          <p>No entries yet. </p>
        ) : (
          <>
            <table className="entries-table">
              <thead>
                <tr>
                  <th>Sl. No.</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount/Value</th>
                  <th>Touch/Rate</th>
                  <th>Purity (g)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}</td>
                    <td>{new Date(entry.date).toLocaleDateString("en-IN")}</td>
                    <td>{entry.type}</td>
                    <td>
                      {entry.type === "Cash"
                        ? `₹${parseFloat(entry.cashAmount).toFixed(2)}`
                        : `${parseFloat(entry.goldValue).toFixed(3)}g`}
                    </td>
                    <td>
                      {entry.type === "Cash"
                        ? `₹${parseFloat(entry.goldRate).toFixed(2)}/g`
                        : `${entry.touch}%`}
                    </td>
                    <td>{parseFloat(entry.purity).toFixed(3)}</td>
                  </tr>
                ))}

                <tr className="totals-row">
                  <td colSpan="5">
                    <strong>Total Purity</strong>
                  </td>
                  <td>
                    <strong>{calculateTotalPurity()}g</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

export default Cashgold;
