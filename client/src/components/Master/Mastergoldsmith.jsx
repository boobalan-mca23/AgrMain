import React, { useState } from "react";
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
  const [goldsmithName, setgoldsmithName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [goldsmith, setGoldsmith] = useState([]);

  const openModal = () => {
    setIsModalOpen(true);
    setgoldsmithName("");
    setPhoneNumber("");
    setAddress("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveGoldsmith = async () => {
    if (goldsmithName.trim()) {
      const newGoldsmith = {
        name: goldsmithName,
        phonenumber: phoneNumber || null,
        address: address || null,
      };

      try {
        const response = await axios.post(
          `${BACKEND_SERVER_URL}/api/goldsmith`,
          newGoldsmith
        );

        setGoldsmith([...goldsmith, response.data]);
        closeModal();
        toast.success("Goldsmith added successfully!");
      } catch (error) {
        console.error("Error creating goldsmith:", error);
        toast.error("Failed to add goldsmith. Please try again.");
      }
    } else {
      toast.warn("Please enter the goldsmith's name.");
    }
  };

  return (
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
        Add Goldsmith
      </Button>

      <Dialog open={isModalOpen} onClose={closeModal}>
        <DialogTitle>Add New Goldsmith</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Goldsmith Name"
            type="text"
            fullWidth
            autoComplete="off"
            value={goldsmithName}
            onChange={(e) => setgoldsmithName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Phone Number"
            type="tel"
            fullWidth
            autoComplete="off"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Address"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={address}
            autoComplete="off"
            onChange={(e) => setAddress(e.target.value)}
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
      <ToastContainer
        position="top-right" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {goldsmith.length > 0 && (
        <Paper className="customer-table">
          <table border="1" width="100%">
            <thead>
              <tr>
                <th>Goldsmith Name</th>
                <th>Phone Number</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {goldsmith.map((goldsmith, index) => (
                <tr key={index}>
                  <td>{goldsmith.name}</td>
                  <td>{goldsmith.phone}</td>
                  <td>{goldsmith.address}</td>
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
