import React, { useState, useEffect, useRef } from "react";
import "./Mastergoldsmith.css";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
} from "@mui/material";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Mastergoldsmith() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goldsmithName, setGoldsmithName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [goldsmith, setGoldsmith] = useState([]);

  // validation state
  const [errors, setErrors] = useState({ name: "", phone: "" });
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [submitted, setSubmitted] = useState(false);

  // refs
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);

  useEffect(() => {
    const fetchGoldsmiths = async () => {
      try {
        const { data } = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
        setGoldsmith(data);
      } catch (error) {
        console.error("Error fetching goldsmiths:", error);
        toast.error("Failed to load goldsmith data.");
      }
    };
    fetchGoldsmiths();
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
    setGoldsmithName("");
    setPhoneNumber("");
    setAddress("");
    setErrors({ name: "", phone: "" });
    setTouched({ name: false, phone: false });
    setSubmitted(false);
    // single programmatic focus (prevents initial blur/touch flicker)
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const validateField = (field, value) => {
    let error = "";
    if (field === "name") {
      if (!value.trim()) error = "Goldsmith name is required.";
    }
    if (field === "phone") {
      const v = value.trim();
      if (v && !/^\d{10}$/.test(v)) error = "Phone number must be 10 digits.";
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const validateForm = () => {
    const nameValid = validateField("name", goldsmithName);
    const phoneValid = validateField("phone", phoneNumber);
    return nameValid && phoneValid;
  };

  const handleSaveGoldsmith = async () => {
    setSubmitted(true);

    // compute quickly for focusing
    const nameOk = goldsmithName.trim().length > 0;
    const phoneOk = phoneNumber.trim() === "" || /^\d{10}$/.test(phoneNumber.trim());

    if (!validateForm()) {
      if (!nameOk) {
        nameRef.current?.focus();
      } else if (!phoneOk) {
        phoneRef.current?.focus();
      }
      return;
    }

    const newGoldsmith = {
      name: goldsmithName.trim(),
      phonenumber: phoneNumber.trim() || null,
      address: address.trim() || null,
    };

    try {
      const { data } = await axios.post(`${BACKEND_SERVER_URL}/api/goldsmith`, newGoldsmith);
      setGoldsmith((prev) => [...prev, data]);
      toast.success("Goldsmith added successfully!");
      closeModal();
    } catch (error) {
      console.error("Error creating goldsmith:", error);
      toast.error(error.response.data.message,{autoClose:1000});
    }
  };

  return (
    <div className="goldSmith-container">
      <Button
        style={{
          backgroundColor: "#F5F5F5",
          color: "black",
          borderColor: "#25274D",
          borderStyle: "solid",
          borderWidth: "2px",
        }}
        variant="contained"
        onClick={openModal}
      >
        Add Goldsmith
      </Button>

      {/* disableAutoFocus avoids initial blur → no instant error */}
      <Dialog open={isModalOpen} onClose={closeModal} disableAutoFocus>
        <DialogTitle>Add New Goldsmith</DialogTitle>
        <DialogContent>
          {/* Goldsmith Name (required) */}
          <TextField
            inputRef={nameRef}
            margin="dense"
            label="Goldsmith Name"
            type="text"
            fullWidth
            autoComplete="off"
            value={goldsmithName}
            onChange={(e) => {
              setGoldsmithName(e.target.value);
              if (touched.name || submitted) validateField("name", e.target.value);
            }}
            onBlur={(e) => handleBlur("name", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                phoneRef.current?.focus();
              }
            }}
            error={(touched.name || submitted) && !!errors.name}
            helperText={(touched.name || submitted) ? errors.name : ""}
          />

          {/* Phone Number (optional, 10 digits if provided) */}
          <TextField
            inputRef={phoneRef}
            margin="dense"
            label="Phone Number"
            type="tel"
            fullWidth
            autoComplete="off"
            value={phoneNumber}
           onChange={(e) => {
              setPhoneNumber(e.target.value);
              if (touched.phone) validateField("phone", e.target.value);
            }}
            onBlur={(e) => handleBlur("phone", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addressRef.current?.focus();
              }
            }}
            error={(touched.phone || submitted) && !!errors.phone}
            helperText={(touched.phone || submitted) ? errors.phone : ""}
          />

          {/* Address (optional) */}
          <TextField
            inputRef={addressRef}
            margin="dense"
            label="Address"
            type="text"
            fullWidth
            multiline
            rows={4}
            autoComplete="off"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveGoldsmith();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModal} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSaveGoldsmith} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {goldsmith.length > 0 && (
        <Paper>
          <table  className="goldSmith-table" width="100%">
            <thead>
              <tr className="goldSmith-tablehead">
                <th>S.no</th>
                <th>Goldsmith Name</th>
                <th>Phone Number</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody className="goldSmith-tablebody">
              {goldsmith.map((item, index) => (
                <tr key={index} >
                  <td>{index+1}</td>
                  <td>{item.name}</td>
                  <td>{item.phone || "-"}</td>
                  <td>{item.address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Paper>
      )}
    </div>
  );
}

export default Mastergoldsmith;
