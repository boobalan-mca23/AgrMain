import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { TablePagination, TextField, Button, Box, Typography, Paper, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import NewExpense from "./NewExpense";
import { FaWallet, FaReceipt } from "react-icons/fa"; // wallet icon for header
import { AiOutlinePlus } from "react-icons/ai"; // plus icon for button
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import "./Expense.css";

const ExpenseTracker = () => {
    const today = dayjs();
    const [fromDate, setFromDate] = useState(dayjs().subtract(15, 'day'));
    const [toDate, setToDate] = useState(dayjs());
    const [allExpense, setAllExpense] = useState([]);
    const [masterTouch, setMasterTouch] = useState([]);
    const [rawGold, setRawGold] = useState([]);
    const [open, setOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [page, setPage] = useState(0); // 0-indexed for TablePagination
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [newExpense, setNewExpense] = useState({
        expenseDate: today.format("YYYY-MM-DD"),
        description: "",
        gold: "",
        touch: "",
        purity: "",
    });

    const isFirstLoad = useRef(true);

    const filteredTransactions = useMemo(() => {
        const result = allExpense.filter((transaction) => {
            const transactionDate = dayjs(transaction.expenseDate);

            const from = fromDate ? fromDate.startOf('day') : null;
            const to = toDate ? toDate.endOf('day') : null;

            return (!from || transactionDate.isAfter(from) || transactionDate.isSame(from)) &&
                   (!to || transactionDate.isBefore(to) || transactionDate.isSame(to));
        });

        // Sort by date ascending (Oldest First)
        return [...result].sort((a, b) => {
            const dateA = dayjs(a.expenseDate);
            const dateB = dayjs(b.expenseDate);
            if (dateA.isBefore(dateB)) return -1;
            if (dateA.isAfter(dateB)) return 1;
            return (a.id || 0) - (b.id || 0);
        });
    }, [allExpense, fromDate, toDate]);

    const paginatedData = useMemo(() => {
        return filteredTransactions.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage
        );
    }, [filteredTransactions, page, rowsPerPage]);

    // Reset page when filters change
    useEffect(() => {
        if (!isFirstLoad.current) {
            setPage(0);
        }
    }, [fromDate, toDate]);

    const fetchRawGold = async () => {
        try {
            const response = await axios.get(`${BACKEND_SERVER_URL}/api/rawGold`);
            setRawGold(response.data.allRawGold);
        } catch (err) {
            console.log(err);
            alert(err.message);
        }
    };

    const handleClosePop = () => {
        setOpen(false);
        setIsEdit(false);
        setNewExpense({
            expenseDate: today.format("YYYY-MM-DD"),
            description: "",
            gold: "",
            touch: "",
            purity: ""
        });
        fetchRawGold();
    };

    const handleSaveExpense = async (payload) => {
        try {
            let response;
            if (isEdit && payload.id) {
                response = await axios.put(
                    `${BACKEND_SERVER_URL}/api/expense/${payload.id}`,
                    payload
                );
            } else {
                response = await axios.post(
                    `${BACKEND_SERVER_URL}/api/expense`,
                    payload
                );
            }

            setAllExpense(response.data.allExpense);
            toast.success(response.data.message);
            setIsEdit(false);
            fetchRawGold();
        } catch (err) {
            console.log(err.message);
            toast.warn(err.response?.data?.err || "Failed to save");
        }
    };

    const handleEditClick = (item) => {
        setIsEdit(true);
        setNewExpense({
            id: item.id,
            expenseDate: dayjs(item.expenseDate).format("YYYY-MM-DD"),
            description: item.description || "",
            gold: item.gold,
            touch: item.touch,
            purity: item.purity,
        });
        setOpen(true);
    };

    const handleDeleteClick = (id) => {
        setItemToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteExpense = async () => {
        if (!itemToDelete) return;
        try {
            const response = await axios.delete(`${BACKEND_SERVER_URL}/api/expense/${itemToDelete}`);
            setAllExpense(response.data.allExpense);
            toast.success(response.data.message);
            fetchRawGold();
            setDeleteDialogOpen(false);
            setItemToDelete(null);
        } catch (err) {
            console.error("Delete failed", err);
            toast.error(err.response?.data?.err || "Failed to delete");
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const fetchAllExpense = async () => {
        try {
            const response = await axios.get(`${BACKEND_SERVER_URL}/api/expense`);
            const expenses = response.data.allExpense || [];
            setAllExpense(expenses);

            if (isFirstLoad.current && expenses.length > 0) {
                const lastPage = Math.floor((expenses.length - 1) / rowsPerPage);
                setPage(lastPage);
                isFirstLoad.current = false;
            }
        } catch (err) {
            console.error("Failed to fetch Expense", err);
        }
    };

    useEffect(() => {
        const fetchTouch = async () => {
            try {
                const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
                setMasterTouch(res.data);
            } catch (err) {
                console.error("Failed to fetch touch values", err);
            }
        };
        fetchTouch();
        fetchAllExpense();
        fetchRawGold();
    }, []);

    const handleClear = () => {
        setFromDate(null);
        setToDate(null);
        isFirstLoad.current = true;
        fetchAllExpense();
    };

    return (
        <>
            <Box sx={{ maxWidth: "1800px", margin: "0 auto", padding: "20px" }}>
                <Typography variant="h2" sx={{ textAlign: "center", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", fontSize:"24px" }}>
                  Expense Voucher
                </Typography>

                <Paper sx={{ padding: "15px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}>
                            <FaReceipt /> Total Expense: {allExpense.length}
                        </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                label="From Date"
                                value={fromDate}
                                format="DD/MM/YYYY"
                                slotProps={{ textField: { size: 'small' } }}
                                sx={{ width: "200px" }}
                                onChange={(newValue) => setFromDate(newValue)}
                            />
                        </LocalizationProvider>

                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                label="To Date"
                                value={toDate}
                                format="DD/MM/YYYY"
                                minDate={fromDate || undefined}
                                slotProps={{ textField: { size: 'small' } }}
                                sx={{ width: "200px" }}
                                onChange={(newValue) => setToDate(newValue)}
                            />
                        </LocalizationProvider>

                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            sx={{ height: "40px", fontWeight: "bold" }}
                            onClick={handleClear}
                        >
                            Clear
                        </Button>

                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            sx={{ height: "40px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}
                            onClick={() => setOpen(true)}
                        >
                            <AiOutlinePlus /> Add New Expense
                        </Button>
                    </Box>
                </Paper>

                <div>
                    <table className="expensetable">
                        <thead>
                            <tr>
                                <th>S.No</th>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Gold</th>
                                <th>Touch</th>
                                <th>Purity</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginatedData.length > 0 ? (
                                paginatedData.map((item, index) => (
                                    <tr key={index + 1}>
                                        <td>{page * rowsPerPage + (index + 1)}</td>
                                        <td>
                                            {new Date(item.expenseDate).toLocaleDateString("en-GB")}
                                        </td>
                                        <td>{item.description || "-"}</td>
                                        <td>{item.gold}</td>
                                        <td>{item.touch}</td>
                                        <td>{item.purity}</td>
                                        <td>
                                            <Box sx={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                                                <Tooltip title="Edit">
                                                    <IconButton size="small" onClick={() => handleEditClick(item)} color="primary">
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton size="small" onClick={() => handleDeleteClick(item.id)} color="error">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: "center", padding: "20px", fontWeight: "bold", color: "#666" }}>
                                        No Expense Voucher Added
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <TablePagination
                    component="div"
                    count={filteredTransactions.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                />
            </Box>
            {open && (
                <NewExpense
                    isEdit={isEdit}
                    rawGold={rawGold}
                    setRawGold={setRawGold}
                    open={open}
                    newExpense={newExpense}
                    setNewExpense={setNewExpense}
                    touch={masterTouch}
                    handleSaveExpense={handleSaveExpense}
                    handleClosePop={handleClosePop}
                />
            )}

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px", color: "error.main" }}>
                    <WarningAmberIcon /> Confirm Delete
                </DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete this expense? This action cannot be undone.</Typography>
                </DialogContent>
                <DialogActions sx={{ padding: "15px" }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" variant="outlined">
                        Cancel
                    </Button>
                    <Button onClick={handleDeleteExpense} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
export default ExpenseTracker;
