import React, { useState, useEffect, useRef } from "react";
import "./Mastercustomer.css";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
} from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";

function MasterCustomer() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [customers, setCustomers] = useState([]);

  const [errors, setErrors] = useState({ name: "", phone: "" });
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [submitted, setSubmitted] = useState(false);

  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const addressRef = useRef(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/customers`);
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        }
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };
    fetchCustomers();
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
    setCustomerName("");
    setPhoneNumber("");
    setAddress("");
    setErrors({ name: "", phone: "" });
    setTouched({ name: false, phone: false });
    setSubmitted(false);
    // single, programmatic focus to avoid autoFocus/blur loops
    setTimeout(() => nameRef.current?.focus(), 0);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const validateField = (field, value) => {
    let error = "";
    if (field === "name") {
      if (!value.trim()) error = "Customer name is required.";
    }
    if (field === "phone") {
      if (!value.trim()) {
        error = "Phone number is required.";
      } else if (!/^\d{10}$/.test(value)) {
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

  const validateForm = () => {
    const nameValid = validateField("name", customerName);
    const phoneValid = validateField("phone", phoneNumber);
    return nameValid && phoneValid;
  };

  const handleSaveCustomer = async () => {
    setSubmitted(true); // gate showing errors on untouched fields

    // compute validity synchronously for focusing logic
    const nameOk = customerName.trim().length > 0;
    const phoneOk = /^\d{10}$/.test(phoneNumber.trim());

    if (!validateForm()) {
      if (!nameOk) {
        nameRef.current?.focus();
      } else if (!phoneOk) {
        phoneRef.current?.focus();
      }
      return;
    }

    const customerData = {
      name: customerName.trim(),
      phone: phoneNumber.trim(),
      address: address.trim(),
    };

    try {
      const response = await fetch(`${BACKEND_SERVER_URL}/api/customers/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });

      if (response.ok) {
        const newCustomer = await response.json();
        setCustomers((prev) => [...prev, newCustomer]);
        toast.success("Customer added successfully!");
        closeModal();
      } else {
        const err = await response.json();
        toast.error(err.message);
      }
    } catch (error) {
       console.error("Error saving customer:", error);
       toast.error(error.response.data.message,{autoClose:1000});
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={1000} hideProgressBar />

      <div className="customer-container">
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
          Add Customer
        </Button>

        {/* Turn off Dialog's auto focus to avoid initial blur shenanigans */}
        <Dialog open={isModalOpen} onClose={closeModal} disableAutoFocus>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogContent>
            {/* Customer Name */}
            <TextField
              inputRef={nameRef}
              margin="dense"
              label="Customer Name"
              type="text"
              fullWidth
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
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

            {/* Phone Number */}
            <TextField
              inputRef={phoneRef}
              margin="dense"
              label="Phone Number"
              type="tel"
              fullWidth
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (touched.phone || submitted) validateField("phone", e.target.value);
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
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveCustomer();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeModal} color="secondary">
              Cancel
            </Button>
            <Button onClick={handleSaveCustomer} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {customers.length > 0 && (
          <Paper >
            <table  width="100%" className="customer-table">
              <thead>
                <tr className="customer-tablehead">
                  <th>S.no</th>
                  <th >Customer Name</th>
                  <th>Phone Number</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody className="customer-tablebody">
                {customers.map((customer, index) => (
                  <tr key={index}>
                    <td>{index+1}</td>
                    <td>{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.address || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        )}
      </div>
    </>
  );
}

export default MasterCustomer;
