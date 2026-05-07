import React, { useEffect, useState, useRef } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Typography,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
} from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Bullion.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const Bullion = () => {
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState([]);
  const [selectedNameId, setSelectedNameId] = useState("");
  const [grams, setGrams] = useState("");
  const [rate, setRate] = useState("");
  const [totalPurchaseAmount, setTotalPurchaseAmount] = useState(0);
  const [givenEntries, setGivenEntries] = useState([]);
  const [newGivenAmount, setNewGivenAmount] = useState("");
  const [newGivenGramsCalculated, setNewGivenGramsCalculated] = useState(0);
  const [newGivenTouch, setNewGivenTouch] = useState("");
  const [newGivenPurityCalculated, setNewGivenPurityCalculated] = useState(0);
  const [allData, setAllData] = useState([]);
  const [editId, setEditId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search and Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const isFirstLoad = useRef(true);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(0); // Reset to first page on search
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredData = allData.filter((item) =>
    item.bullion?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const openDialog = async (editData = null) => {
    setOpen(true);
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-bullion/`);
      setNames(res.data);
    } catch (err) {
      console.error("Failed to fetch bullion entries:", err);
    }

    if (editData) {
      setEditId(editData.id);
      setIsEditMode(true);
      setSelectedNameId(editData.bullionId);
      setGrams(editData.grams);
      setRate(editData.rate);
      setTotalPurchaseAmount(editData.amount);
      setGivenEntries(editData.givenDetails || []);
    } else {
      resetAll();
    }
  };

  const closeDialog = () => {
    setOpen(false);
    resetAll();
  };

  const resetAll = () => {
    setSelectedNameId("");
    setGrams("");
    setRate("");
    setTotalPurchaseAmount(0);
    setGivenEntries([]);
    setNewGivenAmount("");
    setNewGivenGramsCalculated(0);
    setNewGivenTouch("");
    setNewGivenPurityCalculated(0);
    setEditId(null);
    setIsEditMode(false);
  };

  const fetchAll = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/bullion-purchase/`
      );
      setAllData(res.data);

      // If first load, jump to last page
      if (isFirstLoad.current && res.data.length > 0) {
        const lastPage = Math.floor((res.data.length - 1) / rowsPerPage);
        setPage(lastPage);
        isFirstLoad.current = false;
      }
    } catch (err) {
      console.error("Error fetching all bullion entries:", err);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const g = parseFloat(grams);
    const r = parseFloat(rate);
    setTotalPurchaseAmount(!isNaN(g) && !isNaN(r) ? g * r : 0);
  }, [grams, rate]);

  useEffect(() => {
    const currentRate = parseFloat(rate);
    const amountVal = parseFloat(newGivenAmount);

    if (!isNaN(amountVal) && !isNaN(currentRate) && currentRate > 0) {
      const calculatedGrams = amountVal / currentRate;
      setNewGivenGramsCalculated(calculatedGrams);

      const touchVal = parseFloat(newGivenTouch);
      setNewGivenPurityCalculated(
        !isNaN(touchVal) && touchVal > 0
          ? (calculatedGrams / touchVal) * 100
          : 0
      );
    } else {
      setNewGivenGramsCalculated(0);
      setNewGivenPurityCalculated(0);
    }
  }, [newGivenAmount, rate, newGivenTouch]);

  const calculateTotalGivenGrams = (entries) =>
    entries.reduce((sum, entry) => sum + (entry.grams || 0), 0);

  const handleAddGiven = async () => {
    if (isSaving) return;
    if (!editId) {
      toast.error("Save the purchase first before adding installments.");
      return;
    }

    const currentRate = parseFloat(rate);
    const amountVal = parseFloat(newGivenAmount);
    const touchVal = parseFloat(newGivenTouch);

    if (
      !isNaN(amountVal) &&
      !isNaN(touchVal) &&
      !isNaN(currentRate) &&
      currentRate > 0 &&
      touchVal > 0
    ) {
      const gramsForEntry = amountVal / currentRate;
      const purityForEntry = (gramsForEntry / touchVal) * 100;

      const updatedGiven = [
        ...givenEntries,
        {
          amount: amountVal,
          grams: gramsForEntry,
          touch: touchVal,
          purity: purityForEntry,
        },
      ];

      try {
        setIsSaving(true);
        await axios.put(
          `${BACKEND_SERVER_URL}/api/bullion-purchase/given-details/${editId}`,
          { givenDetails: updatedGiven }
        );
        toast.success("Installment added successfully.");
        setGivenEntries(updatedGiven);
        setNewGivenAmount("");
        setNewGivenTouch("");
        setNewGivenGramsCalculated(0);
        setNewGivenPurityCalculated(0);
        fetchAll();
      } catch (err) {
        console.error("Failed to add given detail", err);
        toast.error("Failed to add Installment");
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.error("Please provide valid Amount, Touch, and Rate.");
    }
  };

  const handleSave = async () => {
    // Validation
    if (!selectedNameId) {
      toast.warning("Please select a Bullion name.");
      return;
    }
    if (!grams || parseFloat(grams) <= 0) {
      toast.warning("Please enter valid Total Grams.");
      return;
    }
    if (!rate || parseFloat(rate) <= 0) {
      toast.warning("Please enter valid Rate per gram.");
      return;
    }

    if (isSaving) return;
    try {
      setIsSaving(true);
      const currentRate = parseFloat(rate);
      const amountVal = parseFloat(newGivenAmount);
      const touchVal = parseFloat(newGivenTouch);

      let finalGivenEntries = [...givenEntries];
      if (
        !isNaN(amountVal) &&
        amountVal > 0 &&
        !isNaN(touchVal) &&
        touchVal > 0 &&
        !isNaN(currentRate) &&
        currentRate > 0
      ) {
        const gramsForEntry = amountVal / currentRate;
        const purityForEntry = (gramsForEntry * touchVal) / 100;
        finalGivenEntries.push({
          amount: amountVal,
          grams: gramsForEntry,
          touch: touchVal,
          purity: purityForEntry,
        });
      }

      if (!editId) {
        await axios.post(`${BACKEND_SERVER_URL}/api/bullion-purchase/create`, {
          bullionId: selectedNameId,
          grams: parseFloat(grams),
          rate: parseFloat(rate),
          amount: parseFloat(totalPurchaseAmount.toFixed(2)),
          givenDetails: finalGivenEntries,
        });
        
        // Jump to the last page
        const newTotal = allData.length + 1;
        const newPage = Math.floor((newTotal - 1) / rowsPerPage);
        setPage(newPage);

        toast.success("Bullion purchase created successfully");
      } else {
        // Update main fields
        await axios.put(`${BACKEND_SERVER_URL}/api/bullion-purchase/update/${editId}`, {
          bullionId: selectedNameId,
          grams: parseFloat(grams),
          rate: parseFloat(rate),
          amount: parseFloat(totalPurchaseAmount.toFixed(2)),
        });

        // Also check if there's a new installment to add
        const newEntries = finalGivenEntries.slice(givenEntries.length);
        if (newEntries.length > 0) {
          await axios.put(
            `${BACKEND_SERVER_URL}/api/bullion-purchase/given-details/${editId}`,
            { givenDetails: newEntries }
          );
          toast.success("Bullion purchase and installments updated successfully");
        } else {
          toast.success("Bullion purchase updated successfully");
        }
      }

      fetchAll();
      closeDialog();
    } catch (err) {
      console.error("Failed to save bullion purchase", err);
      toast.error("Failed to save purchase");
    } finally {
      setIsSaving(false);
    }
  };


  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase?"))
      return;
    try {
      await axios.delete(
        `${BACKEND_SERVER_URL}/api/bullion-purchase/delete/${id}`
      );
      toast.success("Purchase deleted successfully");
      
      // Adjust page if current page becomes empty after deletion
      const newTotal = allData.length - 1;
      const maxPage = Math.max(0, Math.ceil(newTotal / rowsPerPage) - 1);
      if (page > maxPage) {
        setPage(maxPage);
      }

      fetchAll();
    } catch (err) {
      console.error("Failed to delete purchase", err);
      toast.error("Failed to delete purchase");
    }
  };

  const currentTotalGivenGrams = calculateTotalGivenGrams(givenEntries);
  const liveTotalGivenGramsWithPending =
    currentTotalGivenGrams + (newGivenGramsCalculated || 0);
  const liveBalanceInGrams =
    (parseFloat(grams) || 0) - liveTotalGivenGramsWithPending;

  return (
    <div className="bullion-container">
      <Box sx={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
        <Button variant="contained" onClick={() => openDialog()}>
          New Purchase
        </Button>
        <TextField
          label="Search Bullion Name"
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={handleSearchChange}
          sx={{ width: "300px" }}
        />
      </Box>

      <Table>
        <TableHead
          sx={{
            backgroundColor: "#0074d9",
            "& th": {
              backgroundColor: "#0074d9",
              color: "white",
              fontWeight: "bold",
              fontSize: "1rem",
            },
          }}
        >
          <TableRow>
            <TableCell align="center">S.No</TableCell>
            <TableCell align="center">Name</TableCell>
            <TableCell align="center">Grams</TableCell>
            <TableCell align="center">Rate</TableCell>
            <TableCell align="center">Amount</TableCell>
            <TableCell align="center">Given Details</TableCell>
            <TableCell align="center">Balance (Grams)</TableCell>
            <TableCell align="center">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.length > 0 ? (
            paginatedData.map((row, index) => {
              const rowTotalGivenGrams = calculateTotalGivenGrams(
                row.givenDetails || []
              );
              const rowBalanceInGrams = (row.grams - rowTotalGivenGrams).toFixed(
                2
              );

              return (
                <TableRow key={row.id}>
                  <TableCell align="center">{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell align="center">{row.bullion?.name}</TableCell>
                  <TableCell align="center">{row.grams}</TableCell>
                  <TableCell align="center">{row.rate}</TableCell>
                  <TableCell align="center">{row.amount}</TableCell>
                  <TableCell align="center">
                    {row.givenDetails?.length > 0 ? (
                      row.givenDetails.map((entry, i) => (
                        <Typography key={i} align="center">
                          ₹ {entry.amount?.toFixed(2)} ({entry.grams?.toFixed(2)}{" "}
                          g @ {entry.touch?.toFixed(2)} T) → P:{" "}
                          {entry.purity?.toFixed(2)} g
                        </Typography>
                      ))
                    ) : (
                      <Typography align="center">-</Typography>
                    )}
                  </TableCell>
                  <TableCell
                    align="center"
                    style={{
                      color: parseFloat(rowBalanceInGrams) <= 0 ? "green" : "red",
                    }}
                  >
                    {rowBalanceInGrams} g
                  </TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => openDialog(row)}>
                      <EditIcon color="primary" />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(row.id)}>
                      <DeleteIcon color="error" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={8} align="center" style={{ padding: "20px", fontWeight: "bold", color: "#666" }}>
                {searchQuery ? "No matching bullion found" : "No Bullion Purchase Added"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <Dialog open={open} onClose={closeDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editId ? "Update Bullion Purchase" : "New Bullion Purchase"}
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Name*"
            fullWidth
            margin="normal"
            value={selectedNameId}
            onChange={(e) => setSelectedNameId(e.target.value)}
          >
            {names.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>

          <Box className="input-row">
            <TextField
              label="Total Grams*"
              type="number"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              fullWidth
              onWheel={(e) => e.target.blur()}
            />
            <TextField
              label="Rate per gram*"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              onWheel={(e) => e.target.blur()}
              fullWidth
            />
            <TextField
              label="Total Purchase Amount"
              type="number"
              value={totalPurchaseAmount.toFixed(2)}
              onWheel={(e) => e.target.blur()}
              InputProps={{ readOnly: true }}
              fullWidth
            />
          </Box>

          <Box mt={3}>
            <Typography variant="subtitle1">Given Details</Typography>
            {givenEntries.map((entry, index) => (
              <Box key={index} className="given-entry">
                <Typography>
                  ₹ {entry.amount?.toFixed(2)} ({entry.grams?.toFixed(2)} g @{" "}
                  {entry.touch?.toFixed(2)} T) → P: {entry.purity?.toFixed(2)} g
                </Typography>
              </Box>
            ))}

            <Box className="given-input">
              <TextField
                label="Enter Given Amount"
                type="number"
                value={newGivenAmount}
                onChange={(e) => setNewGivenAmount(e.target.value)}
                onWheel={(e) => e.target.blur()}
                fullWidth
              />
              <TextField
                label="Purity (Calculated)"
                type="number"
                value={newGivenGramsCalculated.toFixed(2)}
                onWheel={(e) => e.target.blur()}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <TextField
                label="Touch"
                type="number"
                value={newGivenTouch}
                onWheel={(e) => e.target.blur()}
                onChange={(e) => setNewGivenTouch(e.target.value)}
                fullWidth
              />
              <TextField
                label="Grams (Calculated)"
                type="number"
                value={newGivenPurityCalculated.toFixed(2)}
                onWheel={(e) => e.target.blur()}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <IconButton
                onClick={handleAddGiven}
                disabled={!rate || !newGivenAmount || !newGivenTouch || isSaving}
              >
                <AddCircleOutlineIcon color="primary" />
              </IconButton>
            </Box>

            <Box mt={2}>
              <Typography
                variant="h6"
                color={liveBalanceInGrams <= 0 ? "success.main" : "error.main"}
              >
                <strong>Balance:</strong> {liveBalanceInGrams.toFixed(2)}g
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : (editId ? "Save" : "Create")}
          </Button>
        </DialogActions>
      </Dialog>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Bullion;
