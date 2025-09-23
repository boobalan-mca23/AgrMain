import { useEffect, useState, useRef } from "react";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import dayjs from "dayjs";

import "./customerReport.css";
import {
  Autocomplete,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
} from "@mui/material";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import axios from "axios";

const CustReport = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [billInfo, setBillInfo] = useState([]);
  const [overAllBalance, setOverAllBalance] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState({});
  const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const paginatedData =billInfo.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  

  const reportRef = useRef();

  // Calculate totals for current page

  const handleDownloadPdf = async () => {
  
    const thead = document.getElementById("customerReportHead");
    
      if(billInfo.length===0 ){
      return alert("No Bill Informations")
    }
  
    thead.style.position = "static"; // fix for print
   
    setTimeout(async () => {
      const element = reportRef.current;
      const canvas = await html2canvas(element, { scale: 2 });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Define margins
      const margin = 10; // mm
      const usableWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      let position = margin;
      let remainingHeight = imgHeight;
      let imgPosition = 0;

      if (imgHeight <= pdfHeight - margin * 2) {
        // fits in one page
        pdf.addImage(imgData, "PNG", margin, margin, usableWidth, imgHeight);
      } else {
        while (remainingHeight > 0) {
          pdf.addImage(
            imgData,
            "PNG",
            margin,
            position,
            usableWidth,
            imgHeight,
            undefined,
            "FAST"
          );

          remainingHeight -= pdfHeight - margin * 2;
          imgPosition -= pdfHeight - margin * 2;

          if (remainingHeight > 0) {
            pdf.addPage();
            position = margin;
          }
        }
      }

      pdf.save("Customer_Report.pdf");

      // Restore UI
     
      thead.style.position = "sticky";
    }, 1000); // allow DOM to update
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
                    handleDownloadPdf();
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
            <table ref={reportRef} className="customerReportTable">
              <thead id="customerReportHead">
                <tr>
                  <th>S.no</th>
                  <th>BillId</th>
                  <th>Date</th>
                  <th>Bill&Receive</th>
                  <th>ReceiveAmount</th>
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
                  <td colSpan={4}></td>

                  <td className="customerTotal">
                    <strong>
                      Total bill Receive Total:{(currentPageTotal.billReceive).toFixed(3)} gr
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
