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
  };

  const handleGoldSmith = (newValue) => {
    if (!newValue || newValue === null) {
      return;
    }
    setSelectedGoldSmith(newValue);

    const fetchJobCards = async () => {
      try {
        const from = fromDate ? fromDate.format("YYYY-MM-DD") : "";
        const to = toDate ? toDate.format("YYYY-MM-DD") : "";

        const response = await axios.get(
          `${BACKEND_SERVER_URL}/api/assignments/${newValue.id}/report`,
          { params: { fromDate: from, toDate: to } }
        );
        console.log("data", response.data);
        setJobCard(response.data);
      } catch (error) {
        console.error("Error fetching goldsmith data:", error);
      }
    };
    fetchJobCards();
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
    setFromDate(today);
    setToDate(today);
  }, []);


  return (
    <>
      <div>
        <div className="reportHeader">
          <h3>GoldSmith Report</h3>
          <div className="report">
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
              options={goldSmith}
              getOptionLabel={(option) => option.name || ""}
              sx={{ width: 300 }}
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
              <JobCardRepTable paginatedData={paginatedData}  />
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
