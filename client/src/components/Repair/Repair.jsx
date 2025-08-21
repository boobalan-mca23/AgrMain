
import React, { useState, useEffect } from "react";
import "./Repair.css";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Checkbox,
  FormControlLabel,
  Select,
  InputLabel,
  FormControl,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const Repair = () => {
  const [open, setOpen] = useState(false);
  const [selectedGoldsmithId, setSelectedGoldsmithId] = useState("");
  const [givenWeights, setGivenWeights] = useState([0]);
  const [itemWeights, setItemWeights] = useState([0]);
  const [showWastage, setShowWastage] = useState(false);
  const [stoneValue, setStoneValue] = useState(0);
  const [wastageType, setWastageType] = useState("");
  const [multiInput1, setMultiInput1] = useState(0);
  const [multiInput2, setMultiInput2] = useState("");
  const [netWeight, setNetWeight] = useState(0);
  const [repairRecords, setRepairRecords] = useState([]);
  const [goldsmith, setGoldsmith] = useState([]);

  const total = (arr) => arr.reduce((acc, val) => acc + Number(val || 0), 0);
  const totalGiven = total(givenWeights);
  const totalItem = total(itemWeights);
  const difference = totalGiven - totalItem;

  const handleAddField = (setFunc, arr) => setFunc([...arr, 0]);

  useEffect(() => {
    const reducedWeight = totalItem - Number(stoneValue || 0);
    setMultiInput1(reducedWeight > 0 ? reducedWeight : 0);
  }, [totalItem, stoneValue]);

  useEffect(() => {
    let calculatedNet = multiInput1;

    if (wastageType === "%") {
      calculatedNet =
        multiInput1 - multiInput1 * (Number(multiInput2 || 0) / 100);
    } else if (wastageType === "Touch") {
      calculatedNet = multiInput1 * Number(multiInput2 || 1);
    }

    setNetWeight(calculatedNet > 0 ? calculatedNet : 0);
  }, [multiInput1, multiInput2, wastageType]);

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

    const fetchRepairs = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/repair`);
        const data = await response.json();
        if (data.success) {
          setRepairRecords(data.repairs);
        }
      } catch (error) {
        console.error("Error fetching repairs:", error);
      }
    };

    fetchGoldsmiths();
    fetchRepairs();
  }, []);

  const handleSave = async () => {
    const newRecord = {
      goldsmithId: selectedGoldsmithId,
      givenWeights: [...givenWeights],
      totalGiven,
      itemWeights: [...itemWeights],
      totalItem,
      stone: parseFloat(stoneValue),
      wastageType,
      touch: parseFloat(multiInput2 || 0),
      netWeight,
    };

    try {
      const response = await fetch(`${BACKEND_SERVER_URL}/api/repair`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRecord),
      });

      const data = await response.json();

      if (data.success) {
        setRepairRecords((prev) => [...prev, data.repair]);
        setOpen(false);

        setSelectedGoldsmithId("");
        setGivenWeights([0]);
        setItemWeights([0]);
        setShowWastage(false);
        setStoneValue(0);
        setWastageType("");
        setMultiInput1(0);
        setMultiInput2("");
        setNetWeight(0);
      } else {
        alert("Failed to save repair: " + data.error);
      }
    } catch (error) {
      console.error("Error saving error:", error);
      alert("Something went wrong while saving.");
    }
  };

  return (
    <div className="repair-container">
      <Button variant="contained" onClick={() => setOpen(true)}>
        New Repair
      </Button>

      {repairRecords.length > 0 && (
        <Table style={{ marginTop: "20px" }}>
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
              <TableCell>Goldsmith</TableCell>
              <TableCell>Total Given</TableCell>
              <TableCell>Total Item</TableCell>
              <TableCell>Stone</TableCell>
              <TableCell>Wastage Type</TableCell>
              <TableCell>Touch</TableCell>
              <TableCell>Net Weight</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {repairRecords.map((record, index) => (
              <TableRow key={index}>
                <TableCell>{record.goldsmith?.name || "—"}</TableCell>
                <TableCell>{record.totalGiven}</TableCell>
                <TableCell>{record.totalItem}</TableCell>
                <TableCell>{record.stone}</TableCell>
                <TableCell>{record.wastageType}</TableCell>
                <TableCell>{record.touch}</TableCell>
                <TableCell>{record.netWeight.toFixed(3)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          New Repair
          <IconButton
            aria-label="close"
            onClick={() => setOpen(false)}
            sx={{ color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Name</InputLabel>
            <Select
              value={selectedGoldsmithId}
              onChange={(e) => setSelectedGoldsmithId(e.target.value)}
              label="Name"
            >
              {goldsmith.map((smith) => (
                <MenuItem key={smith.id} value={smith.id}>
                  {smith.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <div className="weight-section">
            <div className="section-header">
              <strong>Given Weight</strong>
              <IconButton
                onClick={() => handleAddField(setGivenWeights, givenWeights)}
              >
                <AddCircleOutlineIcon />
              </IconButton>
            </div>
            {givenWeights.map((weight, idx) => (
              <TextField
                key={idx}
                type="number"
                label={`Given Weight ${idx + 1}`}
                value={weight}
                onChange={(e) => {
                  const updated = [...givenWeights];
                  updated[idx] = e.target.value;
                  setGivenWeights(updated);
                }}
                fullWidth
                margin="dense"
                onWheel={(e) => e.target.blur()}
              />
            ))}
            <p>
              <strong>Total Given Weight:</strong> {totalGiven}
            </p>
          </div>

          <div className="weight-section">
            <div className="section-header">
              <strong>Item Weight</strong>
              <IconButton
                onClick={() => handleAddField(setItemWeights, itemWeights)}
              >
                <AddCircleOutlineIcon />
              </IconButton>
            </div>
            {itemWeights.map((weight, idx) => (
              <TextField
                key={idx}
                type="number"
                label={`Item Weight ${idx + 1}`}
                value={weight}
                onChange={(e) => {
                  const updated = [...itemWeights];
                  updated[idx] = e.target.value;
                  setItemWeights(updated);
                }}
                fullWidth
                margin="dense"
                onWheel={(e) => e.target.blur()}
              />
            ))}
            <p>
              <strong>Total Item Weight:</strong> {totalItem}
            </p>
          </div>

          <p>
            <strong>Difference:</strong> {difference}
          </p>
          <FormControlLabel
            control={
              <Checkbox
                checked={showWastage}
                onChange={(e) => setShowWastage(e.target.checked)}
              />
            }
            label="Wastage"
          />

          {showWastage && (
            <>
              <TextField
                label="Stone"
                fullWidth
                type="number"
                margin="normal"
                value={stoneValue}
                onChange={(e) => setStoneValue(e.target.value)}
                onWheel={(e) => e.target.blur()}
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Wastage Type</InputLabel>
                <Select
                  value={wastageType}
                  onChange={(e) => setWastageType(e.target.value)}
                  label="Wastage Type"
                >
                  <MenuItem value="%">%</MenuItem>
                  <MenuItem value="Touch">Touch</MenuItem>
                </Select>
              </FormControl>

              <div className="input-multiplication">
                <TextField
                  label="Weight After Stone"
                  type="number"
                  value={multiInput1}
                  InputProps={{ readOnly: true }}
                  margin="normal"
                  style={{ marginRight: "1rem" }}
                />
                <span style={{ fontSize: "1.5rem", marginTop: "1.5rem" }}>
                  *
                </span>
                <TextField
                  label={wastageType === "Touch" ? "Touch" : "Input 2"}
                  type="number"
                  value={multiInput2}
                  onChange={(e) => setMultiInput2(e.target.value)}
                  margin="normal"
                  style={{ marginLeft: "1rem" }}
                  onWheel={(e) => e.target.blur()}
                />
              </div>

              <p>
                <strong>Net Weight:</strong> {netWeight}
              </p>
            </>
          )}

          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            style={{ marginTop: "15px" }}
          >
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Repair;
