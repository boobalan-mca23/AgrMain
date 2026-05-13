
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./orderreport.css";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  Box,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Search,
  CalendarToday,
  CheckCircle,
  PendingActions,
  Print,
} from "@mui/icons-material";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const OrderReport = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(dayjs().subtract(15, "day"));
  const [toDate, setToDate] = useState(dayjs());

  const fetchOrders = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_SERVER_URL}/api/customerOrder/all-customer-orders`
      );
      const transformed = transformOrderData(response.data.data);
      setOrders(transformed);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const transformOrderData = (data) => {
    const grouped = {};

    data.forEach((item) => {
      const groupId = item.order_group_id;
      const createdAt = item.created_at;

      if (!grouped[groupId]) {
        grouped[groupId] = {
          id: `Order Group #${groupId}`,
          customer: item.customers?.name || `Customer ${item.customer_id}`,
          items: [],
          totalPurity: 0,
          createdAt: createdAt,
        };
      }

      const weight = parseFloat(item.weight) || 0;

      grouped[groupId].items.push({
        name: item.item_name,
        description: item.description,
        weight: weight.toFixed(3),
        dueDate: new Date(item.due_date?.split("T")[0]).toLocaleDateString("en-IN") || "N/A",
        rawDueDate: item.due_date,
        status: item.status || "Pending",
        workerName: item.worker_name || "",
        images: item.productImages || [],
      });

      grouped[groupId].totalPurity += weight;

      if (new Date(createdAt) < new Date(grouped[groupId].createdAt)) {
        grouped[groupId].createdAt = createdAt;
      }
    });

    return Object.values(grouped)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((group, idx) => ({
        ...group,
        displayIndex: idx + 1,
        id: `Order #${idx + 1}`,
        totalPurity: group.totalPurity.toFixed(3),
        orderDate: new Date(group.createdAt.split("T")[0]).toLocaleDateString("en-IN"),
        rawOrderDate: group.createdAt,
      }));
  };

  const filteredOrders = orders.map((group) => {
    const filteredItems = group.items.filter((item) => {
      const matchesStatus = filter === "all" || item.status === filter;
      // Search filter
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (group.id && group.id.toLowerCase().includes(searchTermLower)) ||
        (group.customer && group.customer.toLowerCase().includes(searchTermLower)) ||
        (item.name && item.name.toLowerCase().includes(searchTermLower)) ||
        (item.description && item.description.toLowerCase().includes(searchTermLower)) ||
        (item.workerName && item.workerName.toLowerCase().includes(searchTermLower)) ||
        group.displayIndex.toString().includes(searchTermLower);

      // Date filter
      const itemDate = dayjs(item.rawDueDate).startOf("day");
      const start = fromDate ? fromDate.startOf("day") : null;
      const end = toDate ? toDate.endOf("day") : null;
      const matchesFromDate = !start || itemDate.isAfter(start) || itemDate.isSame(start, "day");
      const matchesToDate = !end || itemDate.isBefore(end) || itemDate.isSame(end, "day");

      return matchesStatus && matchesSearch && matchesFromDate && matchesToDate;
    });

    const totalPurity = filteredItems
      .reduce((sum, item) => sum + parseFloat(item.weight), 0)
      .toFixed(3);

    return {
      ...group,
      items: filteredItems,
      totalPurity,
    };
  }).filter((group) => group.items.length > 0);

  const getStatusIcon = (status) =>
    status === "Delivered" ? (
      <CheckCircle fontSize="small" />
    ) : (
      <PendingActions fontSize="small" />
    );

  return (
    <div className="order-report-container">
      <div className="report-header">
        <Typography
          variant="h4"
          component="h1"
          sx={{ textAlign: "center", fontWeight: 600 }}
        >
          Order Report
        </Typography>
        {/* <div className="report-actions">
          <IconButton color="primary">
            <Print />
          </IconButton>
        </div> */}
      </div>

      <div
        className="report-filters"
        style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}
      >
        <TextField
          variant="outlined"
          size="small"
          placeholder="Order #, customer, item..."
          value={searchTerm}
          InputProps={{ startAdornment: <Search color="action" /> }}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1, maxWidth: 300 }}
        />
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="Delivered">Delivered</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
          </Select>
        </FormControl>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="From Date"
            value={fromDate}
            format="DD/MM/YYYY"
            onChange={(newValue) => setFromDate(newValue)}
            slotProps={{ textField: { size: "small" } }}
          />
        </LocalizationProvider>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="To Date"
            value={toDate}
            format="DD/MM/YYYY"
            onChange={(newValue) => setToDate(newValue)}
            slotProps={{ textField: { size: "small" } }}
          />
        </LocalizationProvider>

        <IconButton 
          color="primary" 
          onClick={() => {
            setFilter("all");
            setSearchTerm("");
            setFromDate(null);
            setToDate(null);
          }}
          sx={{ 
            border: "1px solid", 
            borderColor: "primary.main", 
            borderRadius: "8px",
            p: 1,
            "& .MuiTypography-root": { ml: 0.5 }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>Clear</Typography>
        </IconButton>
      </div>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredOrders.length === 0 ? (
        <Paper sx={{ p: 3, mt: 3, textAlign: "center" }}>
          <Typography>No orders found matching your criteria</Typography>
        </Paper>
      ) : (
        filteredOrders.map((group, index) => (
          <Paper key={index} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {group.id}
            </Typography>
            <Typography variant="subtitle1" sx={{ color:"black" }}>
              Customer: {group.customer}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "black" }}>
              Order Date: {group.orderDate}
            </Typography>

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
                    <TableCell sx={{ color: "#fff" }}>Item</TableCell>
                    <TableCell sx={{ color: "#fff" }}>Description</TableCell>
                    <TableCell sx={{ color: "#fff" }}>Weight</TableCell>
                    <TableCell sx={{ color: "#fff" }}>Due Date</TableCell>
                    <TableCell sx={{ color: "#fff" }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          {item.images.map((img, imgIdx) => (
                            <Avatar
                              key={imgIdx}
                              src={`${BACKEND_SERVER_URL}/uploads/${img.filename}`}
                              alt="img"
                              variant="rounded"
                              sx={{ width: 40, height: 40 }}
                            />
                          ))}
                          <span>{item.name}</span>
                        </Box>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.weight}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <CalendarToday fontSize="small" color="action" />
                          {item.dueDate}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          icon={getStatusIcon(item.status)}
                          sx={{
                            backgroundColor:
                              item.status === "Delivered"
                                ? "success.light"
                                : "warning.light",
                            color:
                              item.status === "Delivered"
                                ? "success.dark"
                                : "warning.dark",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ backgroundColor: "#f1f1f1" }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 600 }}>
                      Total
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {group.totalPurity} g
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))
      )}
    </div>
  
  );
};

export default OrderReport;
