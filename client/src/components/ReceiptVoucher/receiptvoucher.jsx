import React, { useState, useRef, useEffect } from "react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import {
  IconButton,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Box,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableHead,
  Paper,
  TableContainer,
} from "@mui/material";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { ToastContainer, toast } from "react-toastify";
import "./receiptvoucher.css";
import { MdDeleteForever } from "react-icons/md";
import { receiptValidation,receiptVoucherHallMark} from "../receiptValidation/receiptValidation";
import PrintReceipt from "../PrintReceipt/PrintReceipt";
import ReactDOMServer from "react-dom/server";
const Receipt = () => {
  const today = new Date();
  const formattedToday = today.toISOString().split("T")[0];
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customers, setCustomers] = useState([]);
  const [receiptBalances, setReceiptBalances] = useState({
    oldbalance: 0,
    hallMark: 0,
  });
  const selectedType = ["Cash", "Gold"];
  const [masterTouch, setMasterTouch] = useState([]);
  const [receipt, setReceipt] = useState([
    {
      date: formattedToday,
      type: "",
      goldRate: "",
      gold: "",
      touch: "",
      purity: "",
      amount: "",
      hallMark: "",
    },
  ]);
  const [receiptErrors, setReceiptErrors] = useState([]);
  const [hallMarkErrors,setHallMarkErrors]=useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [allReceipts, setAllReceipts] = useState([]);
  const inputRefs = useRef({});

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await axios.get(`${BACKEND_SERVER_URL}/api/customers`);
        console.log("response", response.data);

        setCustomers(response.data);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };
    const fetchTouch = async () => {
      try {
        const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
        setMasterTouch(res.data);
        console.log("res touch", res.data);
      } catch (err) {
        console.error("Failed to fetch touch values", err);
      }
    };
    fetchCustomers();
    fetchTouch();
  }, []);

  const handleAddRow = () => {
    const newRow = {
      date: formattedToday,
      type: "",
      goldRate: "",
      gold: "",
      touch: "",
      purity: "",
      amount: "",
      hallMark: "",
    };
    setReceipt((prev) => [...prev, newRow]);
  };
  const handleRemoveRow = (index) => {
    let isTrue = window.confirm("Are You Want to Remove Receipt Row");
    if (isTrue) {
      const filterRows = receipt.filter((_, i) => i !== index);
      console.log("filterRows and index", filterRows, index);
      setReceipt(filterRows);

      setReceiptErrors([])
      setHallMarkErrors([])

    }
  };
  const handleChangeReceipt = (index, field, value) => {
    const updatedRows = [...receipt];
    if (field === "type") {
      // if one row only have one type if we change another type before we set all values are empty
      updatedRows[index].gold = "";
      updatedRows[index].touch = "";
      updatedRows[index].amount = "";
      updatedRows[index].goldRate = "";
      updatedRows[index].purity = "";
    }
    updatedRows[index][field] = value;
    const goldRate = parseFloat(updatedRows[index].goldRate) || 0;
    const gold = parseFloat(updatedRows[index].gold) || 0;
    const touch = parseFloat(updatedRows[index].touch) || 0;
    const amount = parseFloat(updatedRows[index].amount) || 0;

    let calculatedPurity = 0;

    if (goldRate > 0 && amount > 0) {
      calculatedPurity = amount / goldRate;
    } else if (gold > 0 && touch > 0) {
      calculatedPurity = gold * (touch / 100);
    }

    updatedRows[index].purity = calculatedPurity.toFixed(3);

    setReceipt(updatedRows);
    receiptValidation(receipt, setReceiptErrors);
  };

  const handleCustomerChange = (event) => {
    const customerId = event.target.value;
    setSelectedCustomer(customerId);

    // Mock data for receipts when customer is selected
    if (customerId) {
      const fetchPreviousBal = async () => {
        try {
          const response = await axios.get(
            `${BACKEND_SERVER_URL}/api/customers/${customerId}`
          );
          console.log("response from bal", response);
          setReceiptBalances({
            oldbalance: response?.data?.customerBillBalance?.balance,
            hallMark: response?.data?.customerBillBalance?.hallMarkBal,
          });
        } catch (err) {}
      };
      fetchPreviousBal();
    }
  };
  const totalReceivedPurity = receipt.reduce(
    (acc, row) => acc + (parseFloat(row.purity) || 0),
    0
  );
  const pureBalance = receiptBalances.oldbalance - totalReceivedPurity;
  const lastGoldRate = [...receipt]
    .reverse()
    .find((row) => parseFloat(row.goldRate))?.goldRate;

  const cashBalance = lastGoldRate
    ? (parseFloat(lastGoldRate) * pureBalance).toFixed(2)
    : "0.00";

  const totalBillHallmark = parseFloat(receiptBalances.hallMark) || 0;

  const totalReceivedHallmark = receipt.reduce(
    (total, row) => total + (parseFloat(row.hallMark) || 0),
    0
  );

  const hallmarkBalance = totalBillHallmark - totalReceivedHallmark;

  const handlePrint = (receipt, selectedCustomer) => {
    const customerName = customers.find(
      (item) => String(item.id) === String(selectedCustomer)
    );

    const printContent = (
      <PrintReceipt
        receipt={receipt}
        customerName={customerName.name}
        oldbalance={receiptBalances?.oldbalance}
        oldHallMark={receiptBalances?.hallMark}
        cashBalance={cashBalance}
        pureBalance={pureBalance}
        hallMark={hallmarkBalance}
      />
    );

    const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt Print</title>
       
      <body>
        ${ReactDOMServer.renderToString(printContent)}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 200);
          };
        </script>
      </body>
    </html>
  `;
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  // Creates any new touches entered that don't exist in masterTouch
const createMissingTouches = async () => {
  try {
    const existing = new Set((masterTouch || []).map((t) => t.touch?.toString()));
    const typedTouches = Array.from(
      new Set(
        (receipt || [])
          .map((r) => (r.touch || "").toString().trim())
          .filter((t) => t !== "")
      )
    );

    const newTouches = typedTouches.filter((t) => !existing.has(t));
    if (newTouches.length === 0) return;

    await Promise.all(
      newTouches.map((t) =>
        axios.post(`${BACKEND_SERVER_URL}/api/master-touch/create`, { touch: t })
      )
    );

    const refresh = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
    setMasterTouch(Array.isArray(refresh.data) ? refresh.data : []);

    toast.success(`${newTouches.length} new touch(es) added`);
  } catch (err) {
    console.error("Failed to create new touches:", err);
    toast.error("Error creating new touch values");
    throw err;
  }
};


const handleSaveReeceipt = async() => {
  setReceiptErrors([]);
  setHallMarkErrors([]);
    const payLoad = {
      customerId: selectedCustomer,
      received: receipt,
      pureBalance: pureBalance,
      hallmarkBalance: hallmarkBalance,
    };
    console.log("payLoad", payLoad);
 
    const saveReceipt = async () => {
     try {
        await createMissingTouches();
      } catch {
          toast.warn("new touches couldn’t be created");
        return; 
      }
      try {
        const response = await axios.post(
          `${BACKEND_SERVER_URL}/api/receipt`,
          payLoad
        );
        if (response.status === 201) {
          toast.success(response.data.message);
 
          setTimeout(()=>{
             handlePrint(receipt, selectedCustomer);
          },3000)
 
          setSelectedCustomer("");
          setReceipt([
            {
              date: formattedToday,
              type: "",
              goldRate: "",
              gold: "",
              touch: "",
              purity: "",
              amount: "",
              hallMark: "",
            },
          ]);
          setReceiptBalances({ oldbalance: 0, hallMark: 0 });

        }
      } catch (err) {
        console.log(err);
        toast.error(err.response.data.error, { autoClose: 2000 });
      }
    };
    if (!selectedCustomer) return toast.warn("Select Customer");
     receiptValidation(receipt, setReceiptErrors)? receiptVoucherHallMark(receipt,setHallMarkErrors) ? saveReceipt(): toast.warn("Give Correct Information in HallMarks"):toast.warn("Give Correct Information In GoldRows");
  };



  return (
    <>
      <div> 
        <div className="receiptTitle">
          <h2>Receipt Voucher</h2>
        </div>

        <div>
          <div className="receiptFlex">
            <div>
              <p className="receiptLabel">Customer Name</p>
              <select
                value={selectedCustomer}
                onChange={handleCustomerChange}
                className="receiptSelect"
              >
                <option value="Select Customer">Select Customer</option>
                {customers.map((option) => (
                  <option key={option.id} value={option?.id}>
                    {option?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="receiptLabel">{receiptBalances?.oldbalance>=0?"Old Balance":"Excees Balance"}</p>
              <input
                className="receiptInput"
                readOnly
                value={(receiptBalances?.oldbalance).toFixed(3) || 0}
              />
            </div>
            <div>
              <p className="receiptLabel">Hall Mark Balance</p>
              <input
                className="receiptInput"
                readOnly
                value={(receiptBalances?.hallMark).toFixed(3) || 0}
              />
            </div>
            <div className="receiptcommanbtn receiptbtn">
              <button
                onClick={() => {
                  handleAddRow();
                }}
              >
                Add Row
              </button>
             
            </div>
          </div>

          <div className="tableWrapper">
            <table className="receiptTable">
              <thead className="receipthead">
                <tr className="receiptRow">
                  <th>S.no</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>GoldRate</th>
                  <th>Gold</th>
                  <th>Touch</th>
                  <th>Purity</th>
                  <th>Amount</th>
                  <th>Hall Mark</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="receiptbody">
                {receipt.map((item, index) => (
                  <tr key={index + 1}>
                    <td>{index + 1}</td>
                    <td>
                      <input
                        type="date"
                        className="receiptTableDate"
                        value={item.date}
                        onChange={(e) =>
                          handleChangeReceipt(index, "date", e.target.value)
                        }
                      />

                      <br></br>
                      {receiptErrors[index]?.date && (
                        <span className="error">
                          {receiptErrors[index]?.date}
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        value={item.type}
                        onChange={(e) => {
                          handleChangeReceipt(index, "type", e.target.value);
                        }}
                        className="receiptSelect"
                      >
                        <option value="">Select Type</option>
                        {selectedType.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <br></br>
                      {receiptErrors[index]?.type && (
                        <span className="error">
                          {receiptErrors[index]?.type}
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        disabled={item.type === "Cash" ? false : true}
                        className="receiptTableInput"
                        value={item.goldRate}
                        onChange={(e) =>
                          handleChangeReceipt(index, "goldRate", e.target.value)
                        }
                      />
                      <br></br>
                      {receiptErrors[index]?.goldRate && (
                        <span className="error">
                          {receiptErrors[index]?.goldRate}
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        disabled={item.type === "Gold" ? false : true}
                        className="receiptTableInput"
                        value={item.gold}
                        onChange={(e) =>
                          handleChangeReceipt(index, "gold", e.target.value)
                        }
                      />
                      <br></br>
                      {receiptErrors[index]?.gold && (
                        <span className="error">
                          {receiptErrors[index]?.gold}
                        </span>
                      )}
                    </td>
                    <td>
                      <Autocomplete
                      // className="receiptTableInput"
                        freeSolo
                        disableClearable
                        disabled={item.type !== "Gold"}
                        options={masterTouch.map((t) => t.touch.toString())}
                        value={item.touch?.toString() || ""}
                        onChange={(_, newValue) => {
                          handleChangeReceipt(index, "touch", newValue);
                        }}
                        onInputChange={(_, newInputValue) => {
                          handleChangeReceipt(index, "touch", newInputValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="touch"
                            size="small"
                            style={{
                                padding: 5,
                                fontSize: "1rem",
                                width: 95,
                                borderRadius: 6,
                                verticalAlign: "middle",
                            }}
                            error={!!receiptErrors[index]?.touch}
                            helperText={receiptErrors[index]?.touch || ""}
                          />
                        )}
                      />
                    </td>
                    <td>
                      <input
                        value={item.purity}
                        readOnly
                        className="receiptTableInput"
                      />
                    </td>
                    <td>
                      <input
                        disabled={item.type === "Cash" ? false : true}
                        className="receiptTableInput"
                        value={item.amount}
                        onChange={(e) =>
                          handleChangeReceipt(index, "amount", e.target.value)
                        }
                      />
                      <br></br>
                      {receiptErrors[index]?.amount && (
                        <span className="error">
                          {receiptErrors[index]?.amount}
                        </span>
                      )}
                    </td>
                    <td>
                      <input
                        className="receiptTableInput"
                        value={item.hallMark}
                        onChange={(e) =>
                          handleChangeReceipt(index, "hallMark", e.target.value)
                        }
                      />
                      <br></br>
                      {hallMarkErrors[index]?.hallMark && (
                        <span className="error">
                          {hallMarkErrors[index]?.hallMark}
                        </span>
                      )}
                    </td>
                    <td className="delIcon">
                      <MdDeleteForever
                        onClick={() => {
                          handleRemoveRow(index);
                        }}
                      ></MdDeleteForever>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="receiptcommanbtn saveReceiptbtn">
             <button
                disabled={receipt.length <= 0}
                onClick={() => {
                  handleSaveReeceipt();
                }}
              >
                Save
              </button>
          </div>
          <div className="receiptBalances">
            <div>
              <p>
                CashBalance ₹
                {Number(cashBalance).toLocaleString("en-IN", {
                  // minimumFractionDigits: 2,
                  // maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p>
                {pureBalance < 0 ? "ExcessBalance" : "PureBalance"}{" "}
                {pureBalance.toFixed(3)}gr
              </p>
            </div>
            <div>
              <p>Hall Mark Balance {hallmarkBalance.toFixed(3)}gr</p>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={1000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
};

export default Receipt;
