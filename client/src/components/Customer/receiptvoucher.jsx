import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { ToastContainer, toast } from "react-toastify";
import "./receiptvoucher.css";
import { MdDeleteForever } from "react-icons/md";
import PrintReceipt from "../PrintReceipt/PrintReceipt";
import ReactDOMServer from "react-dom/server";
import { useSearchParams } from "react-router-dom";
import NewReceipt from "./NewReceipt";
const Receipt = () => {
  const today = new Date();
  const formattedToday = today.toISOString().split("T")[0];
 
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("id");
  const customerName = searchParams.get("name");
  const [open,setOpen]=useState(false)
  
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
 
 const handleClose=()=>{
    setOpen(false)
 }
 
  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const response = await axios.get(`${BACKEND_SERVER_URL}/api/receipt/${customerId}`);
        console.log("response", response.data);

        setAllReceipts(response.data);
      } catch (error) {
        console.error("Error fetching Receipts:", error);
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
    fetchReceipt();
    fetchTouch();
  }, []);

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

  const handlePrint = (receipt) => {
  

    const printContent = (
      <PrintReceipt
        receipt={receipt}
        customerName={customerName}
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

  const handleSaveReeceipt = () => {
    const payLoad = {
      customerId: customerId,
      received: receipt,
      pureBalance: pureBalance,
      hallmarkBalance: hallmarkBalance,
    };
    console.log("payLoad", payLoad);

    const saveReceipt = async () => {
     
      try {
        const response = await axios.post(
          `${BACKEND_SERVER_URL}/api/receipt`,
          payLoad
        );
        if (response.status === 201) {
          toast.success(response.data.message);

          setTimeout(()=>{
             handlePrint(receipt);
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
   
  };
  return (
    <>
      <div> 
        <div className="receiptTitle">
          <h2>Receipt Voucher {customerId} {customerName}</h2>
        </div>

        <div>
          <div className="receiptFlex">
            <div>
              <p className="receiptLabel">Customer Name</p>
                <input
                className="receiptInput"
                readOnly
                value={customerName}
              />
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
           <div className="receiptActions">
          <button className="addReceipt" onClick={()=>{setOpen(true)}}>Add Receipt</button>
          <button className="printReceipt">Print</button>
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
                {allReceipts.length>=1 ? ( 
                
                allReceipts.map((item, index) => (
                  <tr key={index + 1}>
                    <td>{index + 1}</td>
                    <td>{item.date}</td>
                    <td>{item.type}</td>
                    <td>{item.goldRate||"-"}</td>
                    <td>{item.gold||"-"}</td>
                    <td>{item.touch||"-"}</td>
                    <td>{item.purity||"-"}</td>
                    <td>{item.amount}</td>
                    <td>{item.hallMark}</td>
                    <td className="delIcon">
                      <MdDeleteForever
                        // onClick={() => {
                        //   handleRemoveRow(index);
                        // }}
                      ></MdDeleteForever>
                    </td>
                  </tr>
                ))
                ):
                (<tr><td style={{color:"red",fontSize:"18px"}}colSpan={10}>No Receipts For This Customer ! </td></tr>)}
              </tbody>
            </table>
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

      {
       open && ( 
       
       <NewReceipt 
         open={open}
         setOpend={setOpen}
         handleClose={handleClose}
        />)
      }
    
    </>
  );
};

export default Receipt;
