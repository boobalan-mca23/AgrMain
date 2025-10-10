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
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
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
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedGoldsmith, setSelectedGoldsmith] = useState(null);
  const [errors, setErrors] = useState({ name: "", phone: "" });
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [submitted, setSubmitted] = useState(false);
  const validName = /^[a-zA-Z0-9\s]+$/;
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);

  useEffect(() => {
    fetchGoldsmiths();
  }, []);

  const fetchGoldsmiths = async () => {
    try {
      const { data } = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
      setGoldsmith(data);
    } catch (error) {
      console.error("Error fetching goldsmiths:", error);
      toast.error("Failed to load goldsmith data.");
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
    setGoldsmithName("");
    setPhoneNumber("");
    setAddress("");
    setErrors({ name: "", phone: "" });
    setTouched({ name: false, phone: false });
    setSubmitted(false);
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSubmitted(false);
  };

  // Generic add-field validation (used by Add modal)
  const validateField = (field, value) => {
    let error = "";
    if (field === "name") {
      if (!value.trim()) {
        error = "Goldsmith name is required.";
      } else if (!validName.test(value.trim())) {
        error = "Special characters are not allowed.";
      } else if (
        goldsmith.some((g) => g.name.toLowerCase() === value.trim().toLowerCase())
      ) {
        error = "Goldsmith name already exists.";
      }
    }
    if (field === "phone" && value.trim()) {
      if (!/^\d{10}$/.test(value)) {
        error = "Phone number must be 10 digits.";
      }
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return error === "";
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  // Unified keydown which accepts a submit callback (so Add vs Edit behave correctly)
  const handleKeyDown = (e, field, submitFn) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "name") {
        phoneRef.current?.focus();
      } else if (field === "phone") {
        addressRef.current?.focus();
      } else if (field === "address") {
        if (typeof submitFn === "function") submitFn();
      }
    }
  };

  // Add: validate add form (uses add-state variables)
  const validateFormForAdd = () => {
    const nameValid = validateField("name", goldsmithName);
    const phoneValid = validateField("phone", phoneNumber || "");
    return nameValid && phoneValid;
  };

  // Edit: validate edit form (uses formData, excludes the selected record from duplicate-check)
  const validateFormForEdit = () => {
    let nameError = "";
    const nameVal = formData.name || "";

    if (!nameVal.trim()) {
      nameError = "Goldsmith name is required.";
    } else if (!validName.test(nameVal.trim())) {
      nameError = "Special characters are not allowed.";
    } else if (
      goldsmith.some(
        (g) =>
          selectedGoldsmith &&
          g.id !== selectedGoldsmith.id &&
          g.name.toLowerCase() === nameVal.trim().toLowerCase()
      )
    ) {
      nameError = "Goldsmith name already exists.";
    }

    let phoneError = "";
    const phoneVal = formData.phone || "";
    if (phoneVal.trim() && !/^\d{10}$/.test(phoneVal.trim())) {
      phoneError = "Phone number must be 10 digits.";
    }

    setErrors((prev) => ({ ...prev, name: nameError, phone: phoneError }));
    return nameError === "" && phoneError === "";
  };

  // Add Goldsmith
  const handleSaveGoldsmith = async () => {
    setSubmitted(true);

    if (!validateFormForAdd()) {
      nameRef.current?.focus();
      return;
    }

    // extra duplicate guard (case-insensitive)
    if (
      goldsmith.some((g) => g.name.toLowerCase() === goldsmithName.trim().toLowerCase())
    ) {
      toast.error("Goldsmith name already exists!", { autoClose: 2000 });
      return;
    }

    if (!validName.test(goldsmithName.trim())) {
      toast.warn("Special characters are not allowed.", { autoClose: 2000 });
      return;
    }

    const newGoldsmith = {
      name: goldsmithName.trim(),
      phonenumber: phoneNumber.trim() ? phoneNumber.trim() : null,
      address: address.trim() || null,
    };

    try {
      const { data } = await axios.post(
        `${BACKEND_SERVER_URL}/api/goldsmith`,
        newGoldsmith
      );
      setGoldsmith((prev) => [...prev, data]);
      toast.success("Goldsmith added successfully!");
      closeModal();
    } catch (error) {
      console.error("Error creating goldsmith:", error);
      toast.error(error.response?.data?.message || "Failed to add goldsmith", {
        autoClose: 2000,
      });
    }
  };

  // Edit Goldsmith
  const handleEditClick = (item) => {
    setSelectedGoldsmith(item);
    setFormData({
      name: item.name || "",
      phone: item.phone || "",
      address: item.address || "",
    });
    setErrors({ name: "", phone: "" });
    setTouched({ name: false, phone: false });
    setSubmitted(false);
    setOpenEditDialog(true);
    // focus the name input after dialog opens
    requestAnimationFrame(() => nameRef.current?.focus());
  };

  const handleEditSubmit = async () => {
    setSubmitted(true);

    if (!validateFormForEdit()) {
      nameRef.current?.focus();
      return;
    }

    if (!validName.test((formData.name || "").trim())) {
      toast.warn("Special characters are not allowed.", { autoClose: 2000 });
      return;
    }

    // prepare payload (normalize phone -> null if empty)
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone ? formData.phone.trim() : null,
      address: formData.address ? formData.address.trim() : null,
    };

    try {
      const response = await axios.put(
        `${BACKEND_SERVER_URL}/api/goldsmith/${selectedGoldsmith.id}`,
        payload
      );

      setGoldsmith((prev) =>
        prev.map((g) => (g.id === selectedGoldsmith.id ? response.data : g))
      );

      toast.success("Goldsmith updated successfully");
      setOpenEditDialog(false);
      setSubmitted(false);
    } catch (error) {
      console.error("Error updating goldsmith:", error);
      toast.error(error.response?.data?.message || "Failed to update goldsmith");
    }
  };

  // Delete Goldsmith
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this goldsmith?")) return;

    try {
      await axios.delete(`${BACKEND_SERVER_URL}/api/goldsmith/${id}`);
      setGoldsmith((prev) => prev.filter((g) => g.id !== id));
      toast.success("Goldsmith deleted successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Cannot delete this goldsmith. It may be linked to other records.",
        { autoClose: 2500 }
      );
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

      <Dialog open={isModalOpen} onClose={closeModal} disableAutoFocus>
        <DialogTitle>Add New Goldsmith</DialogTitle>
        <DialogContent>
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
            error={(touched.name || submitted) && !!errors.name}
            helperText={(touched.name || submitted) ? errors.name : ""}
            onKeyDown={(e) => handleKeyDown(e, "name", handleSaveGoldsmith)}
          />

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
              if (touched.phone || submitted) validateField("phone", e.target.value);
            }}
            onBlur={(e) => handleBlur("phone", e.target.value)}
            error={(touched.phone || submitted) && !!errors.phone}
            helperText={(touched.phone || submitted) ? errors.phone : ""}
            onKeyDown={(e) => handleKeyDown(e, "phone", handleSaveGoldsmith)}
          />

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
            onKeyDown={(e) => handleKeyDown(e, "address", handleSaveGoldsmith)}
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
          <table className="goldSmith-table" width="100%">
            <thead>
              <tr className="goldSmith-tablehead">
                <th>S.no</th>
                <th>Goldsmith Name</th>
                <th>Phone Number</th>
                <th>Address</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody className="goldSmith-tablebody">
              {goldsmith.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.phone || "-"}</td>
                  <td>{item.address || "-"}</td>
                  <td>
                    <EditIcon
                      style={{ cursor: "pointer", marginRight: "10px", color: "#388e3c" }}
                      onClick={() => handleEditClick(item)}
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
      )}

      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Goldsmith</DialogTitle>
        <DialogContent>
          <TextField
            inputRef={nameRef}
            label="Name"
            value={formData.name}
            fullWidth
            margin="normal"
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (submitted || touched.name) validateFormForEdit();
            }}
            onBlur={() => {
              setTouched((p) => ({ ...p, name: true }));
              validateFormForEdit();
            }}
            error={(touched.name || submitted) && !!errors.name}
            helperText={(touched.name || submitted) ? errors.name : ""}
            /* removed onKeyDown for Edit per your request */
          />
          <TextField
            inputRef={phoneRef}
            label="Phone"
            value={formData.phone}
            fullWidth
            margin="normal"
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              if (submitted || touched.phone) validateFormForEdit();
            }}
            onBlur={() => {
              setTouched((p) => ({ ...p, phone: true }));
              validateFormForEdit();
            }}
            error={(touched.phone || submitted) && !!errors.phone}
            helperText={(touched.phone || submitted) ? errors.phone : ""}
            /* removed onKeyDown for Edit per your request */
          />
          <TextField
            inputRef={addressRef}
            label="Address"
            value={formData.address}
            fullWidth
            margin="normal"
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            /* removed onKeyDown for Edit per your request */
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Mastergoldsmith;
