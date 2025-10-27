import { useEffect, useState, useRef } from "react";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import ReceiptPrintReport from "./Receipt_Voucher_Print/ReceiptPrint";
import ReactDOMServer from "react-dom/server";
import "./receiptreport.css";
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

  const reportRef = useRef();

  // Calculate totals for current page

  const handlePrint = () => {
    const printContent = (
      <ReceiptPrintReport
        fromDate={fromDate ? fromDate.format("DD/MM/YYYY") : ""}
        toDate={toDate ? toDate.format("DD/MM/YYYY") : ""}
        customerName={selectedCustomer?.name || ""}
        receipt={receipt}
        selectedCustomer={selectedCustomer}
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
    setReceipt([]);
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
    fetchReceipts();
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
      <div>
        <div className="receiptreportHeader">
          <h3>Receipt Report</h3>
          <div className="receipt">
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
              className="clr noprint receiptreportBtn"
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
                className="receiptreportBtn"
              >
                Print
              </Button>
            </div>
          </div>
          <p style={{ display: "flex", alignItems: "center", gap: "10px"}}>
            <strong>
              {selectedCustomer?.customerBillBalance?.balance > 0
                ? "Old Balance: "
                : selectedCustomer?.customerBillBalance?.balance < 0
                ? "Excess  Balance: "
                : " Balance "}
              {Number(
                selectedCustomer?.customerBillBalance?.balance || 0
              ).toFixed(3)}
            </strong>
            <span
              style={{ borderLeft: "2px solid #999", height: "30px" }}
            ></span>
            <strong>
              HallMark Balance:
              {Number(
                selectedCustomer?.customerBillBalance?.hallMarkBal || 0
              ).toFixed(3)}
            </strong>
          </p>
        </div>

        <div className="receiptTable">
          {receipt.length >= 1 ? (
            <div className="receiptreportContainer">
              <table ref={reportRef} className="receiptreportTable">
                <thead id="receiptreportHead">
                  <tr className="receiptreportThead">
                    <th>S.No</th>
                    <th>Date</th>
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
                  {paginatedData.map((item, index) => (
                    <tr key={index + 1}>
                      <td>{index + 1}</td>
                      <td>{item.date}</td>
                      <td>{item.type}</td>
                      <td>{item.goldRate}</td>
                      <td>{item.gold}</td>
                      <td>{item.touch}</td>
                      <td>{item.purity}</td>
                      <td>{item.amount}</td>
                      <td>{item.receiveHallMark}</td>
                    </tr>
                  ))}
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
