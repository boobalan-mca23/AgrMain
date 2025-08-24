import React, { useState, useEffect } from "react";
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

  // ✅ Fetch goldsmith data when component loads
  useEffect(() => {
    const fetchGoldsmiths = async () => {
      try {
        const response = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
        setGoldsmith(response.data); // assuming API returns an array
      } catch (error) {
        console.error("Error fetching goldsmiths:", error);
        toast.error("Failed to load goldsmith data.");
      }
    };

    fetchGoldsmiths();
  }, []);

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
        phone: phoneNumber || null,
        address: address || null,
      };

      try {
        const response = await axios.post(
          `${BACKEND_SERVER_URL}/api/goldsmith`,
          newGoldsmith
        );

        setGoldsmith((prev) => [...prev, response.data]); // update state
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
              {goldsmith.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.phone}</td>
                  <td>{item.address}</td>
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
