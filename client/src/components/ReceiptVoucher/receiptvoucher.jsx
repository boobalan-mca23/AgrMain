import React, { useState, useRef, useEffect } from "react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import {
  IconButton,
  TextField,
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
import "./receiptvoucher.css"
import { MdDeleteForever } from "react-icons/md";

const Receipt = () => {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customers, setCustomers] = useState([]);
  const [receiptBalances,setReceiptBalances]=useState({
    oldbalance:0,
    hallMark:0
  })

  const getTodayDate=()=>{
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-GB");
    return formattedDate 
  }
  const [receipt,setReceipt]=useState([{
    date:getTodayDate(),
    goldRate:"",
    gold:"",
    touch:"",
    purity:"",
    amount:"",
    hallMark:""
  },
])
  const [loading, setLoading] = useState(false);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [rows, setRows] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [allReceipts, setAllReceipts] = useState([]);
  const inputRefs = useRef({});
  // get today date
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await axios.get(`${BACKEND_SERVER_URL}/api/customers`);
          console.log('response',response.data)
        
        setCustomers(response.data);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };
    
    fetchCustomers();
    

  
  }, []);

  if (loading)
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  const handleAddRow=()=>{
 
    const newRow={
    date:getTodayDate(),
    goldRate:"",
    gold:"",
    touch:"",
    purity:"",
    amount:"",
    hallMark:""
    }
    setReceipt((prev)=>[...prev,newRow])
  }
  const handleRemoveRow=(index)=>{
     let isTrue=window.confirm("Are You Want to Remove Receipt Row")
     if(isTrue){
       const filterRows=receipt.filter((_,i)=>i!==index)
       console.log('filterRows and index',filterRows,index)
       setReceipt(filterRows)
     }
  }
  const handleChangeReceipt=(index,field,value)=>{
   const updatedRows = [...receipt];
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
    if (field === "hallmark") {
      updatedRows[index].hallMark = value;
    }

    setReceipt(updatedRows);
    
  }

    const handleCustomerChange = (event) => {
    const customerId = event.target.value;
    setSelectedCustomer(customerId);

    // Mock data for receipts when customer is selected
    if (customerId) {
        const fetchPreviousBal=async()=>{
           try{
                
              const response=await axios.get(`${BACKEND_SERVER_URL}/api/customers/${customerId}`)
            
              setReceiptBalances({oldbalance:response.data.customerBillBalance[0].balance,
                hallMark:response.data.customerBillBalance[0].hallMarkBal
              })
           }catch(err){

           }
        }
        fetchPreviousBal()
    }
  };
  return (
    <>
      <div >
        <div className="receiptTitle">
          
          <h2>Receipt Voucher</h2>
        </div>

        <div >

          <div className="receiptFlex">
            <div>
              <p className="receiptLabel">Customer Balance</p>
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
              <p className="receiptLabel">Old Balance</p>
              <input
              className="receiptInput"
              readOnly
              value={receiptBalances?.oldbalance||0}
             />
            </div>
            <div>
              <p className="receiptLabel">Hall Mark Balance</p>
              <input
              className="receiptInput"
              readOnly
              value={receiptBalances?.hallMark||0}
             />
            </div>
           <div className="receiptbtn">
              <button onClick={()=>{handleAddRow()}}>Add Row</button>
              <button>Save</button>
              <button>View Receipts</button>
           </div>


          </div>

          <div className="tableWrapper">
                  <table className="receiptTable">
                  <thead className="receipthead">
                     <tr className="receiptRow">
                    <th>S.no</th>
                    <th>Date</th>
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
                {receipt.map((item,index)=>(
                     <tr key={index+1}>
                       <td>{index+1}</td>
                       <td>{item.date}</td>
                       <td>
                        <input className="receiptTableInput"
                         value={item.goldRate}
                         onChange={(e)=>handleChangeReceipt(index,"goldRate",e.target.value)}
                       /></td>
                       <td><input className="receiptTableInput" 
                        value={item.gold}
                        onChange={(e)=>handleChangeReceipt(index,"gold",e.target.value)}
                       /></td>
                       <td><input className="receiptTableInput"
                        value={item.touch}
                        onChange={(e)=>handleChangeReceipt(index,"touch",e.target.value)}
                       /></td>
                       <td><input 
                        value={item.purity}
                       readOnly className="receiptTableInput"/></td>
                       <td><input className="receiptTableInput"
                        value={item.amount}
                        onChange={(e)=>handleChangeReceipt(index,"amount",e.target.value)}
                       /></td>
                       <td><input className="receiptTableInput"
                       value={item.hallMark}
                       onChange={(e)=>handleChangeReceipt(index,"hallmark",e.target.value)}
                       /></td>
                       <td className="delIcon"><MdDeleteForever onClick={()=>{handleRemoveRow(index)}}></MdDeleteForever></td>
                       

                     </tr>
                  ))}
                </tbody>
                  </table>

              </div> 
          <div className="receiptBalances">
              <div>
                  <p>CashBalance 0</p>
              </div>
              <div>
                <p>Pure Balance 0</p>
              </div>
              <div>
                <p>Hall Mark Balance 0</p>
              </div>
            </div>    
        </div>
      </div>
    </>
  );
};

export default Receipt;
