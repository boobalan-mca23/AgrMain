import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { TablePagination, TextField, Button, Box, Typography, Paper } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import NewExpense from "./NewExpense";
import { FaWallet, FaReceipt } from "react-icons/fa"; // wallet icon for header
import { AiOutlinePlus } from "react-icons/ai"; // plus icon for button
import "./Expense.css";

const ExpenseTracker = () => {
    const today = dayjs();
    const [fromDate, setFromDate] = useState(dayjs().subtract(15, 'day'));
    const [toDate, setToDate] = useState(dayjs());
    const [allExpense, setAllExpense] = useState([]);
    const [masterTouch, setMasterTouch] = useState([]);
    const [rawGold, setRawGold] = useState([]);
    const [open, setOpen] = useState(false);
    const [page, setPage] = useState(0); // 0-indexed for TablePagination
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [newExpense, setNewExpense] = useState({
        expenseDate: today.format("YYYY-MM-DD"),
        description: "",
        gold: "",
        touch: "",
        purity: "",
    });

    const filteredTransactions = allExpense.filter((transaction) => {
        const transactionDate = dayjs(transaction.expenseDate);

        const from = fromDate ? fromDate.startOf('day') : null;
        const to = toDate ? toDate.endOf('day') : null;

        return (!from || transactionDate.isAfter(from) || transactionDate.isSame(from)) &&
               (!to || transactionDate.isBefore(to) || transactionDate.isSame(to));
    });

    const paginatedData = filteredTransactions.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

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
            const response = await axios.post(
                `${BACKEND_SERVER_URL}/api/expense`,
                payload
            );

            setAllExpense(response.data.allExpense);
            toast.success(response.data.message);
            fetchRawGold();
        } catch (err) {
            console.log(err.message);
            toast.warn("Failed to save");
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    useEffect(() => {
        const fetchAllExpense = async () => {
            try {
                const response = await axios.get(`${BACKEND_SERVER_URL}/api/expense`);
                setAllExpense(response.data.allExpense);
            } catch (err) {
                console.error("Failed to fetch Expense", err);
            }
        };

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
    };

    return (
        <>
            <Box sx={{ maxWidth: "1800px", margin: "0 auto", padding: "20px" }}>
                <Typography variant="h4" sx={{ textAlign: "center", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <FaWallet /> Expense Voucher
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
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", padding: "20px", fontWeight: "bold", color: "#666" }}>
                                        No Expense Voucher Added
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <TablePagination
                    component="div"
                    count={allExpense.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50, 100]}
                />
            </Box>
            {open && (
                <NewExpense
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
        </>
    );
};
export default ExpenseTracker;
