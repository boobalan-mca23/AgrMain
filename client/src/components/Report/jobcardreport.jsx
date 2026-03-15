import { useEffect, useState, useRef } from "react";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import "./jobcardreport.css";
import JobCardRepTable from "./jobCardRepTable";
import JobCardPrintLayout from "./JobCard_Print/JobCardPrint";
import ReactDOMServer from "react-dom/server";
import {
  Autocomplete,
  Button,
  TextField,
  TablePagination,
} from "@mui/material";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const JobCardReport = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [jobCard, setJobCard] = useState([]);
  const [goldSmith, setGoldSmith] = useState([]);
  const [selectedGoldSmith, setSelectedGoldSmith] = useState({});
  const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const paginatedData = jobCard.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Calculate totals for current page

  const handlePrint = async () => {
    const printContent = (
      <JobCardPrintLayout
        fromDate={fromDate ? fromDate.format("DD/MM/YYYY") : ""}
        toDate={toDate ? toDate.format("DD/MM/YYYY") : ""}
        goldSmithName={selectedGoldSmith?.name || ""}
        jobCard={paginatedData}
        totalJobCard={jobCard}
        page={page}
        rowsPerPage={rowsPerPage}
      />
    );

    const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Job Card Report </title>
       
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
    setSelectedGoldSmith({});
    setJobCard([])
  };

  useEffect(() => {
    if (!selectedGoldSmith || !selectedGoldSmith.id) {
      setJobCard([]);
      return;
    }

    if (fromDate && toDate && toDate.isBefore(fromDate, 'day')) {
      toast.error("To Date cannot be before From Date");
      setJobCard([]);
      return;
    }

    const fetchJobCards = async () => {
      try {
        const from = fromDate ? fromDate.format("YYYY-MM-DD") : "";
        const to = toDate ? toDate.format("YYYY-MM-DD") : "";

        const response = await axios.get(
          `${BACKEND_SERVER_URL}/api/assignments/${selectedGoldSmith.id}/report`,
          { params: { fromDate: from, toDate: to } }
        );
        console.log("data", response.data);
        setJobCard(response.data);
        setPage(0); // reset pagination when filters change
      } catch (error) {
        console.error("Error fetching goldsmith data:", error);
      }
    };
    fetchJobCards();
  }, [fromDate, toDate, selectedGoldSmith]);

  const handleGoldSmith = (newValue) => {
    setSelectedGoldSmith(newValue || {});
  };

  useEffect(() => {
    const fetchGoldsmiths = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/goldsmith`);
        const data = await response.json();

        setGoldSmith(data || []);
      } catch (error) {
        console.error("Error fetching goldsmith data:", error);
      }
    };
    fetchGoldsmiths();
    const today = dayjs();
    setFromDate(today.subtract(15, 'day'));
    setToDate(today);
  }, []);


  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div>
        <div className="reportHeader">
          <h3>GoldSmith Report</h3>
          <div className="report">
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
                label="Due Date"
                value={toDate}
                format="DD/MM/YYYY"
                sx={{ width: 260 }}
                onChange={(newValue) => setToDate(newValue)}
              />
            </LocalizationProvider>

            {/* Autocomplete */}
            <Autocomplete
              disablePortal
              options={goldSmith}
              getOptionLabel={(option) => option.name || ""}
              sx={{ width: 260 }}
              value={selectedGoldSmith}
              onChange={(event, newValue) => handleGoldSmith(newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Select GoldSmith" />
              )}
            />


            <Button
              id="clear"
              className="clr noprint reportBtn"
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
                className="reportBtn"
              >
                Print
              </Button>
            </div>


            {jobCard.length > 0 && jobCard.at(-1)?.total?.length > 0 ? (
              <div className="jobInfo">
                {jobCard.at(-1).total[0].jobCardBalance >= 0 ? (
                  <span style={{ color: "green", fontSize: "20px" }}>
                    Gold Smith Should Given{" "}
                    {jobCard.at(-1).total[0].jobCardBalance.toFixed(3)}g
                  </span>
                ) : jobCard.at(-1).total[0].jobCardBalance < 0 ? (
                  <span style={{ color: "red", fontSize: "20px" }}>
                    Owner Should Given{" "}
                    {jobCard.at(-1).total[0].jobCardBalance.toFixed(3)}g
                  </span>
                ) : (
                  <span style={{ color: "black", fontSize: "20px" }}>
                    balance 0
                  </span>
                )}
              </div>
            ) : (
              <div className="jobInfo">
                <span>No Balance</span>
              </div>
            )}
          </div>
        </div>

        <div className="jobReportTable">
          {jobCard.length >= 1 ? (
            <div className="reportContainer">
              <JobCardRepTable paginatedData={paginatedData} page={page} rowsPerPage={rowsPerPage} />
              <TablePagination
                component="div"
                count={jobCard.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </div>
          ) : (
            <span style={{ display: "block", textAlign: "center" }}>
              No JobCard For this GoldSmith
            </span>
          )}
        </div>
      </div>
    </>
  );
};

export default JobCardReport;
