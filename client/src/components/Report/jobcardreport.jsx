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
import "./jobcardreport.css";
import JobCardRepTable from "./jobCardRepTable";
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

      pdf.save("JobCard_Report.pdf");

      // Restore UI
      setIsPrinting(true);
      clearBtn.style.visibility = "visible";
      printBtn.style.visibility = "visible";
      thead.style.position = "sticky";
      tfoot.style.position = "sticky";
    }, 1000); // allow DOM to update
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

  const totalStoneWt = (deduction) => {
    return deduction.reduce((acc, val) => val.weight + acc, 0);
  };
  return (
    <>
      <div>
        <div className="reportHeader">
          <h3>GoldSmith Report</h3>
          <div className={`report ${!isPrinting ? "print-mode" : ""}`}>
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

            {isPrinting && (
              <Button
                id="clear"
                className="clr noprint reportBtn"
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
                  className="reportBtn"
                >
                  Print
                </Button>
              </div>
            )}

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
              <JobCardRepTable paginatedData={paginatedData} ref={reportRef} />
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
