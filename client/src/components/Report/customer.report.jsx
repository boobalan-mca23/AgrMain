
import { useEffect, useState, useRef, useMemo } from "react";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dayjs from "dayjs";
import "./customerReport.css";
import {
  Autocomplete,
  Button,
  TextField,
  TablePagination,
  IconButton,
} from "@mui/material";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import axios from "axios";
import CustomerReportPrint from "./Customer_Report_Print/CustomerReportPrint";
import ReactDOMServer from "react-dom/server";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import { useNavigate } from "react-router-dom";
import RepairDetailsModal from "../CustomerReturn&Repair/RepairDetailsModal";
import ReturnDetailsModal from "../CustomerReturn&Repair/ReturnDetailsModal";


const CustReport = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [billInfo, setBillInfo] = useState([]);
  const [overAllBalance, setOverAllBalance] = useState({});
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState({});
  const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showInitialPositive, setShowInitialPositive] = useState(false);
  const [showInitialNegative, setShowInitialNegative] = useState(false);
  const [repairModal, setRepairModal] = useState({ open: false, data: null });
  const [returnModal, setReturnModal] = useState({ open: false, data: null });

  const navigate = useNavigate();
  
  const hallmarkReductions = useMemo(() => {
    const map = {};
    billInfo.forEach(item => {
      if (item.type === "return" || item.type === "repair") {
        const bId = item.info.billId || (item.info.bill && item.info.bill.id);
        if (bId) {
          const reduction = (item.type === "return") 
            ? (Number(item.info.hallmarkReduction) || 0) 
            : (Number(item.info.count || 0) * (Number(item.info.bill?.hallMark) || 0));
          map[bId] = (map[bId] || 0) + reduction;
        }
      }
    });
    return map;
  }, [billInfo]);

  const paginatedData = billInfo.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );


  // Calculate totals for current page

  const handlePrint = () => {
    const printContent = (
      < CustomerReportPrint
        fromDate={fromDate ? fromDate.format("DD/MM/YYYY") : ""}
        toDate={toDate ? toDate.format("DD/MM/YYYY") : ""}
        customerName={selectedCustomer?.name || ""}
        billInfo={paginatedData}
        billReceive={currentPageTotal.billReceive}
        billAmount={currentPageTotal.billAmount}
        overAllBalance={overAllBalance}
        page={page}
        rowsPerPage={rowsPerPage}
      />
    );

    const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Customer Report Print</title>
       
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


  const currentPageTotal = paginatedData.reduce(
    (acc, bill) => {
      if (bill.type === "bill") {
        acc.billAmount += Number(bill.info.billAmount) || 0;
        const currentHM = Number(bill.info.hallmarkQty) * Number(bill.info.hallMark) || 0;
        const reduction = hallmarkReductions[bill.info.id] || 0;
        acc.hmBill += currentHM + reduction;
      } else if (bill.type === "return" || bill.type === "repair") {
        acc.billReceive += Number(bill.info.fwt || bill.info.purity || bill.info.weight) || 0;
        acc.hmReceive += (bill.type === "return" ? (Number(bill.info.hallmarkReduction) || 0) : bill.type === "repair" ? (Number(bill.info.count || 0) * (Number(bill.info.bill?.hallMark) || 0)) : 0);
      } else if (bill.type === "transaction" || bill.type === "ReceiptVoucher" || bill.type === "billReceive") {
        acc.hmReceive += Number(bill.info.receiveHallMark) || 0;
        if ((bill.info.type || "").toLowerCase().includes("cash")) {
          const touch = Number(bill.info.touch) || 0;
          const purity = Number(bill.info.purity) || 0;
          if (touch > 0 && purity > 0) {
            acc.billReceive += (purity / touch) * 100;
          }
        } else {
          acc.billReceive += Number(bill.info.fwt || bill.info.purity || bill.info.gold) || 0;
        }
      } else if (bill.type === "adjustment" || bill.type === "openingBalance") {
        const amt = Number(bill.info.goldAmount || bill.info.cashAmount) || 0;
        const hmAmt = Number(bill.info.hmAmount) || 0;
        if (amt > 0) {
          acc.billAmount += amt;
        } else {
          acc.billReceive += Math.abs(amt);
        }
        if (hmAmt > 0) {
          acc.hmBill += hmAmt;
        } else {
          acc.hmReceive += Math.abs(hmAmt);
        }
      }
      return acc;
    },
    { billReceive: 0, billAmount: 0, hmReceive: 0, hmBill: 0 } // Initial accumulator
  );
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDateClear = () => {
    setFromDate(null);
    setToDate(null);
    setSelectedCustomer({});
    setBillInfo([])

  };

  useEffect(() => {
    if (!selectedCustomer || !selectedCustomer.id) {
      setBillInfo([]);
      setOverAllBalance({});
      return;
    }

    if (fromDate && toDate && toDate.isBefore(fromDate, 'day')) {
      toast.error("To Date cannot be before From Date");
      setBillInfo([]);
      setOverAllBalance({});
      return;
    }

    const fetchBillInfo = async () => {
      try {
        const from = fromDate ? fromDate.format("YYYY-MM-DD") : "";
        const to = toDate ? toDate.format("YYYY-MM-DD") : "";

        const response = await axios.get(
          `${BACKEND_SERVER_URL}/api/bill/customerReport/${selectedCustomer.id}`,
          { params: { fromDate: from, toDate: to } }
        );
        console.log("data", response.data.data);
        setBillInfo(response.data.data || []);
        setOverAllBalance(response.data.overallBal || {});
        setPage(0);
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };
    fetchBillInfo();
  }, [fromDate, toDate, selectedCustomer]);

  const handleCustomer = (newValue) => {
    setSelectedCustomer(newValue || {});
  };


  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/customers`);
        const data = await response.json();
        console.log("customer data", data);
        setCustomers(data || []);
      } catch (error) {
        console.error("Error fetching goldsmith data:", error);
      }
    };
    fetchCustomer();
    const today = dayjs();
    setFromDate(today.subtract(15, 'day'));
    setToDate(today);
  }, []);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div>
        <div className="customerReportHeader">
          <h3>Customer Report</h3>
          <div className={"report"}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="From Date"
                value={fromDate}
                format="DD/MM/YYYY"
                sx={{ width: 260 }}
                onChange={(newValue) => setFromDate(newValue)}
              />
            </LocalizationProvider>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="To Date"
                value={toDate}
                format="DD/MM/YYYY"
                sx={{ width: 260 }}
                minDate={fromDate}
                onChange={(newValue) => setToDate(newValue)}
              />
            </LocalizationProvider>

            {/* Autocomplete */}
            <Autocomplete
              disablePortal
              options={customers}
              getOptionLabel={(option) => option.name || ""}
              sx={{ width: 260 }}
              value={selectedCustomer}
              onChange={(event, newValue) => handleCustomer(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Select Customer" />
              )}
            />

            <Button
              id="clear"
              className="clr noprint customerReportBtn"
              onClick={handleDateClear}
            >
              Clear
            </Button>


            <div className="noprint">
              <Button
                id="print"
                onClick={() => {
                  handlePrint();
                }}
                className="customerReportBtn"
              >
                Print
              </Button>
            </div>

          </div>
        </div>

        <div className="customerReportContainer">
          {paginatedData.length >= 1 ? (
            <table className="customerReportTable">
              <thead id="customerReportHead">
                <tr>
                  <th>S.no</th>
                  <th>Bill No</th>
                  <th>Date</th>
                  <th>Details</th>
                  <th>View bill</th>
                  <th>Received Amount</th>
                  <th>Added Amount</th>
                  <th>Received HM</th>
                  <th>Added HM</th>
                </tr>
              </thead>
              <tbody className="customerReportTbody">
                {paginatedData.map((bill, index) => (
                  <tr key={index + 1}>
                    <td>{page * rowsPerPage + index + 1}</td>
                    <td>
                      {bill.type === "bill" 
                        ? bill.info.id 
                        : (bill.info.billNo || bill.info.billId || (bill.info.bill && bill.info.bill.id) || "-")}
                    </td>
                    <td>
                      {new Date(bill.info.createdAt || bill.info.sentDate).toLocaleDateString(
                        "en-GB"
                      )}
                    </td>

                    <td>
                      {bill.type === "bill" ? (
                        bill.info.orders.length >= 1 ? (
                          <table className="orderTable">
                            <thead className="orderTableTr">
                              <tr>
                                <th>Entry Type</th>
                                {/* <th>Date</th> */}
                                <th>Count</th>
                                <th>Item Name</th>
                                <th>ItemWt</th>
                                <th>StoneWt</th>
                                <th>AWT</th>
                                <th>%</th>
                                <th>FWT</th>
                              </tr>
                            </thead>
                            <tbody className="orderTableTbody">
                              {bill.info.orders.map((item, index) => (
                                <tr key={index + 1}>
                                  {index === 0 && <td rowSpan={bill.info.orders.length}>Bill</td>}
                                  {/* <td>
                                    {new Date(
                                      item.createdAt
                                    ).toLocaleDateString("en-GB")}
                                  </td> */}
                                  <td>{item.count}</td>
                                  <td>{item.productName}</td>
                                  <td>{(Number(item.weight) || 0).toFixed(3)}</td>
                                  <td>{(Number(item.stoneWeight) || 0).toFixed(3)}</td>
                                  <td>{(Number(item.afterWeight) || 0).toFixed(3)}</td>
                                  <td>{(Number(item.percentage) || 0).toFixed(3)}</td>
                                  <td>{(Number(item.finalWeight) || 0).toFixed(3)}</td>
                                </tr>
                              ))}
                              {(Number(bill.info.hallmarkQty) > 0 || Number(bill.info.hallMark) > 0) && (
                                <tr>
                                  <td colSpan={7} style={{ fontWeight: 'bold' }}> <div style={{ display: 'flex', justifyContent: 'space-between' }}> <span> (hallmarkQty X hallmark = total hallMark)</span> <span>{bill.info.hallmarkQty} X {bill.info.hallMark} =</span></div></td>                                  <td>{((Number(bill.info.hallmarkQty) || 0) * (Number(bill.info.hallMark) || 0)).toFixed(3)}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        ) : (
                          <p>No orders to this table</p>
                        )
                      ) : bill.type === "adjustment" || bill.type === "openingBalance" ? (
                        <div style={{ color: bill.type === 'openingBalance' ? 'blue' : 'red', fontWeight: 'bold', textAlign: 'center' }}>
                          {bill.info.description || (bill.type === 'openingBalance' ? 'Opening Balance' : "Manual adjustment from Master")}
                        </div>
                      ) : bill.type === "repair" || bill.type === "return" ? (
                        <table className="receiveTable">
                          <thead className={bill.type === "repair" ? "repairTableTr" : "returnTableTr"}>
                            <tr>
                              <th>Entry Type</th>
                              {/* <th>Date</th> */}
                              <th>Item Name</th>
                              <th>Count</th>
                              <th>ItemWt</th>
                              <th>Stone Wt</th>
                              <th>Net Wt</th>
                              <th>Touch%</th>
                              <th>FWT</th>
                              <th>Hall Mark</th>
                              {bill.type === "repair" && <th>Status</th>}
                            </tr>
                          </thead>
                          <tbody className={bill.type === "repair" ? "repairTableBody" : "returnTableBody"}>
                            <tr>
                              <td>{bill.type === "repair" ? "Repair" : "Return"}</td>
                              {/* <td>
                                {new Date(bill.info.sentDate || bill.info.createdAt).toLocaleDateString("en-GB")}
                              </td> */}
                              <td>{bill.info.itemName || bill.info.productName}</td>
                              <td>{bill.info.count}</td>
                              <td>
                                {bill.type === "repair" 
                                  ? (Number(bill.info.grossWeight) || 0).toFixed(3) 
                                  : (Number(bill.info.weight) || 0).toFixed(3)}
                              </td>
                              <td>
                                {bill.type === "repair"
                                  ? (Number(bill.info.orderItem?.stoneWeight || bill.info.orderItem?.enteredStoneWeight) || 0).toFixed(3)
                                  : (Number(bill.info.stoneWeight || bill.info.enteredStoneWeight) || 0).toFixed(3)}
                              </td>
                              <td>
                                {bill.type === "repair" 
                                  ? (Number(bill.info.netWeight) || 0).toFixed(3) 
                                  : (Number(bill.info.awt || 0) || Number(bill.info.weight - (bill.info.stoneWeight || 0))).toFixed(3)}
                              </td>
                              <td>
                                {bill.type === "repair"
                                  ? (Number(bill.info.orderItem?.percentage) || 0).toFixed(3)
                                  : (Number(bill.info.percentage) || 0).toFixed(3)}
                              </td>
                              <td>
                                {bill.type === "repair" 
                                  ? (Number(bill.info.fwt || bill.info.purity) || 0).toFixed(3) 
                                  : (Number(bill.info.fwt || bill.info.pureGoldReduction) || 0).toFixed(3)}
                              </td>
                                <td>{(bill.type === "return" ? (Number(bill.info.hallmarkReduction) || 0) : bill.type === "repair" ? (Number(bill.info.count || 0) * (Number(bill.info.bill?.hallMark) || 0)) : 0).toFixed(3)}</td>
                              {bill.type === "repair" && <td>{bill.info.status || "-"}</td>}
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <table className="receiveTable">
                          <thead className="receiveTableTr">
                            <tr>
                              <th>Entry Type</th>
                              {/* <th>Date</th> */}
                              <th>Type</th>
                              {(bill.info.type || "").toLowerCase().includes("cash") ? (
                                <>
                                  <th>Amount</th>
                                  <th>Gold Rate</th>
                                  <th>Touch</th>
                                  <th>Purity</th>
                                  <th>Pure Gold</th>
                                </>
                              ) : (
                                <>
                                  <th>Gold</th>
                                  <th>Touch</th>
                                  <th>Purity</th>
                                </>
                              )}
                              {bill.type !== "transaction" && <th>Hall Mark</th>}
                            </tr>
                          </thead>
                          <tbody className="receiveTableBody">
                            <tr key={index + 1}>
                              <td>
                                {bill.type === "ReceiptVoucher"
                                  ? "Receipt Voucher"
                                  : bill.type === "billReceive"
                                  ? "Bill Receive"
                                  : bill.type === "transaction"
                                  ? "Transaction"
                                  : bill.type || ""}
                              </td>
                              {/* <td>
                                {new Date(
                                  bill.info.createdAt
                                ).toLocaleDateString("en-GB")}
                              </td> */}
                                  <td>{bill.info.type || "-"}</td>
                                  {(bill.info.type || "").toLowerCase().includes("cash") ? (
                                    <>
                                      <td>{(Number(bill.info.amount) || 0).toFixed(2)}</td>
                                      <td>{(Number(bill.info.goldRate) || 0).toFixed(3)}</td>
                                      <td>{(Number(bill.info.touch) || 0).toFixed(3)}</td>
                                      <td>{(Number(bill.info.purity) || 0).toFixed(3)}</td>
                                      <td>{
                                        (Number(bill.info.touch) > 0 && Number(bill.info.purity) > 0)
                                          ? ((Number(bill.info.purity) / Number(bill.info.touch)) * 100).toFixed(3)
                                          : "0.000"
                                      }</td>
                                    </>
                                  ) : (
                                    <>
                                      <td>{(Number(bill.info.gold) || 0).toFixed(3)}</td>
                                      <td>{(Number(bill.info.touch) || 0).toFixed(3)}</td>
                                      <td>{(Number(bill.info.purity) || 0).toFixed(3)}</td>
                                    </>
                                  )}
                                  {bill.type !== "transaction" && <td>{(Number(bill.info.receiveHallMark) || 0).toFixed(3)}</td>}
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </td>
                    <td>
                      {bill.type === "bill" ? (
                        <IconButton
                          color="primary"
                          onClick={() => {
                            console.log(`Navigating to bill-view/${bill.info.id}`),
                              navigate(`/bill-view/${bill.info.id}`);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      ) : (
                        <p>-</p>
                      )}
                    </td>

                    {bill.type === "bill" ? (
                      <>
                        <td>-</td>
                        <td>{(Number(bill.info.billAmount) || 0).toFixed(3)}</td>
                        <td>-</td>
                        <td>{((Number(bill.info.hallmarkQty) * Number(bill.info.hallMark) + (hallmarkReductions[bill.info.id] || 0)) || 0).toFixed(3)}</td>
                      </>
                     ) : (bill.type === "return" || bill.type === "repair") ? (
                      <>
                        <td>{(Number(bill.info.fwt || 0).toFixed(3))}</td>
                        <td>-</td>
                        <td>{(bill.type === "return" ? (Number(bill.info.hallmarkReduction) || 0) : (Number(bill.info.count || 0) * (Number(bill.info.bill?.hallMark) || 0))).toFixed(3)}</td>
                        <td>-</td>
                      </>
                      ) : bill.type === "adjustment" || bill.type === "openingBalance" ? (
                        <>
                          <td>
                            {Number(bill.info.goldAmount || bill.info.cashAmount) < 0
                              ? Math.abs(bill.info.goldAmount || bill.info.cashAmount).toFixed(3)
                              : "-"}
                          </td>
                          <td>
                            {Number(bill.info.goldAmount || bill.info.cashAmount) > 0
                              ? (Number(bill.info.goldAmount || bill.info.cashAmount) || 0).toFixed(3)
                              : "-"}
                          </td>
                          <td>
                            {Number(bill.info.hmAmount) < 0
                              ? Math.abs(bill.info.hmAmount).toFixed(3)
                              : "-"}
                          </td>
                          <td>
                            {Number(bill.info.hmAmount) > 0
                              ? (Number(bill.info.hmAmount) || 0).toFixed(3)
                              : "-"}
                          </td>
                        </>
                       ) : (
                       <>
                         <td>
                           {/* {Number(bill.info.purity) > 0 
                             ? (Number(bill.info.amount)).toFixed(3) 
                             : (Number(bill.info.amount) > 0 
                               ? (Number(bill.info.amount)).toFixed(2) 
                               : "0.000")} */}
                               {(Number(bill.info.fwt) || 0).toFixed(3)}
                         </td>
                         <td>-</td>
                         <td>{(Number(bill.info.receiveHallMark) || 0).toFixed(3)}</td>
                         <td>-</td>
                       </>
                     )}
                  </tr>
                ))}

                <tr className="custRepTfoot" >
                  <td colSpan={5} style={{textAlign: 'right'}}><strong>TOTALS:</strong></td>

                  <td className="customerTotal">
                    <strong>
                      {(currentPageTotal.billReceive).toFixed(3)} gr
                    </strong>{" "}
                  </td>
                  <td className="customerTotal">
                    <strong> {(currentPageTotal.billAmount).toFixed(3)} gr</strong>
                  </td>
                  <td className="customerTotal">
                    <strong> {(currentPageTotal.hmReceive).toFixed(3)} gr</strong>
                  </td>
                  <td className="customerTotal">
                    <strong> {(currentPageTotal.hmBill).toFixed(3)} gr</strong>
                  </td>
                </tr>

              </tbody>
            </table>
          ) : (
            <p
              style={{
                textAlign: "center",
                color: "red",
                fontSize: "20px",
                marginTop: "10px",
              }}
            >
              No Bills and Receive Information
            </p>
          )}


        </div>
        <TablePagination

          component="div"
          count={billInfo.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </div>
      <div className="overAllBalance">
        {/* Excess Balance (Negative) */}
        <div className="balanceCard balance-negative">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              Excess Balance:{" "}
              {overAllBalance.balance < 0
                ? overAllBalance.balance.toFixed(3)
                : (0).toFixed(3)}{" "}
              gr
            </span>
            {overAllBalance.initialBalance < 0 && (
              <IconButton
                onClick={() =>
                  setShowInitialNegative((prev) => !prev)
                }
                size="small"
                color="inherit"
              >
                {showInitialNegative ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )}
              </IconButton>
            )}
          </div>

          {showInitialNegative && overAllBalance.initialBalance < 0 && (
            <div className="balanceDetails">
              <p>Initial Value: {(Number(overAllBalance.initialBalance) || 0).toFixed(3)}</p>
            </div>
          )}
        </div>

        {/* Positive Balance */}
        <div className="balanceCard balance-positive">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              Balance:{" "}
              {overAllBalance.balance >= 0
                ? overAllBalance.balance.toFixed(3)
                : (0).toFixed(3)}{" "}
              gr
            </span>
            {overAllBalance.initialBalance >= 0 && (
              <IconButton
                onClick={() =>
                  setShowInitialPositive((prev) => !prev)
                }
                size="small"
                color="inherit"
              >
                {showInitialPositive ? (
                  <ExpandLessIcon />
                ) : (
                  <ExpandMoreIcon />
                )}
              </IconButton>
            )}
          </div>

          {showInitialPositive && overAllBalance.initialBalance >= 0 && (
            <div className="balanceDetails">
              <p>Initial Value: {(Number(overAllBalance.initialBalance) || 0).toFixed(3)}</p>
            </div>
          )}
        </div>
      </div>



    </>
  );
};

export default CustReport;
