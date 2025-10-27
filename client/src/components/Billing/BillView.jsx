import React, { useEffect, useState, useMemo } from "react";
import {
  Autocomplete,
  TextField,
  Box,
  Button,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
  IconButton,
  MenuItem,
  Select,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { MdDeleteForever } from "react-icons/md";
import ReactDOMServer from 'react-dom/server';
import "./BillView.css";
import PrintableBill from "./PrintableBill";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

// Helper utilities
const toNumber = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const toFixedStr = (v, d = 3) => {
  return (
    Math.round((toNumber(v) + Number.EPSILON) * Math.pow(10, d)) /
    Math.pow(10, d)
  ).toFixed(d);
}; 

const BillView = () => {
  const { billId } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [previousBalance, setPreviousBalance] = useState(0);
  const [prevHallmark, setPrevHallmark] = useState(0);
  const [date] = useState(new Date().toLocaleDateString());
  const [time] = useState(
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );
  const [rows, setRows] = useState([]);
  const [billDetailRows, setBillDetailRows] = useState([]);
  const [billHallmark, setBillHallmark] = useState("");
  const [currentBill, setCurrentBill] = useState(null);
  const [cashBalance, setCashBalance] = useState("0.00");
  const [BillDetailsProfit, setBillDetailsProfit] = useState([]);
  const [StoneProfit, setStoneProfit] = useState([]);
  const [TotalBillProfit, setTotalBillProfit] = useState([]);
  const [hallmarkQty, setHallmarkQty] = useState(0);

  const inputStyle = {
    minWidth: "70px",
    width: "100%",
    padding: "6px 8px",
    fontSize: "13px",
    height: "32px",
    boxSizing: "border-box",
    textAlign:'center'
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 600,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
    borderRadius: "10px",
  };

  const sidebarButtonSX = {
    display: "flex",
    alignItems: "center",
    color: "white",
    backgroundColor: "#0a4c9a",
    flexDirection: "row",
    gap: "10px",
    cursor: "pointer",
    marginBottom: "5px",
    padding: "8px 12px",
    borderRadius: "8px",
    "&:hover": { backgroundColor: "#0a4c9a" },
    alignSelf: "center",
    width: 80,
  };

  useEffect(() => {
    const fetchBill = async () => {
      try {
        console.log("Fetching bill with ID:", billId);
        const response = await fetch(
          `${BACKEND_SERVER_URL}/api/bill/${billId}`
        );
        const data = await response.json();
        console.log("Fetched bill data:", data);
        const fetchedBill = data.allBills?.[0] || data;
        if (!fetchedBill) {
          console.warn("Bill not found in response");
          setBill(null);
          return;
        }

        setBill(fetchedBill);
        setCurrentBill(fetchedBill);
        setBillDetailsProfit(fetchedBill.billDetailsprofit || "0.000");
        setStoneProfit(fetchedBill.Stoneprofit || "0.000");
        setTotalBillProfit(fetchedBill.Totalprofit || "0.000");
        setBillDetailRows(
          (fetchedBill.orders || []).map((item) => ({
            id: item.id,
            productId: item.stockId,
            productName: item.productName,
            count: item.count?.toString() || "",
            wt: item.weight?.toString() || "",
            stWt: item.stoneWeight?.toString() || "",
            awt: item.afterWeight?.toString() || "",
            percent: item.percentage?.toString() || "",
            fwt: item.finalWeight?.toString() || "",
          }))
        );

        setRows(
          (fetchedBill.billReceive || []).map((item) => ({
            id: item.id,
            date: item.date,
            type: item.type,
            goldRate: item.goldRate?.toString() || "",
            givenGold: item.gold?.toString() || "",
            touch: item.touch?.toString() || "",
            purityWeight: item.purity?.toString() || "",
            amount: item.amount?.toString() || "",
            hallmark: item.receiveHallMark?.toString() || "",
            isLocked: true,
          }))
        );

        setSelectedCustomer(fetchedBill.customers || null);
        setBillHallmark(fetchedBill.hallMark || "");
        setHallmarkQty(fetchedBill.hallmarkQty);
        setPreviousBalance(fetchedBill.PrevBalance || 0);
        setPrevHallmark(fetchedBill.prevHallMark || "");
        setCashBalance(fetchedBill.cashBalance || "0.00");

        console.log("Bill fully loaded:", fetchedBill);
      } catch (error) {
        console.error("Error fetching bill:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [billId]);

  const FWT = useMemo(() =>billDetailRows.reduce((total, row) => total + (toNumber(row.fwt) || 0),0),[billDetailRows]);
  
  const totalReceivedPurity = useMemo(
    () => rows.reduce((acc, row) => acc + (toNumber(row.purityWeight) || 0), 0),
    [rows]
  );

  const TotalFWT = previousBalance > 0
      ? toNumber(FWT) + toNumber(previousBalance)
      : previousBalance < 0
      ? toNumber(FWT) - Math.abs(toNumber(previousBalance))
      : toNumber(FWT);

  const hallmarkAmount = useMemo(() => toNumber(hallmarkQty) * toNumber(billHallmark), [hallmarkQty, billHallmark]);
  const totalHallmark = useMemo(() => toNumber(prevHallmark) + toNumber(hallmarkAmount), [prevHallmark, hallmarkAmount]);
  const pureBalance = TotalFWT - totalReceivedPurity;
  const totalBillHallmark = toNumber(billHallmark);
  const totalReceivedHallmark = rows.reduce((total, row) => total + (toNumber(row.hallmark) || 0),0);
  const hallmarkBalance = totalBillHallmark - totalReceivedHallmark;
  const hasCash = rows.some(r => r.type === "Cash");
  const hasGold = rows.some(r => r.type === "Gold");
  console.log("hasCash:", hasCash, "hasGold:", hasGold);
  const showGoldRateColumn = hasCash;
  const showGivenGoldColumn = hasGold;
  const showTouchColumn = hasGold;
  const showAmountColumn = hasCash;

  const visibleReceivedCols = 1/*S.No*/+ 1/*Date*/+ 1/*Type*/+(showGoldRateColumn ? 1 : 0) + (showGivenGoldColumn ? 1 : 0) /*Purity*/+ (showAmountColumn ? 1 : 0) + 1/*Hallmark*/+1;/*Action*/
  // const visibleReceivedCols = 1/*S.No*/+ 1/*Date*/+ 1/*Type*/+(showGoldRateColumn ? 1 : 0) + (showGivenGoldColumn ? 1 : 0) + (showTouchColumn ? 1 : 0) + 1/*Purity*/ /*Hallmark*/+1;/*Action*/

    const handlePrint = () => {
      const billData = {
        billNo: currentBill?.billno,
        date:currentBill?.date  ? new Date(currentBill.date).toLocaleDateString("en-IN")  : date,
        time: currentBill?.time  ? new Date(currentBill.time).toLocaleTimeString("en-IN", {  hour: "2-digit",  minute: "2-digit",  hour12: true,  })  : time,
        selectedCustomer,
  
        // bill details
        billItems: billDetailRows.map((row) => ({
          productName: row.productName,
          count: row.count,
          weight: row.wt,
          stoneWeight: row.stWt,
          afterWeight: row.awt,
          percentage: row.percent,
          finalWeight: row.fwt,
        })),
  
        // received details
        rows: rows.map((row) => ({
          date: row.date,
          gold: row.givenGold,
          cash: row.cash,
          goldRate: row.goldRate,
          touch: row.touch,
          purity: row.purityWeight,
          amount: row.amount,
          receiveHallMark: row.hallmark,
        })),
  
        // balances
        pureBalance,
        hallmarkBalance,
        cashBalance,
        prevHallmark,
        //
        hallmarkAmount,
        totalHallmark,
        FWT,
        TotalFWT,
        //
        prevBalance: previousBalance, 
        hallMark: toNumber(billHallmark) || 0,
        hallmarkQty,
        totalBillHallmark,
        // profits
        billDetailsprofit: BillDetailsProfit, 
        Stoneprofit: StoneProfit,        
        Totalprofit: TotalBillProfit,
      };
  
      console.log("Printing bill data:", billData);
      const printContent = (
        <PrintableBill
          {...billData}
          viewMode={true}
          selectedBill={billData}
        />
      );
  
      const printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bill Print</title>
            <link rel="stylesheet" href="./PrintableBill.css">
          </head>
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


  if (loading) return <p>Loading bill details...</p>;
  if (!bill) return <p>Bill not found.</p>;

  return (
    <Box className="billing-wrapper">
      {/* Left panel */}
      <Box
        className="left-panel"
        style={{ maxwidth: "65%", position: "absolute", left: "15%" }}
      >
        <Box style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            marginTop: -45,
            gap: "10px",
          }}
        ></Box>
        <h1 className="heading">Estimate Only</h1>

        {/*<Box onClick={()=> window.history.back()} style={sidebarButtonSX}>
            <ExitToAppIcon /><span>Exit</span>
          </Box> */}

        <Box className="bill-header">
          <>
            <Box className="bill-number">
              <p> {" "} <strong>Bill No:</strong> {bill.billno}{" "} </p>
            </Box>
            <Box className="bill-info">
              <p> {" "} <strong>Date:</strong>{" "}
                {new Date(bill.date).toLocaleDateString("En-gb")} <br />
                <br /> <strong>Time:</strong>{" "}
                {bill.time
                  ? new Date(bill.time).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : ""}{" "}
              </p>
            </Box>
          </>
        </Box>

        <Box className="search-section no-print">
          <Autocomplete
            value={bill.customername || null}
            disabled
            renderInput={(params) => (
              <TextField
                {...params}
                style={{ width: "15rem" }}
                label="Select Customer"
                variant="outlined"
                size="small"
              />
            )}
          />
        </Box>

        <Box className="customer-details">
          <h3 className="no-print">Customer Details:</h3>
          <p>
            {" "}
            <strong>Name:</strong> {bill.customername || null}{" "}
          </p>
        </Box>

        {/* Bill details table */}
        <Box className="items-section">
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>Bill Details:</h3>
          </Box>

          <Table
            className="table"
            style={{
              marginTop: "10px",
              minWidth: "500px",
              width: "100%",
              tableLayout: "fixed",
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell className="th" style={{textAlign:'center'}}>S.No</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>Product Name</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>Count</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>Wt</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>St.WT</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>AWT</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>%</TableCell>
                <TableCell className="th" style={{textAlign:'center'}}>FWT</TableCell>
                {/* <TableCell className="th no-print">Action</TableCell> */}
              </TableRow>
            </TableHead>
            <TableBody>
              {billDetailRows.length > 0 ? (
                billDetailRows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="td">{index + 1}</TableCell>
                    <TableCell className="td">
                      <TextField
                        size="small"
                        value={row.productName}
                        disabled
                        inputProps={{ style: inputStyle }}
                      />
                    </TableCell>

                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.count}
                        disabled
                        inputProps={{ style: inputStyle }}
                      />
                    </TableCell>

                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.wt}
                        disabled
                        inputProps={{ style: inputStyle }}
                      />
                    </TableCell>
                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.stWt}
                        disabled
                        inputProps={{ style: inputStyle }}
                      />
                    </TableCell>
                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.awt}
                        disabled
                        inputProps={{ style: inputStyle }}
                      />
                    </TableCell>
                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.percent}
                        disabled
                        inputProps={{ style: inputStyle }}
                      />
                    </TableCell>
                    <TableCell className="td">
                      <TextField
                        size="small"
                        type="text"
                        value={row.fwt}
                        disabled
                        inputProps={{ style: inputStyle }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="no-products-message">
                    No Bill details added
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Hallmark / Balance */}
          <Box
            className="hallmark-balance-wrapper"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 4,
              mt: 2,
            }}
          >
            <Box
              className="hallmark-column"
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <Box>
                <strong>Hallmark Balance:</strong>{" "}
                {prevHallmark ? toFixedStr(prevHallmark, 3) : "000.000"}
              </Box>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <TextField
                  size="small"
                  type="text"
                  label="Qty"
                  value={bill.hallmarkQty}
                  disabled
                  sx={{ width: 60 }}
                />
                <p>X</p>
                <TextField
                  size="small"
                  type="text"
                  label="Current Hallmark"
                  value={billHallmark}
                  disabled
                  sx={{ width: 150 }}               
                />
                <p>=</p>
                <TextField
                  size="small"
                  type="text"
                  label="Total"
                  value={hallmarkAmount.toFixed(3)}
                  disabled
                  sx={{ width: 130 }}
                />
              </div>
              <TextField
                size="small"
                type="text"
                label="Total Hallmark"
                value={totalHallmark.toFixed(3)}
                disabled
                sx={{ width: 130 }}
              />
            </Box>
            <Box className="balance-info">
              {previousBalance > 0 ? (
                <>
                  <div className="negative">
                    Opening Balance: {toFixedStr(previousBalance, 3)}
                  </div>
                  <div>FWT: {toFixedStr(FWT, 3)}</div>
                  <div>Total FWT: {toFixedStr(TotalFWT, 3)}</div>
                </>
              ) : previousBalance < 0 ? (
                <>
                  <div className="positive">
                    Excess Balance: {toFixedStr(Math.abs(previousBalance), 3)}
                  </div>
                  <div>FWT: {toFixedStr(FWT, 3)}</div>
                  <div>Total FWT: {toFixedStr(TotalFWT, 3)}</div>
                </>
              ) : (
                <>
                  <div className="neutral">Balance: 0.000</div>
                  <div>FWT: {toFixedStr(FWT, 3)}</div>
                  <div>Total FWT: {toFixedStr(TotalFWT, 3)}</div>
                </>
              )}
            </Box>
          </Box>

          {/* Received Details */}
          <Box className="items-section" sx={{ marginTop: 2 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3>Received Details:</h3>
            </div>

            <Table
              className="table received-details-table"
              style={{
                marginTop: "10px",
                minWidth: "500px",
                width: "100%",
                tableLayout: "fixed",
              }}
            >
              <TableHead>
                <TableRow style={{ textAlign: "center" }}>
                  <TableCell className="th" style={{textAlign:'center'}}>S.No</TableCell>
                  <TableCell className="th" style={{textAlign:'center'}}>Date</TableCell>
                  <TableCell className="th" style={{textAlign:'center'}}>Type</TableCell>
                  {showGoldRateColumn &&(<TableCell className="th"style={{textAlign:'center'}}>Gold Rate</TableCell>)}
                  {showGivenGoldColumn &&(<TableCell className="th"style={{textAlign:'center'}}>Gold</TableCell>)}
                  {showTouchColumn &&(<TableCell className="th"style={{textAlign:'center'}}>Touch</TableCell>)}
                  <TableCell className="th"style={{textAlign:'center'}}>Purity WT</TableCell>
                  {showAmountColumn &&(<TableCell className="th"style={{textAlign:'center'}}>Amount</TableCell>)}
                  <TableCell className="th"style={{textAlign:'center'}}>Hallmark Bal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map((row, index) => (
                    console.log("Rendering row:", row.type),
                    <TableRow key={row.id || index}>
                      <TableCell className="td">{index + 1}</TableCell>
                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="date"
                          value={row.date}
                          disabled={row.isLocked}
                          inputProps={{ style: inputStyle }}
                        />
                      </TableCell>

                      <TableCell className="td">
                        <Select
                          size="small"
                          value={row.type}
                          displayEmpty
                          disabled={row.isLocked}
                        >
                          <MenuItem value="" disabled>
                            <em>Select Type</em>
                          </MenuItem>
                          <MenuItem value="Gold">Gold</MenuItem>
                          <MenuItem value="Cash">Cash</MenuItem>
                        </Select>
                      </TableCell>

                      {showGoldRateColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Cash") && (
                            <TextField
                              size="small"
                              type="text"
                              value={row.goldRate}
                              disabled={row.isLocked}
                              inputProps={{ style: inputStyle }}
                            />
                          )}
                        </TableCell>
                      )}

                      {showGivenGoldColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Gold") && (
                            <TextField
                              size="small"
                              type="text"
                              value={row.givenGold}
                              disabled={row.isLocked}
                              inputProps={{ style: inputStyle }}
                            />
                          )}
                        </TableCell>
                      )}

                      {showTouchColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Gold") && (
                            <TextField
                              size="small"
                              type="text"
                              value={row.touch}
                              disabled={row.isLocked}
                              inputProps={{ style: inputStyle }}
                              sx={{ width: "100%" }}
                            />
                          )}
                        </TableCell>
                      )}

                      <TableCell className="td">
                        <TextField
                          size="small"
                          value={row.purityWeight}
                          disabled
                          inputProps={{ style: inputStyle }}
                        />
                      </TableCell>

                      {showAmountColumn && (
                        <TableCell className="td">
                          {(row.type === "" || row.type === "Cash") && (
                            <TextField
                              size="small"
                              type="text"
                              // value={`₹${Number(row.amount ?? 0).toLocaleString("en-IN")}`}
                              value={row.amount}
                              disabled={row.isLocked}
                              inputProps={{ style: inputStyle }}
                              //  InputProps={{
                              //       startAdornment: <span style={{ marginRight: 1 }}>₹</span>,
                              //     }}
                            />
                          )}
                        </TableCell>
                      )}

                      <TableCell className="td">
                        <TextField
                          size="small"
                          type="text"
                          value={row.hallmark}
                          disabled={row.isLocked}                          
                          inputProps={{ style: inputStyle }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={visibleReceivedCols}
                      className="no-products-message"
                    >
                      No Received details added{" "}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "10px",
              padding: "8px 12px",
              backgroundColor: "#f9f9f9",
              border: "1px solid #ddd",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "bold",
              color: "#333",
            }}
          >
            <div>
              Bill Details Profit:{" "}
              <span style={{ color: "green" }}>{BillDetailsProfit}</span>
            </div>
            <div>
              Stone Profit:{" "}
              <span style={{ color: "green" }}>{StoneProfit}</span>
            </div>
            <div>
              Total Profit:{" "}
              <span style={{ color: "#0a4c9a" }}>{TotalBillProfit}</span>
            </div>
            {/* <div>Profit %: <span style={{ color: "#d9534f" }}>{billProfitPercentage}%</span></div> */}
          </div>

          <Box className="closing-balance">
            <div className="flex">
              <strong>
                Cash Balance: ₹
                {Number(cashBalance ?? 0).toLocaleString("en-IN", {
                  /*{ minimumFractionDigits: 3,// maximumFractionDigits: 3,}*/
                })}
              </strong>

              <strong>
                {pureBalance >= 0
                  ? `Pure Balance: ${toFixedStr(pureBalance, 3)}`
                  : `Excess Balance: ${toFixedStr(pureBalance, 3)}`}
              </strong>

              <strong>
                {" "}
                Hallmark Balance:{" "}
                {toFixedStr(hallmarkBalance + prevHallmark, 3)}{" "}
              </strong>
            </div>
          </Box>
          <Box style={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handlePrint()}
              className="save-button no-print"
            >
              Print{" "}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={()=> window.history.back()}
              className="save-button no-print"
            >
              Exit{" "}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BillView;
