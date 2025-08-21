
import React, { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Goldsmith.css";
import { Link } from "react-router-dom";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const Goldsmith = () => {
  const [goldsmith, setGoldsmith] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedGoldsmith, setSelectedGoldsmith] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    const fetchGoldsmiths = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/goldsmith`);
        const data = await response.json();
        setGoldsmith(data);
      } catch (error) {
        console.error("Error fetching goldsmith data:", error);
      }
    };
    fetchGoldsmiths();
  }, []);

  const handleEditClick = (goldsmith) => {
    setSelectedGoldsmith(goldsmith);
    setFormData({
      name: goldsmith.name,
      phone: goldsmith.phone,
      address: goldsmith.address,
    });
    setOpenEditDialog(true);
  };

  const handleEditSubmit = async () => {
    try {
      const response = await fetch(
        `${BACKEND_SERVER_URL}/api/goldsmith/${selectedGoldsmith.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        toast.success("Goldsmith updated successfully");

        setGoldsmith((prev) =>
          prev.map((g) =>
            g.id === selectedGoldsmith.id ? { ...g, ...formData } : g
          )
        );

        setOpenEditDialog(false);
      } else {
        toast.error("Failed to update goldsmith");
      }
    } catch (error) {
      toast.error("Error updating goldsmith");
    }
  };

  const filteredGoldsmith = goldsmith.filter((gs) => {
    const nameMatch =
      gs.name && gs.name.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = gs.phone && gs.phone.includes(searchTerm);
    const addressMatch =
      gs.address && gs.address.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || phoneMatch || addressMatch;
  });

  return (
    <Container maxWidth="md">
      <Paper className="customer-details-container" elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" align="center" gutterBottom>
         Goldsmith Details
        </Typography>

        <TextField
          label="Search Goldsmith Name"
          variant="outlined"
          fullWidth
          margin="normal"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "30px",
              width: "18rem",
              backgroundColor: "#f8f9fa",
              "&.Mui-focused": {
                backgroundColor: "#ffffff",
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon style={{ color: "#777" }} />
              </InputAdornment>
            ),
          }}
        />

        <Table>
          <TableHead
            sx={{
              backgroundColor: "#e3f2fd",
              "& th": {
                backgroundColor: "#e3f2fd",
                color: "#0d47a1",
                fontWeight: "bold",
                fontSize: "1rem",
              },
            }}
          >
            <TableRow>
              <TableCell align="center">
                <strong>Goldsmith Name</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Phone Number</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Address</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGoldsmith.length > 0 ? (
              filteredGoldsmith.map((goldsmith, index) => (
                <TableRow key={index}>
                  <TableCell align="center">{goldsmith.name}</TableCell>
                  <TableCell align="center">{goldsmith.phone}</TableCell>
                  <TableCell align="center">{goldsmith.address}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Jobcard">
                      <Link
                        to={`/goldsmithcard/${goldsmith.id}/${goldsmith.name}`}
                        state={{
                          phone: goldsmith.phone,
                          address: goldsmith.address,
                        }}
                        style={{ marginRight: "10px", color: "#1976d2" }}
                      >
                        <AssignmentIndOutlinedIcon
                          style={{ cursor: "pointer" }}
                        />
                      </Link>
                    </Tooltip>

                    <Tooltip title="Edit">
                      <EditIcon
                        style={{
                          cursor: "pointer",
                          marginRight: "10px",
                          color: "#388e3c",
                        }}
                        onClick={() => handleEditClick(goldsmith)}
                      />
                    </Tooltip>

                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
               No goldsmith details available...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>


      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Goldsmith</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={formData.name}
            fullWidth
            margin="normal"
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            label="Phone"
            value={formData.phone}
            fullWidth
            margin="normal"
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
          <TextField
            label="Address"
            value={formData.address}
            fullWidth
            margin="normal"
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            color="primary"
          >
           Save
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer position="top-right" autoClose={3000} />
    </Container>
  );
};

export default Goldsmith;
