import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { TablePagination } from "@mui/material";
import NewExpense from "./NewExpense";
import { FaWallet ,FaReceipt} from "react-icons/fa"; // wallet icon for header
import { AiOutlinePlus } from "react-icons/ai"; // plus icon for button
import "./Expense.css";
const ExpenseTracker = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [allExpense, setAllExpense] = useState([]);
  const [masterTouch, setMasterTouch] = useState([]);
  const [rawGold, setRawGold] = useState([]);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [newExpense, setNewExpense] = useState({
    description: "",
    gold: "",
    touch: "",
    purity: "",
  });
  const filteredTransactions = allExpense.filter((transaction) => {
  const transactionDate = new Date(transaction.createdAt);

  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;
  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  return (!from || transactionDate >= from) && (!to || transactionDate <= to);
});


  const paginatedData = filteredTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  const fetchRawGold = async () => {
    try {
      const response = await axios.get(`${BACKEND_SERVER_URL}/api/rawGold`);
      setRawGold(response.data.allRawGold);
      console.log("rawGoldStock", response.data.allRawGold);
    } catch (err) {
      console.log(err);
      alert(err.message);
    }
  };
  const handleClosePop = () => {
    setOpen(false);
   
    setNewExpense({ description: "", gold: "", touch: "", purity: "" });
  };
  const handleSaveExpense = async (payload) => {
  
    try {
      const response = await axios.post(
        `${BACKEND_SERVER_URL}/api/expense`,
        payload
      );
    
      setAllExpense(response.data.allExpense)
      alert(response.data.message)
      fetchRawGold()
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
        console.log("masterTouch", res.data);
        setMasterTouch(res.data);
      } catch (err) {
        console.error("Failed to fetch touch values", err);
      }
    };
    fetchTouch();
    fetchAllExpense();
    fetchRawGold();
  }, []);
  return (
    <>
   
      <div>
        <h3 style={{ textAlign: "center" }}>
          {" "}
          <FaWallet /> Expense Tracker
        </h3>

        <div className="expenseHeader">
          <div>
            <h4><FaReceipt/>Total Expense:{allExpense.length}</h4>
          </div>

          <div className="filters">
            <label>
              From Date:
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label>
              To Date:
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>

          <div>
            {" "}
            <button
              className="expensebtn"
              onClick={() => {
                setOpen(true);
              }}
            >
              <AiOutlinePlus />
              Add New Expense
            </button>
          </div>
        </div>

        <div>
          {allExpense.length >= 1 ? (
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
                {paginatedData.map((item, index) => (
                  <tr key={index + 1}>
                    <td>{index + 1}</td>
                    <td>
                      {new Date(item.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td>{item.description || "-"}</td>
                    <td>{item.gold}</td>
                    <td>{item.touch}</td>
                    <td>{item.purity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{textAlign:"center",color:"red",fontWeight:"bold"}}>No Expense!</p>
          )}
        </div>
      
        <TablePagination
          component="div"
          count={allExpense.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </div>
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
