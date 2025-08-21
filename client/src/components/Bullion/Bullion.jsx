import React, { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
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
      }
    } else {
      toast.error("Please provide valid Amount, Touch, and Rate.");
    }
  };

const handleSave = async () => {
  try {
    const currentRate = parseFloat(rate);
    const amountVal = parseFloat(newGivenAmount);
    const touchVal = parseFloat(newGivenTouch);

    let finalGivenEntries = [...givenEntries];
    if (
      !isNaN(amountVal) &&
      !isNaN(touchVal) &&
      !isNaN(currentRate) &&
      currentRate > 0 &&
      touchVal > 0
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
      toast.success("Bullion purchase created successfully");
    } else {
      const newEntries = finalGivenEntries.slice(givenEntries.length);
      if (newEntries.length > 0) {
        await axios.put(
          `${BACKEND_SERVER_URL}/api/bullion-purchase/given-details/${editId}`,
          { givenDetails: newEntries }
        );
        toast.success("Installments updated successfully");
      } else {
        toast.info("No new installments to update");
      }
    }

    fetchAll();
    closeDialog();
  } catch (err) {
    console.error("Failed to save bullion purchase", err);
    toast.error("Failed to save purchase");
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
      <Button variant="contained" onClick={() => openDialog()}>
        New Purchase
      </Button>

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
            <TableCell>Name</TableCell>
            <TableCell>Grams</TableCell>
            <TableCell>Rate</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Given Details</TableCell>
            <TableCell>Balance (Grams)</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {allData.map((row) => {
            const rowTotalGivenGrams = calculateTotalGivenGrams(
              row.givenDetails || []
            );
            const rowBalanceInGrams = (row.grams - rowTotalGivenGrams).toFixed(
              2
            );

            return (
              <TableRow key={row.id}>
                <TableCell>{row.bullion?.name}</TableCell>
                <TableCell>{row.grams}</TableCell>
                <TableCell>{row.rate}</TableCell>
                <TableCell>{row.amount?.toFixed(2)}</TableCell>
                <TableCell>
                  {row.givenDetails?.length > 0 ? (
                    row.givenDetails.map((entry, i) => (
                      <Typography key={i}>
                        ₹ {entry.amount?.toFixed(2)} ({entry.grams?.toFixed(2)}{" "}
                        g @ {entry.touch?.toFixed(2)} T) → P:{" "}
                        {entry.purity?.toFixed(2)} g
                      </Typography>
                    ))
                  ) : (
                    <Typography>-</Typography>
                  )}
                </TableCell>
                <TableCell
                  style={{
                    color: parseFloat(rowBalanceInGrams) <= 0 ? "green" : "red",
                  }}
                >
                  {rowBalanceInGrams} g
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => openDialog(row)}>
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(row.id)}>
                    <DeleteIcon color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={closeDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editId ? "Update Bullion Purchase" : "New Bullion Purchase"}
        </DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Name"
            fullWidth
            margin="normal"
            value={selectedNameId}
            onChange={(e) => setSelectedNameId(e.target.value)}
            disabled={isEditMode}
          >
            {names.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>

          <Box className="input-row">
            <TextField
              label="Total Grams"
              type="number"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              fullWidth
              disabled={isEditMode}
              onWheel={(e) => e.target.blur()}
            />
            <TextField
              label="Rate per gram"
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
                label="Grams (Calculated)"
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
                label="Purity (Calculated)"
                type="number"
                value={newGivenPurityCalculated.toFixed(2)}
                onWheel={(e) => e.target.blur()}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <IconButton
                onClick={handleAddGiven}
                disabled={!rate || !newGivenAmount || !newGivenTouch}
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
          <Button variant="contained" onClick={handleSave}>
            {editId ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Bullion;
