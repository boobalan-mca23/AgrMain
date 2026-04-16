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
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const JobCardReport = () => {
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [jobCard, setJobCard] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [goldSmith, setGoldSmith] = useState([]);
  const [selectedGoldSmith, setSelectedGoldSmith] = useState({});
  const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [viewType, setViewType] = useState("ALL");
  const repairsRef = useRef(null);

  const scrollToRepairs = () => {
    repairsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const paginatedData = jobCard.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const paginatedRepairs = repairs.slice(
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
        repairs={repairs}
        page={page}
        rowsPerPage={rowsPerPage}
        viewType={viewType}
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
        setJobCard(response.data.jobCards || []);
        setRepairs(response.data.repairs || []);
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

            {/* {viewType !== "JOBCARD" && paginatedRepairs && paginatedRepairs.length > 0 && (
              <div className="noprint">
                <Button
                  variant="outlined"
                  onClick={scrollToRepairs}
                  className="reportBtn"
                  sx={{ borderColor: "#2c3e50", color: "#2c3e50" }}
                >
                  View Repairs
                </Button>
              </div>
            )} */}



            {viewType !== "REPAIR" && (
              jobCard.length > 0 && jobCard.at(-1)?.total?.length > 0 ? (
                <div className="jobInfo">
                  {jobCard.at(-1).total[0].jobCardBalance >= 0 ? (
                    <div className="balanceBadge balanceCredit">
                      <span className="balanceLabel">Gold Smith Balance:</span>
                      <span className="balanceAmount">
                        {jobCard.at(-1).total[0].jobCardBalance.toFixed(3)}g
                      </span>
                    </div>
                  ) : (
                    <div className="balanceBadge balanceDebit">
                      <span className="balanceLabel">Owner Due:</span>
                      <span className="balanceAmount">
                        {Math.abs(jobCard.at(-1).total[0].jobCardBalance).toFixed(3)}g
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="jobInfo">
                  <div className="balanceBadge balanceZero">
                    <span className="balanceLabel">Balance:</span>
                    <span className="balanceAmount">0.000g</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="jobReportTable">
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={viewType} 
              onChange={(e, val) => setViewType(val)} 
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab label="All Records" value="ALL" />
              <Tab label="Job Cards" value="JOBCARD" />
              <Tab label="Repaired Products" value="REPAIR" />
            </Tabs>
          </Box>
          {jobCard.length >= 1 || repairs.length >= 1 ? (
            <div className="reportContainer">
              <JobCardRepTable 
                paginatedData={paginatedData} 
                paginatedRepairs={paginatedRepairs} 
                page={page} 
                rowsPerPage={rowsPerPage} 
                repairsRef={repairsRef}
                viewType={viewType}
              />
              <TablePagination
                component="div"
                count={
                  viewType === "ALL" 
                    ? Math.max(jobCard.length, repairs.length) 
                    : (viewType === "REPAIR" ? repairs.length : jobCard.length)
                }
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 15, 30, 50, 100]}
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
