import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button
} from "@mui/material";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { toast } from "react-toastify";
import "./Customer.css";
const RepairStockList = () => {
  const [returns, setReturns] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchReturnedStock();
  }, []);

  const fetchReturnedStock = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/returns/return-stock`
      );
      setReturns(res.data.data || []);
    } catch {
      toast.error("Failed to load returned products");
    }
  };

  const filteredReturns = returns.filter((r) =>
    r.productName?.toLowerCase().includes(search.toLowerCase()) ||
    r.bill?.id?.toString().includes(search)
  );

  const paginatedData = filteredReturns.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Customer Returned Products
      </Typography>

      {/* Search */}
      <Box mb={2} display="flex" gap={2}>
        <TextField
          size="small"
          label="Search (Bill / Product)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Button variant="outlined" onClick={() => setSearch("")}>
          Reset
        </Button>
      </Box>

      {/* Table */}
      <Table className="BillTable">
        <TableHead>
          <TableRow>
            <TableCell className="BillTable-th-td">S.No</TableCell>
            <TableCell className="BillTable-th-td">Date</TableCell>
            <TableCell className="BillTable-th-td">Bill No</TableCell>
            <TableCell className="BillTable-th-td">Customer</TableCell>
            <TableCell className="BillTable-th-td">Product</TableCell>
            <TableCell className="BillTable-th-td">Weight</TableCell>
            <TableCell className="BillTable-th-td">Count</TableCell>
            <TableCell className="BillTable-th-td">Reason</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="BillTable-tb-td">
                  {page * rowsPerPage + index + 1}
                </TableCell>
                <TableCell className="BillTable-tb-td">
                  {new Date(item.createdAt).toLocaleDateString("en-IN")}
                </TableCell>
                <TableCell className="BillTable-tb-td">{item.bill?.id || "-"}</TableCell>
                <TableCell className="BillTable-tb-td">{item.bill?.customers?.name || "-"}</TableCell>
                <TableCell className="BillTable-tb-td">{item.productName}</TableCell>
                <TableCell className="BillTable-tb-td">{item.weight}</TableCell>
                <TableCell className="BillTable-tb-td">{item.count}</TableCell>
                <TableCell className="BillTable-tb-td">{item.reason || "-"}</TableCell>
              </TableRow>
            )) 
          ) : (
            <TableRow>
              <TableCell colSpan={8} align="center">
                No returned products
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredReturns.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(e, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Box>
  );
};

export default RepairStockList;