import { useEffect, useState, useRef } from "react";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
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
import { useNavigate } from "react-router-dom";


const CustReport = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [billInfo, setBillInfo] = useState([]);
  const [overAllBalance, setOverAllBalance] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState({});
  const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const navigate = useNavigate();
  
  const paginatedData =billInfo.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );


  // Calculate totals for current page

  const handlePrint =  () => {
   const printContent = (
      < CustomerReportPrint
        fromDate={fromDate ? fromDate.format("DD/MM/YYYY") : ""}
        toDate={toDate ? toDate.format("DD/MM/YYYY") : ""}
        customerName={selectedCustomer?.name || ""}
        billInfo={paginatedData}
        billReceive={currentPageTotal.billReceive}
        billAmount={currentPageTotal.billAmount}
        overAllBalance={overAllBalance}
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
      if(bill.type === "bill"){
        acc.billAmount+=bill.info.billAmount
      }else{
        acc.billReceive+=bill.info.purity 
      }
      return acc;
    },
    { billReceive: 0, billAmount: 0} // Initial accumulator
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

  const handleCustomer = (newValue) => {
    if (!newValue || newValue === null) {
      return;
    }
    setSelectedCustomer(newValue);
    console.log(newValue);

    const fetchBillInfo = async () => {
      try {
        const from = fromDate ? fromDate.format("YYYY-MM-DD") : "";
        const to = toDate ? toDate.format("YYYY-MM-DD") : "";

        const response = await axios.get(
          `${BACKEND_SERVER_URL}/api/bill/customerReport/${newValue.id}`,
          { params: { fromDate: from, toDate: to } }
        );
        console.log("data", response.data.data);
        setBillInfo(response.data.data);
        setOverAllBalance(response.data.overallBal);
      } catch (error) {
        console.error("Error fetching goldsmith data:", error);
      }
    };
    fetchBillInfo();
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
    setFromDate(today);
    setToDate(today);
  }, []);

  return (
    <>
      <div>
        <div className="customerReportHeader">
          <h3>Customer Report</h3>
          <div className={"report"}>
            <label>From Date</label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DemoContainer components={["DatePicker"]}>
                <DatePicker
                  value={fromDate}
                  format="DD/MM/YYYY"
                  onChange={(newValue) => setFromDate(newValue)}
                />
              </DemoContainer>
            </LocalizationProvider>
            <label>To Date</label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DemoContainer components={["DatePicker"]}>
                <DatePicker
                  value={toDate}
                  format="DD/MM/YYYY"
                  onChange={(newValue) => setToDate(newValue)}
                />
              </DemoContainer>
            </LocalizationProvider>

            {/* Autocomplete */}
            <Autocomplete
              disablePortal
              options={customers}
              getOptionLabel={(option) => option.name || ""}
              sx={{ width: 300 }}
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
            <table  className="customerReportTable">
              <thead id="customerReportHead">
                <tr>
                  <th>S.no</th>
                  <th>Bill Id</th>
                  <th>Date</th>
                  <th>Bill&Receive</th>
                  <th>View bill</th>
                  <th>Receive Amount</th>
                  <th>Bill Amount</th>
                </tr>
              </thead>
              <tbody className="customerReportTbody">
                {paginatedData.map((bill, index) => (
                  <tr key={index + 1}>
                    <td>{index + 1}</td>
                    <td>{bill.type==="bill"?bill.info.id:"-"}</td>
                    <td>
                      {new Date(bill.info.createdAt).toLocaleDateString(
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
                                <th>Date</th>
                                <th>ProductName</th>
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
                                  <td>{bill.type||""}</td>
                                  <td>
                                    {new Date(
                                      item.createdAt
                                    ).toLocaleDateString("en-GB")}
                                  </td>
                                  <td>{item.productName}</td>
                                  <td>{item.weight}</td>
                                  <td>{item.stoneWeight}</td>
                                  <td>{item.afterWeight}</td>
                                  <td>{item.percentage}</td>
                                  <td>{item.finalWeight}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p>No orders to this table</p>
                        )
                      ) : (
                        <table className="receiveTable">
                          <thead className="receiveTableTr">
                            <tr>
                              <th>Entry Type</th>
                              <th>Date</th>
                              <th>goldRate</th>
                              <th>gold</th>
                              <th>touch</th>
                              <th>purity</th>
                              <th>amount</th>
                              <th>hallMark</th>
                            </tr>
                          </thead>
                          <tbody className="receiveTableBody">
                            <tr key={index+1}>
                              <td>{bill.type||""}</td>
                              <td>
                                {new Date(
                                  bill.info.createdAt
                                ).toLocaleDateString("en-GB")}
                              </td>
                              <td>{bill.info.goldRate}</td>
                              <td>{bill.info.gold}</td>
                              <td>{bill.info.touch}</td>
                              <td>{bill.info.purity}</td>
                              <td>{bill.info.amount}</td>
                              <td>{bill.info.receiveHallMark||0}</td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </td>
                    <td>
                      {bill.type === "bill" ? (
                      <IconButton color="primary" onClick={() => {console.log(
                      `Navigating to bill-view/${bill.info.id}`
                      ),navigate(`/bill-view/${bill.info.id}`)}}>
                        <VisibilityIcon />
                      </IconButton>):(<p>-</p>)}

                    </td>

                    {bill.type === "bill" ? (
                      <>
                        <td>-</td>
                        <td>{bill.info.billAmount}</td>
                      </>
                    ) : (
                      <>
                        <td>{bill.info.purity}</td>
                        <td>-</td>
                      </>
                    )}
                  </tr>
                ))}
               
                 <tr   className="custRepTfoot" >
                  <td colSpan={5}></td>

                  <td className="customerTotal">
                    <strong>
                      Total bill Receive :{(currentPageTotal.billReceive).toFixed(3)} gr
                    </strong>{" "}
                  </td>
                  <td className="customerTotal">
                    <strong> Total bill Amount:{(currentPageTotal.billAmount).toFixed(3)} gr</strong>
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
                rowsPerPageOptions={[5, 10, 25]}
              />
      </div>
        <div className="overAllBalance">
           <div className="balanceCard balance-negative">
                 Excess Balance: {overAllBalance<0 ?(overAllBalance).toFixed(3):0.000} gr
           </div>

           <div className="balanceCard balance-positive">
               Balance : {overAllBalance>=0 ?(overAllBalance).toFixed(3):0.000} gr
           </div>
          </div>

           
    </>
  );
};

export default CustReport;
