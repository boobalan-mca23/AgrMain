import { useEffect, useState, useRef } from "react";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import dayjs from "dayjs";
import { FaCheck } from "react-icons/fa";
import { GrFormSubtract } from "react-icons/gr";
import './receiptreport.css'
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


const ReceiptReport = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [receipt, setReceipt] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState({});
  const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const paginatedData = receipt.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );


  const [isPrinting, setIsPrinting] = useState(true);
  

  const reportRef = useRef();

  // Calculate totals for current page
 
  const handleDownloadPdf = async () => {
  setIsPrinting(false); // show all rows

  const clearBtn = document.getElementById("clear");
  const printBtn = document.getElementById("print");
  const thead = document.getElementById("reportHead");
  const tfoot = document.getElementById("reportFoot");

  clearBtn.style.visibility = "hidden";
  printBtn.style.visibility = "hidden";
  thead.style.position = "static"; // fix for print
  tfoot.style.position = "static"; // fix for print

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
          'FAST'
        );

        remainingHeight -= (pdfHeight - margin * 2);
        imgPosition -= (pdfHeight - margin * 2);

        if (remainingHeight > 0) {
          pdf.addPage();
          position = margin;
        }
      }
    }

    pdf.save("Receipt_Report.pdf");

    // Restore UI
    setIsPrinting(true);
    clearBtn.style.visibility = "visible";
    printBtn.style.visibility = "visible";
    thead.style.position = "sticky";
    tfoot.style.position = "sticky";
  }, 1000); // allow DOM to update
};

// const currentPageTotal = paginatedData.reduce(
//     (acc, job) => {
//       acc.givenWt += job.total[0]?.givenTotal;
//       acc.itemWt += job.total[0]?.deliveryTotal;
//       acc.receive += job.total[0]?.receivedTotal;
//       return acc;
//     },
//     { givenWt: 0, itemWt: 0,receive: 0 } // Initial accumulator
//   );
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
     setSelectedCustomer({})
  };

  const handleCustomer = (newValue) => {
    if (!newValue || newValue === null) {
      return;
    }
    setSelectedCustomer(newValue);

    const fetchReceipts = async () => {
      try {
        const from = fromDate ? fromDate.format("YYYY-MM-DD") : "";
        const to = toDate ? toDate.format("YYYY-MM-DD") : "";

        const response = await axios.get(
          `${BACKEND_SERVER_URL}/api/receipt/${newValue.id}/report`,
          { params: { fromDate: from, toDate: to } }
        );
        console.log("data", response.data);
        setReceipt(response.data);

      
      } catch (error) {
        console.error("Error fetching receipt data:", error);
      }
    };
    fetchReceipts ();
  };

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
    fetchCustomers();
    const today = dayjs();
    setFromDate(today);
    setToDate(today);
  }, []);

  return (
    <>
      <div >
        <div className="receiptreportHeader">
          <h3>Receipt Report</h3>
          <div className={`receipt ${!isPrinting ? "print-mode" : ""}`}>
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

            {isPrinting && (
              <Button
                id="clear"
                className="clr noprint receiptreportBtn"
                onClick={handleDateClear}
              >
                Clear
              </Button>
            )}
            {isPrinting && (
              <div className="noprint">
                <Button
                  id="print"
                  onClick={() => {
                    handleDownloadPdf();
                  }}
                  className="receiptreportBtn"
                >
                  Print
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="receiptTable" >
          {receipt.length >= 1 ? (
         
              <div className="receiptreportContainer" >
                <table ref={reportRef} className="receiptreportTable">
                  <thead  id="receiptreportHead">
                    <tr className="receiptreportThead">
                      <th >S.No</th>
                      <th >Date</th>
                      <th>Type</th>
                      <th>GoldRate</th>
                      <th>Gold</th>
                      <th>Touch</th>
                      <th>Purity</th>
                      <th>Amount</th>
                      <th>HallMark</th>
                    </tr>
                    
                  </thead>
                  <tbody className="receiptreportTbody">
                    {
                      receipt.map((item,index)=>(
                        <tr key={index+1}>
                          <td>{index+1}</td>
                          <td>{item.date}</td>
                          <td>{item.type}</td>
                          <td>{item.goldRate}</td>
                          <td>{item.gold}</td>
                          <td>{item.touch}</td>
                          <td>{item.purity}</td>
                          <td>{item.amount}</td>
                          <td>{item.receiveHallMark}</td>

                        </tr>
                      ))
                    }
                   </tbody>
                </table>

                 <TablePagination
               
                component="div"
                count={receipt.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
              </div>
             
         
            

          ) : (
            <span style={{ display: "block", textAlign: "center" }}>
              No Receipts For this Customers
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default ReceiptReport;
