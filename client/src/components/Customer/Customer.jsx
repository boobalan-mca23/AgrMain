
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
  TableContainer,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PreviewIcon from "@mui/icons-material/Preview";
import ReceiptIcon from '@mui/icons-material/Receipt';

import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Customer.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const Customer = () => {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/customers`);
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    const nameMatch =
      customer.name &&
      customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = customer.phone && customer.phone.includes(searchTerm);
    const addressMatch =
      customer.address &&
      customer.address.toLowerCase().includes(searchTerm.toLowerCase());

    return nameMatch || phoneMatch || addressMatch;
  });

  

  return (
    <Container maxWidth="lg">
      <ToastContainer position="top-right" autoClose={3000} />
      <Paper className="customer-table-container" elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Customer Details
        </Typography>

        <TextField
          label="Search Customer"
          variant="outlined"
          fullWidth
          margin="normal"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "30px",
              width: "22rem",
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

        {filteredCustomers.length > 0 ? (
          <TableContainer>
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
                    <strong>S.no</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Customer Name</strong>
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
                {filteredCustomers.map((customer, index) => (
                  <TableRow key={index} hover>
                    <TableCell align="center">{index+1}</TableCell>
                    <TableCell align="center">{customer.name}</TableCell>
                    <TableCell align="center">{customer.phone}</TableCell>
                    <TableCell align="center">{customer.address}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Orders">
                        <IconButton
                          onClick={() =>
                            navigate(
                              `/customerorders?id=${
                                customer.id
                              }&name=${encodeURIComponent(customer.name)}`
                            )
                          }
                        >
                          <ShoppingCartIcon style={{ color: "#1976d2" }} />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="View Transactions">
                        <IconButton
                          onClick={() =>
                            navigate(
                              `/customertrans?id=${
                                customer.id
                              }&name=${encodeURIComponent(customer.name)}`
                            )
                          }
                        >
                          <PreviewIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Receipts">
                         <IconButton
                          onClick={() =>
                            navigate(
                              `/receipt?id=${
                                customer.id
                              }&name=${encodeURIComponent(customer.name)}`
                            )
                          }
                        >
                          <ReceiptIcon color="primary" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body1" align="center">
            No customer details available.
          </Typography>
        )}
      </Paper>

      
    </Container>
  );
};

export default Customer;
