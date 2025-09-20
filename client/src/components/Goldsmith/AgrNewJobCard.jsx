import {
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  IconButton,
  Divider,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { MdDeleteForever } from "react-icons/md";
import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "./AgrNewJobCard.css";
import React from "react";
import {
  goldRowValidation,
  itemValidation,
  receiveRowValidation,
  checkAvailabilityStock
} from "../jobcardvalidation/JobcardValidation";
import "../PrintJobCard/PrintJobCard"
import PrintJobCard from "../PrintJobCard/PrintJobCard";
import ReactDOMServer from 'react-dom/server';
function AgrNewJobCard({
  edit,
  handleCloseJobcard,
  name,
  description,
  setDescription,
  givenGold,
  setGivenGold,
  itemDelivery,
  setItemDelivery,
  receivedMetalReturns,
  setReceivedMetalReturns,
  dropDownItems,
  rawGoldStock,
  setRawGoldStock,
  openingBalance,
  jobCardLength,
  handleSaveJobCard,
  handleUpdateJobCard,
  handleSaveStock,
  open,
  jobCardId,
  lastJobCardId,
  lastIsFinish,
  isStock,
  isFinished
}) {
  const today = new Date().toLocaleDateString("en-IN");
  const [time, setTime] = useState(null);
  const [givenGoldErrors, setGivenGoldErrors] = useState([]);
  const [itemDeliveryErrors, setItemDeliveryErrors] = useState([]);
  const [deductionErrors, setDeductionErrors] = useState([]);
  const [receivedErrors, setReceivedErrors] = useState([]);
  const stoneOptions = ["Stone", "Enamel", "Beads"];
  const symbolOptions = ["Touch"];
  const [jobCardBalance, setJobCardBalance] = useState(0);

  const recalculateFinalPurity = (item) => {
    const totalItemDeductions = item.deduction.reduce(
      (sum, deduction) => sum + parseFloat(deduction.weight || 0),
      0
    );
    const itemNetWeightCalc =
      parseFloat(item.itemWeight || 0) - totalItemDeductions;
    const wastageValue = parseFloat(item.wastageValue || 0);

    if (item.wastageType === "Touch") {
      return (itemNetWeightCalc * wastageValue) / 100;
    } else if (item.wastageType === "%") {
      return itemNetWeightCalc + (itemNetWeightCalc * wastageValue) / 100;
    } else if (item.wastageType === "+") {
      return itemNetWeightCalc + wastageValue;
    }
    return 0;
  };
  const format = (
    val // its used for set three digit after point value
  ) => (isNaN(parseFloat(val)) ? "" : parseFloat(val).toFixed(3));

  const calculatePurity = (w, t) =>
    !isNaN(w) && !isNaN(t)
      ? ((parseFloat(w) * parseFloat(t)) / 100).toFixed(3)
      : "";

const handleGoldRowChange = (i, field, val) => {
  const copy = [...givenGold];

  // STEP 1: get old values BEFORE overwrite
  const oldTouch = copy[i].touch;
  const oldWeight = copy[i].weight;

  // STEP 2: restore old stock first
   let updateTouchStock = rawGoldStock.map(r => ({ ...r }));
    updateTouchStock.forEach(touchItem => {
    if (parseFloat(oldTouch) === touchItem.touch) {
      if(oldWeight>=0) touchItem.remainingWt = parseFloat(touchItem.remainingWt) + parseFloat(oldWeight || 0);
     
    }
  });

  // STEP 3: overwrite new value
  copy[i][field] = val;

  // STEP 4: deduct new value from stock
  const newTouch = copy[i].touch;
  const newWeight = copy[i].weight;

  updateTouchStock.forEach(touchItem => {
    if (parseFloat(newTouch) === touchItem.touch) {
      if(newWeight>=0) touchItem.remainingWt = parseFloat(touchItem.remainingWt) - parseFloat(newWeight || 0);
    }
  });

  // STEP 5: recalc purity
  copy[i].purity = calculatePurity(
    parseFloat(copy[i].weight),
    parseFloat(copy[i].touch)
  );

  // STEP 6: set state
  setGivenGold(copy);
  setRawGoldStock(updateTouchStock);
  goldRowValidation(copy, setGivenGoldErrors);
};


  
  const totalInputPurityGiven = givenGold.reduce(
    (sum, row) => sum + parseFloat(row.purity || 0),
    0
  );
  const totalDeduction = (i, copy) => {
    return copy[i].deduction.reduce(
      (acc, val) => acc + Number(val.weight || 0), // convert to number
      0
    );
  };

  const handleChangeDeliver = (val, field, i) => {
    const copy = [...itemDelivery];
    copy[i][field] = val;

    if (field === "itemWeight") {
      copy[i]["netWeight"] =
        copy[i]["itemWeight"] - Number(totalDeduction(i, copy));
    }
    if (field === "touch" || field === "itemWeight" || field==="wastageValue") {
      copy[i].wastagePure = (((copy[i].netWeight* copy[i].wastageValue)/100)-(copy[i].netWeight* copy[i].touch/100)).toFixed(3)
    }
    copy[i].finalPurity =  (copy[i].netWeight * copy[i].wastageValue) / 100
    setItemDelivery(copy);
    itemValidation(itemDelivery, setItemDeliveryErrors);
  };
  const handleReceivedRowChange = (i, field, val) => {
    const copy = [...receivedMetalReturns];
    copy[i][field] = val;
    copy[i].purity = calculatePurity(
      parseFloat(copy[i].weight),
      parseFloat(copy[i].touch)
    );
    setReceivedMetalReturns(copy);
    receiveRowValidation(receivedMetalReturns, setReceivedErrors);
  };

  const handleDeductionChange = (itemIndex, deductionIndex, field, val) => {
    const updated = [...itemDelivery];
    updated[itemIndex].deduction[deductionIndex][field] = val;
    if (field === "weight") {
        updated[itemIndex]["netWeight"] =updated[itemIndex]["itemWeight"] -Number(totalDeduction(itemIndex, updated));
        updated[itemIndex]["wastagePure"] = (((updated[itemIndex]["netWeight"]* updated[itemIndex].wastageValue)/100)-(updated[itemIndex]["netWeight"]* updated[itemIndex]["touch"]/100)).toFixed(3)
    }
    updated[itemIndex]["netWeight"] =updated[itemIndex]["itemWeight"] -Number(totalDeduction(itemIndex, updated));
    updated[itemIndex].finalPurity = (updated[itemIndex]["netWeight"]*updated[itemIndex]["wastageValue"])/100
    setItemDelivery(updated);
  };

  const handlededuction = (index) => {
    let newDeduction = { type: "", weight: "" };

    let updated = [...itemDelivery];
    updated[index].deduction.push(newDeduction);

    setItemDelivery(updated);
  };

  const handleRemovedelivery = (i) => {
    const isTrue = window.confirm("Are You Want To Remove This Row");
    if (isTrue) {
      const filterItem = itemDelivery.filter((_, index) => i !== index);

      setItemDelivery(filterItem);
    }
  };
  const handleRemoveDeduction = (itemIndex, stoneIndex) => {
    const isTrue = window.confirm("Are you sure you want to remove this row?");
    if (!isTrue) return;
    const copy = [...itemDelivery];
    copy[itemIndex].deduction.splice(stoneIndex, 1);
    copy[itemIndex]["netWeight"] =
      copy[itemIndex]["ItemWeight"] - Number(totalDeduction(itemIndex, copy));
    setItemDelivery(copy);
  };

  const handleRemoveReceive = (i) => {
    let isTrue = window.confirm("Are Want To Remove Receive Entry");
    if (isTrue) {
      let copy = [...receivedMetalReturns];
      copy = copy.filter((_, index) => index !== i);
      setReceivedMetalReturns(copy);
    }
  };

  const handleRemoveGoldRow = (i) => {
    const isTrue = window.confirm("Are You Want To Remove This Row");
    if (isTrue) {
       let touchValue=givenGold[i]['touch'] //  when deleting item we need to reset the gold value
       let weight=givenGold[i]['weight']
       
       const updateTouchStock = rawGoldStock.map(r => ({ ...r })); 
       updateTouchStock.forEach(touchItem => {
       if(parseFloat(touchValue) === touchItem.touch){
         touchItem.remainingWt = parseFloat(touchItem.remainingWt)+parseFloat(weight)
       } });
       console.log('updateStock in delete',updateTouchStock)
       setRawGoldStock(updateTouchStock)
      const filtergold = givenGold.filter((_, index) => i !== index);
      setGivenGold(filtergold);
    }
  };

  const totalGivenToGoldsmith = openingBalance + totalInputPurityGiven;
  const totalFinishedPurity = itemDelivery.reduce(
    (sum, item) => sum + parseFloat(item.finalPurity || 0),
    0
  );
  const totalReceivedPurity = receivedMetalReturns.reduce(
    (sum, row) => sum + parseFloat(row.purity || 0),
    0
  );

  const handleStock=()=>{  

     let isTrue=window.confirm("Do you want to move these items to stock? Once the items are moved, the job card will be closed.")  
    if(isTrue){
      handleSaveStock()
    }
  }
  const handleSave = (print = "noprint") => {
  const goldIsTrue = goldRowValidation(givenGold, setGivenGoldErrors);
  const existStock = checkAvailabilityStock(rawGoldStock);

  if (edit) {
    const itemIsTrue = itemValidation(itemDelivery, setItemDeliveryErrors);
    const receivedIsTrue = receiveRowValidation(receivedMetalReturns, setReceivedErrors);

    if (!goldIsTrue || !itemIsTrue || !receivedIsTrue) {
      return toast.warn("Give Valid Information on Job Card");
    }

    if (existStock.stock !== "ok") {
      return toast.warn(`No Gold Stock in Touch ${existStock.touch}`);
    }
    console.log('isFinished',isFinished)
    if (print === "print") {
      handlePrint();
      if (isFinished === "false") {
        handleUpdateJobCard(
          totalInputPurityGiven,
          totalFinishedPurity,
          totalReceivedPurity,
          jobCardBalance,
          openingBalance
        );
      }
    } else {
      handleUpdateJobCard(
        totalInputPurityGiven,
        totalFinishedPurity,
        totalReceivedPurity,
        jobCardBalance,
        openingBalance
      );
    }
  } else {
    //  this block will only run when adding a new job card
    if (!goldIsTrue) {
      return toast.warn("Give Valid Information on Job Card");
    }

    if (existStock.stock !== "ok") {
      return toast.warn(`No Gold Stock Touch in ${existStock.touch}`);
    }

    if (print === "print") {
      handlePrint();
      handleSaveJobCard(totalInputPurityGiven, jobCardBalance, openingBalance);
    } else {
      handleSaveJobCard(totalInputPurityGiven, jobCardBalance, openingBalance);
    }
  }
};

  const handlePrint=()=>{
     const printContent = (
    <PrintJobCard
      jobId={edit ? jobCardId : jobCardLength}
      name={name}
      date={today}
      time={time}
      description={description}
      givenGold={givenGold}
      totalGivenPure={totalInputPurityGiven} 
      openingBalance={openingBalance}
      totalGivenToGoldsmith={totalGivenToGoldsmith}
      deliveries={itemDelivery}
      totalDelivery={totalFinishedPurity}
      received={receivedMetalReturns}
      totalReceive={totalReceivedPurity}
      jobCardBalance={jobCardBalance}

    />
  );

  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>JobCard Print</title>
       
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
   const printWindow = window.open('', '_blank', 'width=1000,height=800');
   printWindow.document.write(printHtml);
   printWindow.document.close();

  }

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);
  const safeParse = (val) => (isNaN(parseFloat(val)) ? 0 : parseFloat(val));
  
  useEffect(() => {
    const balance =
      safeParse(openingBalance) >= 0
        ? safeParse(totalInputPurityGiven) + safeParse(openingBalance)
        : safeParse(openingBalance) + safeParse(totalInputPurityGiven); // we need to add openbalance and givenGold

    let difference = balance - safeParse(totalFinishedPurity); // total item delivery

    if (receivedMetalReturns.length >= 1) {
      const totalReceived = totalReceivedPurity;

      difference -= totalReceived;
    }

    setJobCardBalance(format(difference));
  }, [givenGold, itemDelivery, receivedMetalReturns]);
  return (
    <>
      <Dialog
        open={open}
        onClose={handleCloseJobcard}
        fullWidth
        maxWidth="md"
        PaperProps={{
          className: "jobcard-dialog-paper",
        }}
      >
        <DialogTitle className="dialogTitle" id="customized-dialog-title">
          <p>{edit ? "Edit JobCard" : "Add New JobCard"}</p>
          <IconButton
            aria-label="close"
            onClick={handleCloseJobcard}
            sx={(theme) => ({
              position: "absolute",
              right: 8,
              top: 8,
              color: theme.palette.grey[500],
            })}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box className="jobCardheader">
            <Typography>ID:{edit ? jobCardId : jobCardLength}</Typography>
            <Typography>Name:{name}</Typography>
            <Typography>Date:{today}</Typography>
            <Typography>Time:{time}</Typography>
          </Box>
          <div className="jobCardFlex">

            <div className="givenGroup">

              <div className="description section">
                <label htmlFor="description" className="label">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                  }}
                  className="textarea"
                />
              </div>
              {/* Given Gold */}
              <div className="section">
                <h4 className="section-title">Given Details</h4>
                <div className="givenGold">
                  {givenGold.map((row, i) => (
                    <div key={row.id || `gold-${i}`} className="row">
                      <strong>{i + 1})</strong>
                      <div>
                        <input
                          disabled={row.id?true:false}
                          type="number"
                          placeholder="Weight"
                          value={row.weight}
                          onChange={(e) =>
                            handleGoldRowChange(i, "weight", e.target.value)
                          }
                          className="input"
                          onWheel={(e) => e.target.blur()}
                        />
                        <br></br>
                        {givenGoldErrors[i]?.weight && (
                          <span className="error">
                            {givenGoldErrors[i]?.weight}
                          </span>
                        )}
                      </div>
                      <span className="operator">x</span>

                      <div>
                        <select
                          disabled={row.id?true:false}
                          value={row.touch}
                          onChange={(e) =>
                            handleGoldRowChange(i, "touch", e.target.value)
                          }
                          className="select-small"
                          // disabled={isLoading || !isItemDeliveryEnabled}
                        >
                          <option value="">Select</option>
                          {dropDownItems.touchList.map((option) => (
                            <option key={option.id} value={option.touch}>
                              {option.touch}
                            </option>
                          ))}
                        </select>
                        <br></br>
                        {givenGoldErrors[i]?.touch && (
                          <span className="error">
                            {givenGoldErrors[i]?.touch}
                          </span>
                        )}
                      </div>

                      <span className="operator">=</span>
                      <input
                        type="text"
                        readOnly
                        placeholder="Purity"
                        value={format(row.purity)}
                        className="input-read-only"
                      />
                      {!row.id && (
                        <MdDeleteForever
                          className="delIcon"
                          size={25}
                          onClick={() => handleRemoveGoldRow(i)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setGivenGold([
                      ...givenGold,
                      { weight: "", touch: "", purity: "" },
                    ])
                  }
                  className="circle-button"
                >
                  +
                </button>
                <div className="total-purity-container">
                  <span className="total-purity-label">Total Purity:</span>
                  <span className="total-purity-value">
                    {format(totalInputPurityGiven)}
                  </span>
                </div>
              </div>
              {/* Balance */}

               <div className="section">
                <h3 className="section-title">Balance</h3>
                <div className="balance-block">
                  <div className="balance-display-row">
                    <span className="balance-label">
                      {openingBalance >= 0
                        ? "Opening Balance"
                        : "ExceesBalance"}
                    </span>
                    <span className="balance-value">
                      {format(openingBalance)}
                    </span>
                  </div>
                  <div className="balance-display-row">
                    <span className="balance-label">Total Purity:</span>
                    <span className="balance-value">
                      {format(totalInputPurityGiven)}
                    </span>
                  </div>
                  <div>----------</div>
                  <div className="balance-display-row">
                    <span className="balance-label">Total Balance:</span>
                    <span className="balance-value">
                      {format(totalGivenToGoldsmith)}
                    </span>
                  </div>
                </div>
              </div>
              
            </div>


            <div className="touchGroup">
              <strong>Touch Information</strong>
               <table className="jobCardTouchTable">
                <thead>
                  <tr className="jobCardTouchTableRow">
                    <th>S.No</th>
                    <th>Touch</th>
                    <th>Weight</th>
                    <th>RemainWeight</th>
                  </tr>
                </thead>
                <tbody>
                  
                   {rawGoldStock.map((rawStock,index)=>(
                    <tr key={index+1}className="jobCardTouchTableBody">
                      <td>{index+1}</td>
                      <td>{rawStock.touch}</td>
                      <td>{rawStock.weight}</td>
                      <td style={{backgroundColor:rawStock.remainingWt<0?"red":""}}>{rawStock.remainingWt}</td>
                    </tr>
                   ))}
                </tbody>
               </table>
                
            </div>
          </div>

          {/* Item Delivery Section */}
          <div className="section" style={{ opacity: edit ? 1 : 0.5 }}>
            <div className="itemTitleSection">
            <div>
              <h4 className="section-title">Item Delivery</h4>
            </div>
             {edit && 
             <div >
              <button className="itemTitlebtn" onClick={handleStock} disabled={isStock?true:false}>Move To Stock</button>
            </div>}
            </div>
            <TableContainer component={Paper} className="jobCardContainer">
              <Table
                size="small"
                sx={{
                  "& td, & th": {
                    padding: "4px 8px",
                    fontSize: "1rem",
                    textAlign: "center",
                  },
                }}
                aria-label="item table"
              >
                <TableHead className="jobcardhead">
                  <TableRow>
                    <TableCell rowSpan={2} className="tableCell">
                      S.No
                    </TableCell>
                    <TableCell rowSpan={2} className="tableCell">
                      Item Name
                    </TableCell>
                    <TableCell rowSpan={2} className="tableCell">
                      Item Weight
                    </TableCell>
                    <TableCell rowSpan={2} className="tableCell">
                      Count
                    </TableCell>
                    <TableCell rowSpan={2} className="tableCell">
                      Touch
                    </TableCell>
                    <TableCell rowSpan={2} className="tableCell">
                      Add
                    </TableCell>
                    <TableCell colSpan={3} className="tableCell">
                      Deduction
                    </TableCell>
                    <TableCell rowSpan={2} className="tableCell">
                      Net Weight
                    </TableCell>
                    {/* <TableCell rowSpan={2} className="tableCell">
                      Wastage Type
                    </TableCell> */}
                    <TableCell rowSpan={2} className="tableCell">
                      Wastage Value
                    </TableCell>
                    <TableCell rowSpan={2} className="tableCell">
                      Wastage Pure
                    </TableCell>
                    <TableCell rowSpan={2} className="tableCell">
                      Final Purity
                    </TableCell>
                    <TableCell rowSpan={2} className="tableCell">
                      Del
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>stone</TableCell>
                    <TableCell>weight</TableCell>
                    <TableCell>Del</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {itemDelivery.map((item, index) => (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <select
                            disabled={edit?false:true}
                            value={item?.itemName}
                            onChange={(e) =>
                              handleChangeDeliver(
                                e.target.value,
                                "itemName",
                                index
                              )
                            }
                            className="select-small"
                            // disabled={isLoading || !isItemDeliveryEnabled}
                          >
                            <option value="">Select</option>
                            {dropDownItems.masterItems.map((option) => (
                              <option key={option.id} value={option?.itemName}>
                                {option?.itemName}
                              </option>
                            ))}
                          </select>
                          <br></br>
                          {itemDeliveryErrors[index]?.itemName && (
                            <span className="error">
                              {itemDeliveryErrors[index]?.itemName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <input
                            value={item?.itemWeight ?? ""}
                            className="input itemInput"
                            type="number"
                            onChange={(e) =>
                              handleChangeDeliver(
                                e.target.value,
                                "itemWeight",
                                index
                              )
                            }
                            onWheel={(e) => e.target.blur()}
                          />
                          <br></br>
                          {itemDeliveryErrors[index]?.itemWeight && (
                            <span className="error">
                              {itemDeliveryErrors[index]?.itemWeight}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <input
                            value={item?.count ?? ""}
                            className="input itemInput"
                            type="number"
                            onChange={(e) =>
                              handleChangeDeliver(
                                e.target.value,
                                "count",
                                index
                              )
                            }
                            onWheel={(e) => e.target.blur()}
                          />
                          <br></br>
                          {itemDeliveryErrors[index]?.count && (
                            <span className="error">
                              {itemDeliveryErrors[index]?.count}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <select
                            disabled={edit?false:true}
                            value={item?.touch}
                            onChange={(e) =>
                              handleChangeDeliver(
                                e.target.value,
                                "touch",
                                index
                              )
                            }
                            className="select-small"
                            // disabled={isLoading || !isItemDeliveryEnabled}
                          >
                            <option value="">Select</option>
                            {dropDownItems.touchList.map((option) => (
                              <option key={option.id} value={option.touch}>
                                {option.touch}
                              </option>
                            ))}
                          </select>
                          <br></br>
                          {itemDeliveryErrors[index]?.touch && (
                            <span className="error">
                              {itemDeliveryErrors[index]?.touch}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <Button
                            disabled={edit ? false : true}
                            onClick={() => handlededuction(index)}
                            style={{ fontSize: "25px" }}
                          >
                            +
                          </Button>
                        </TableCell>

                        {/* First deduction row */}
                        {item?.deduction?.length >= 1 ? (
                          <>
                            <TableCell className="tableCell">
                              <select
                                disabled={edit?false:true}
                                value={
                                  item?.deduction.length >= 1
                                    ? item?.deduction[0].type
                                    : ""
                                }
                                onChange={(e) =>
                                  handleDeductionChange(
                                    index,
                                    0,
                                    "type",
                                    e.target.value
                                  )
                                }
                                className="select-small"
                                // disabled={isLoading || !isItemDeliveryEnabled}
                              >
                                <option value="">Select</option>
                                {stoneOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <br></br>
                              {deductionErrors[0]?.type && (
                                <span className="error">
                                  {deductionErrors[0]?.type}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="tableCell">
                              <input
                                value={
                                  item?.deduction.length >= 1
                                    ? item.deduction[0].weight
                                    : ""
                                }
                                className="input"
                                type="number"
                                onChange={(e) =>
                                  handleDeductionChange(
                                    index,
                                    0,
                                    "weight",
                                    e.target.value
                                  )
                                }
                                onWheel={(e) => e.target.blur()}
                              />
                              <br></br>
                              {deductionErrors[0]?.weight && (
                                <span className="error">
                                  {deductionErrors[0]?.weight}
                                </span>
                              )}
                            </TableCell>
                            {item.deduction[0].id ? (
                              <TableCell></TableCell>
                            ) : (
                              <TableCell className="tableCell">
                                <button
                                  type="button"
                                  disabled={!edit}
                                  onClick={() =>
                                    handleRemoveDeduction(index, 0)
                                  } // stone remove
                                  className="icon-button"
                                >
                                  <MdDeleteForever
                                    size={25}
                                    className="delIcon"
                                  />
                                </button>
                              </TableCell>
                            )}
                          </>
                        ) : (
                          <TableCell colSpan={3} rowSpan={1}>
                            No stone
                          </TableCell>
                        )}

                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <input
                            value={item?.netWeight ?? ""}
                            className="input itemInput"
                            readOnly
                            onWheel={(e) => e.target.blur()}
                          />
                        </TableCell>
                        {/* <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <select
                            value={item?.wastageType}
                            onChange={(e) =>
                              handleChangeDeliver(
                                e.target.value,
                                "wastageType",
                                index
                              )
                            }
                            className="select-small"
                            // disabled={isLoading || !isItemDeliveryEnabled}
                          >
                            <option value="">Select</option>
                            {symbolOptions.map((symbol) => (
                              <option key={symbol} value={symbol}>
                                {symbol}
                              </option>
                            ))}
                          </select>
                          <br></br>
                          {itemDeliveryErrors[index]?.wastageType && (
                            <span className="error">
                              {itemDeliveryErrors[index]?.wastageType}
                            </span>
                          )}
                        </TableCell> */}
                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <select
                            disabled={edit?false:true}
                            value={item?.wastageValue}
                            onChange={(e) =>
                              handleChangeDeliver(
                                e.target.value,
                                "wastageValue",
                                index
                              )
                            }
                            className="select-small"
                           
                          >
                            <option value="">Select</option>
                            {dropDownItems.masterWastage.map((option) => (
                              <option key={option.id} value={option.wastage}>
                                {option.wastage}
                              </option>
                            ))}
                          </select>
                          
                          <br></br>
                          {itemDeliveryErrors[index]?.wastageValue && (
                            <span className="error">
                              {itemDeliveryErrors[index]?.wastageValue}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <input
                            value={item?.wastagePure ?? ""}
                            className="input itemInput"
                            type="number"
                            onWheel={(e) => e.target.blur()}
                          />
                        </TableCell>
                        <TableCell
                          rowSpan={item?.deduction.length || 1}
                          className="tableCell"
                        >
                          <input
                            value={item.finalPurity ?? ""}
                            className="input itemInput"
                            readOnly
                            onChange={(e) =>
                              handleChangeDeliver(
                                e.target.value,
                                "finalPurity",
                                index
                              )
                            }
                            onWheel={(e) => e.target.blur()}
                          />
                        </TableCell>
                        {item.id ? (
                          <TableCell></TableCell>
                        ) : (
                          <TableCell
                            rowSpan={item?.deduction.length || 1}
                            className="tableCell"
                          >
                            <button
                              disabled={!edit}
                              onClick={() => handleRemovedelivery(index)}
                              className="icon-button"
                            >
                              <MdDeleteForever size={25} className="delIcon" />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Remaining stone rows */}
                      {item.deduction.map(
                        (s, i) =>
                          i !== 0 && (
                            <TableRow key={i}>
                              <TableCell className="tableCell">
                                <select
                                  disabled={edit?false:true}
                                  value={s.type}
                                  onChange={(e) =>
                                    handleDeductionChange(
                                      index,
                                      i,
                                      "type",
                                      e.target.value
                                    )
                                  }
                                  className="select-small"
                                  // disabled={isLoading || !isItemDeliveryEnabled}
                                >
                                  <option value="">Select</option>
                                  {stoneOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                <br></br>
                                {deductionErrors[i]?.type && (
                                  <span className="error">
                                    {deductionErrors[i]?.type}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="tableCell">
                                <input
                                  value={s.weight ?? ""}
                                  className="input"
                                  type="number"
                                  onChange={(e) =>
                                    handleDeductionChange(
                                      index,
                                      i,
                                      "weight",
                                      e.target.value
                                    )
                                  }
                                  onWheel={(e) => e.target.blur()}
                                />
                                <br></br>
                                {deductionErrors[i]?.weight && (
                                  <span className="error">
                                    {deductionErrors[i]?.weight}
                                  </span>
                                )}
                              </TableCell>
                              {s.id ? (
                                <TableCell></TableCell>
                              ) : (
                                <TableCell className="tableCell">
                                  <MdDeleteForever
                                    className="delIcon"
                                    size={25}
                                    onClick={() =>
                                      handleRemoveDeduction(index, i)
                                    }
                                  />
                                </TableCell>
                              )}
                            </TableRow>
                          )
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <button
              disabled={!edit}
              onClick={() =>
                setItemDelivery([
                  ...itemDelivery,
                  {
                    itemName: "",
                    itemWeight: "",
                    touch: "",
                    deduction: [],
                    netWeight: "",
                    wastageTyp: "",
                    wastageValue: "",
                    finalPurity: "",
                  },
                ])
              }
              className="circle-button"
            >
              +
            </button>
            <div className="totals-section">
              <div className="total-row">
                <span className="total-purity-label">Total Item Purity:</span>
                <span className="total-purity-value">
                  {format(totalFinishedPurity)}
                </span>
              </div>
            </div>
          </div>
          {/* Received Section */}
          <div className="section" style={{ opacity: edit ? 1 : 0.5 }}>
            <h3 className="section-title">Received Section</h3>
            <div className="received-section-container">
              {receivedMetalReturns.map((row, i) => (
                <div
                  key={row.id || `received-${i}`}
                  className="received-section-row"
                >
                  <strong>{i + 1})</strong>
                  <div>
                    <input
                      type="number"
                      placeholder="Weight"
                      value={row.weight}
                      onChange={(e) =>
                        handleReceivedRowChange(i, "weight", e.target.value)
                      }
                      className="input-small"
                      // disabled={isLoading || !isReceivedSectionEnabled}
                      onWheel={(e) => e.target.blur()}
                    />
                    <br></br>
                    {receivedErrors[i]?.weight && (
                      <span className="error">{receivedErrors[i]?.weight}</span>
                    )}
                  </div>
                  <span className="operator">x</span>
                  <div>
                    <select
                      disabled={edit?false:true}
                      value={row.touch}
                      onChange={(e) =>
                        handleReceivedRowChange(i, "touch", e.target.value)
                      }
                      className="input-small"
                      // disabled={isLoading || !isItemDeliveryEnabled}
                    >
                      <option value="">Select</option>
                      {dropDownItems.touchList.map((option) => (
                        <option key={option.id} value={option.touch}>
                          {option.touch}
                        </option>
                      ))}
                    </select>
                    {receivedErrors[i]?.touch && (
                      <span className="error">{receivedErrors[i]?.touch}</span>
                    )}
                  </div>
                  <span className="operator">=</span>
                  <input
                    type="text"
                    readOnly
                    placeholder="Purity"
                    value={format(row.purity)}
                    className="input-read-only input-small"
                  />
                  <button
                    type="button"
                    disabled={edit ? (row.id ? true : false) : true}
                    onClick={() => handleRemoveReceive(i)}
                    className="icon-button"
                  >
                    <MdDeleteForever size={25} className="delIcon" />
                  </button>
                </div>
              ))}
            </div>
            <button
              disabled={
                edit? lastJobCardId===jobCardId ?false:true:true
              }
              onClick={() =>
                setReceivedMetalReturns([
                  ...receivedMetalReturns,
                  { weight: "", touch: "", purity: "" },
                ])
              }
              className="circle-button"
              // disabled={isLoading || !isReceivedSectionEnabled}
            >
              +
            </button>
            <div className="totals-section">
              <div className="total-row">
                <span className="total-purity-label">
                  Total Received Purity:
                </span>
                <span className="total-purity-value">
                  {format(totalReceivedPurity)}
                </span>
              </div>
            </div>
          </div>
          <div className="section" style={{ textAlign: "center" }}>
            {jobCardBalance < 0 ? (
              <p className="balance-text-owner">
                Owner should give balance:
                <span className="balance-amount">{format(jobCardBalance)}</span>
              </p>
            ) : jobCardBalance > 0 ? (
              <p className="balance-text-goldsmith ">
                Goldsmith should give balance:
                <span className="balance-amount">{format(jobCardBalance)}</span>
              </p>
            ) : (
              <p className="balanceNill">
                balance Nill:
                <span className="balance-amount">
                  {format(jobCardBalance)}
                </span>{" "}
              </p>
            )}
          </div>
        <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
        </DialogContent>
        <DialogActions className="actionButton"> 
          <Button  className="jobCardSaveBtn"autoFocus onClick={()=>{handleSave()}} disabled={edit ? isFinished==="true" ||isStock?true:false:false}>
            {edit ? "Update" : "Save"}
          </Button>
          <Button autoFocus onClick={()=>{handleSave("print")}} className="jobCardPrintBtn">
            Print
          </Button>
        </DialogActions>
      </Dialog>
       
    </>
  );
}
export default AgrNewJobCard;
