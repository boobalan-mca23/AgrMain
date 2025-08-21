
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const JobCardReport = () => {
  const [assignments, setAssignments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedArtisan, setSelectedArtisan] = useState("All");

  const getData = async () => {
    try {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/assignments`);
      setAssignments(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const handleFilter = () => {
    let result = assignments;

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      result = result.filter((d) => {
        const date = new Date(d.date);
        return date >= from && date <= to;
      });
    }

    if (selectedArtisan !== "All") {
      result = result.filter((d) => d.artisan?.name === selectedArtisan);
    }

    setFiltered(result);
  };

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setSelectedArtisan("All");
    setFiltered(assignments);
  };

  const artisans = [...new Set(assignments.map((a) => a.artisan?.name))];

  const totalPurity = filtered.reduce(
    (acc, d) => acc + (d.finalPurity || 0),
    0
  );
  const totalBalance = filtered.reduce(
    (acc, d) => acc + (d.balanceAmount || 0),
    0
  );

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ textAlign: "center", fontWeight: 600 }}
      >
        Jobcard Report
      </Typography>
      <br></br>
      <br></br>
      <Box display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
        <TextField
          label="From Date"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To Date"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Select
          value={selectedArtisan}
          onChange={(e) => setSelectedArtisan(e.target.value)}
          displayEmpty
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="All">All</MenuItem>
          {artisans.map((name, idx) => (
            <MenuItem key={idx} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
        <Button variant="contained" onClick={handleFilter}>
          Apply
        </Button>
        <Button variant="outlined" color="secondary" onClick={resetFilters}>
          Reset
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
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
              <TableCell>SI.NO</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Goldsmith</TableCell>
              <TableCell>Purity</TableCell>
              <TableCell>OB</TableCell>
              <TableCell>TB</TableCell>
              <TableCell>Item Name</TableCell>
              <TableCell>Item Weight</TableCell>
              <TableCell>Wastage</TableCell>
              <TableCell>Balance Owed By</TableCell>
              <TableCell>Balance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((d, i) => {
              const product = d.finishedProducts?.[0] || {};
              return (
                <TableRow key={d._id || i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    {new Date(d.date).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>{d.artisan?.name || "-"}</TableCell>
                  <TableCell>
                    {d.finalPurity != null ? d.finalPurity.toFixed(3) : "-"}
                  </TableCell>
                  <TableCell>
                    {d.openingBalance != null
                      ? d.openingBalance.toFixed(3)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {d.totalBalance != null ? d.totalBalance.toFixed(3) : "-"}
                  </TableCell>
                  <TableCell>{product.itemType || "-"}</TableCell>
                  <TableCell>
                    {product.weight != null ? product.weight.toFixed(3) : "-"}
                  </TableCell>
                  <TableCell>
                    {d.wastage != null ? d.wastage.toFixed(3) : "-"}
                  </TableCell>
           
                  <TableCell>
                    {d.balanceDirection?.trim().toLowerCase() === "artisan"
                      ? "Goldsmith"
                      : d.balanceDirection || "-"}
                  </TableCell>

                  <TableCell>
                    {d.balanceAmount != null ? d.balanceAmount.toFixed(3) : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell
                colSpan={3}
                sx={{ fontWeight: "bold", fontSize: "1rem", color: "black" }}
              >
                <strong>Total</strong>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", fontSize: "1rem" ,color:"black"}}>
                <strong>{totalPurity.toFixed(3)}</strong>
              </TableCell>
              <TableCell colSpan={6}></TableCell>
              <TableCell sx={{ fontWeight: "bold", fontSize: "1rem",color:"black" }}>
                <strong>{totalBalance.toFixed(3)}</strong>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default JobCardReport;
