import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter,
  Paper,
  FormControl,
  InputLabel,
} from "@mui/material";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const JewelStockReport = () => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [totalPurity, setTotalPurity] = useState(0);
  const [filterName, setFilterName] = useState("All");
  const [jewelOptions, setJewelOptions] = useState([]);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${BACKEND_SERVER_URL}/api/jewel-stock`);
      const data = await response.json();
      setEntries(data);
      setFilteredEntries(data);
      calculateTotalPurity(data);
      extractJewelNames(data);
    } catch (error) {
      console.error("Error fetching entries", error);
    }
  };

  const extractJewelNames = (data) => {
    const names = Array.from(new Set(data.map((entry) => entry.jewelName)));
    setJewelOptions(["All", ...names]);
  };

  const calculateTotalPurity = (data) => {
    const total = data.reduce(
      (sum, entry) => sum + parseFloat(entry.purityValue || 0),
      0
    );
    setTotalPurity(total.toFixed(3));
  };

  const handleApply = () => {
    if (filterName === "All") {
      setFilteredEntries(entries);
      calculateTotalPurity(entries);
    } else {
      const filtered = entries.filter(
        (entry) => entry.jewelName === filterName
      );
      setFilteredEntries(filtered);
      calculateTotalPurity(filtered);
    }
  };

  const handleReset = () => {
    setFilterName("All");
    setFilteredEntries(entries);
    calculateTotalPurity(entries);
  };

  return (
    <Box p={4}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ textAlign: "center", fontWeight: 600 }}
      >
          Jewel Stock Report
      </Typography>

      <Box display="flex" alignItems="center" gap={2} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="filter-label">Filter by Jewel Name</InputLabel>
          <Select
            labelId="filter-label"
            id="filterName"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            label="Filter by Jewel Name"
          >
            {jewelOptions.map((name, index) => (
              <MenuItem key={index} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          onClick={handleApply}
          sx={{ minWidth: 100 }}
        >
          Apply
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={handleReset}
          sx={{ minWidth: 100 }}
        >
         Reset
        </Button>
      </Box>

      {filteredEntries.length === 0 ? (
        <Typography>No</Typography>
      ) : (
        <Paper elevation={3}>
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
                <TableCell>SI.No.</TableCell>
                <TableCell>Jewel Name</TableCell>
                <TableCell>Weight (g)</TableCell>
                <TableCell>Stone Wt. (g)</TableCell>
                <TableCell>Final Wt. (g)</TableCell>
                <TableCell>Touch (%)</TableCell>
                <TableCell>Purity (g)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEntries.map((entry, index) => (
                <TableRow
                  key={entry.id}
                  sx={{
                    backgroundColor: "white !important",
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{entry.jewelName}</TableCell>
                  <TableCell>{parseFloat(entry.weight).toFixed(3)}</TableCell>
                  <TableCell>{entry.stoneWeight}</TableCell>
                  <TableCell>{parseFloat(entry.finalWeight).toFixed(3)}</TableCell>
                  <TableCell>{entry.touch}</TableCell>
                  <TableCell>
                    {parseFloat(entry.purityValue).toFixed(3)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="right"
                  sx={{
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    color: "black",
                  }}
                >
              Total Purity:
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: "bold",
                    fontSize: "1.1rem",
                    color: "black",
                  }}
                >
                  {totalPurity}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default JewelStockReport;
