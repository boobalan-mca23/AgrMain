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
import "./AgrNewJobCard.css";
import React from "react";
import { Opacity } from "@mui/icons-material";
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
  masterItems,
  touchList,
  openingBalance,
  jobCardLength,
  handleSaveJobCard,
  handleUpdateJobCard,
  jobCardId,
}) {
  const today = new Date().toLocaleDateString("en-IN");
  const [time, setTime] = useState(null);
  const stoneOptions = ["Stone", "Enamel", "Beads", "Others"];
  const symbolOptions = ["Touch", "%", "+"];
  const [jobCardBalance, setJobCardBalance] = useState(0);

  const recalculateFinalPurity = (item) => {
    const totalItemDeductions = item.deduction.reduce(
      (sum, deduction) => sum + parseFloat(deduction.weight || 0),
      0
    );
    const itemNetWeightCalc =
      parseFloat(item.itemWeight || 0) - totalItemDeductions;
    const wastageValue = parseFloat(item.wastageValue || 0);

    if (item.wastageType === "touch") {
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
    copy[i][field] = val;
    copy[i].purity = calculatePurity(
      parseFloat(copy[i].weight),
      parseFloat(copy[i].touch)
    );
    setGivenGold(copy);
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
    copy[i].finalPurity = recalculateFinalPurity(copy[i]);
    setItemDelivery(copy);
  };
  const handleReceivedRowChange = (i, field, val) => {
    const copy = [...receivedMetalReturns];
    copy[i][field] = val;
    copy[i].purity = calculatePurity(
      parseFloat(copy[i].weight),
      parseFloat(copy[i].touch)
    );
    setReceivedMetalReturns(copy);
  };

  const handleDeductionChange = (itemIndex, deductionIndex, field, val) => {
    console.log("dedIndex", deductionIndex);
    const updated = [...itemDelivery];
    updated[itemIndex].deduction[deductionIndex][field] = val;
    if (field === "weight") {
      console.log("totalDed", totalDeduction(itemIndex, updated));
      updated[itemIndex]["netWeight"] =
        updated[itemIndex]["itemWeight"] -
        Number(totalDeduction(itemIndex, updated));
    }
    updated[itemIndex].finalPurity = recalculateFinalPurity(updated[itemIndex]);
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
    console.log("i", i);
    let copy = [...receivedMetalReturns];
    copy = copy.filter((item, index) => index !== i);
    setReceivedMetalReturns(copy);
  };

  const handleRemoveGoldRow = (i) => {
    const isTrue = window.confirm("Are You Want To Remove This Row");
    if (isTrue) {
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

  const handleSave = () => {
    if (edit) {
      handleUpdateJobCard(
        totalInputPurityGiven,
        totalFinishedPurity,
        totalReceivedPurity,
        jobCardBalance,
        openingBalance
      );
    } else {
      handleSaveJobCard(totalInputPurityGiven, jobCardBalance, openingBalance);
    }
  };

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
        <Box className="section">
          <h4 className="section-title">Given Details</h4>
          <div className="givenGold">
            {givenGold.map((row, i) => (
              <div key={row.id || `gold-${i}`} className="row">
                <strong>{i + 1})</strong>
                <input
                  type="number"
                  placeholder="Weight"
                  value={row.weight}
                  onChange={(e) =>
                    handleGoldRowChange(i, "weight", e.target.value)
                  }
                  className="input"
                  onWheel={(e) => e.target.blur()}
                />
                <span className="operator">x</span>

                <select
                  value={row.touch}
                  onChange={(e) =>
                    handleGoldRowChange(i, "touch", e.target.value)
                  }
                  className="select-small"
                  // disabled={isLoading || !isItemDeliveryEnabled}
                >
                  {touchList.map((option) => (
                    <option key={option.id} value={option.touch}>
                      {option.touch}
                    </option>
                  ))}
                </select>

                <span className="operator">=</span>
                <input
                  type="text"
                  readOnly
                  placeholder="Purity"
                  value={format(row.purity)}
                  className="input-read-only"
                />
                <MdDeleteForever
                  className="delIcon"
                  size={25}
                  onClick={() => handleRemoveGoldRow(i)}
                />
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
        </Box>
        {/* Balance */}
        <Box className="section">
          <h3 className="section-title">Balance</h3>
          <div className="balance-block">
            <div className="balance-display-row">
              <span className="balance-label">
                {openingBalance >= 0 ? "Opening Balance" : "ExceesBalance"}
              </span>
              <span className="balance-value">{format(openingBalance)}</span>
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
        </Box>
        {/* Item Delivery Section */}
        <Box className="section" style={{ opacity: edit ? 1 : 0.5 }}>
          <h4 className="section-title">Item Delivery</h4>
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
                  <TableCell rowSpan={2} className="tableCell">
                    Wastage Type
                  </TableCell>
                  <TableCell rowSpan={2} className="tableCell">
                    Wastage Value
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
                          {masterItems.map((option) => (
                            <option key={option.id} value={option?.itemName}>
                              {option?.itemName}
                            </option>
                          ))}
                        </select>
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
                      </TableCell>
                      <TableCell
                        rowSpan={item?.deduction.length || 1}
                        className="tableCell"
                      >
                        <select
                          value={item?.touch}
                          onChange={(e) =>
                            handleChangeDeliver(e.target.value, "touch", index)
                          }
                          className="select-small"
                          // disabled={isLoading || !isItemDeliveryEnabled}
                        >
                          {touchList.map((option) => (
                            <option key={option.id} value={option.touch}>
                              {option.touch}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell
                        rowSpan={item?.deduction.length || 1}
                        className="tableCell"
                      >
                        <Button
                          disabled={edit ? false : true}
                          onClick={() => handlededuction(index)}
                        >
                          +
                        </Button>
                      </TableCell>

                      {/* First deduction row */}
                      {item.deduction.length >= 1 ? (
                        <>
                          <TableCell className="tableCell">
                            <select
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
                              {stoneOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
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
                          </TableCell>
                          <TableCell className="tableCell">
                            <button
                              type="button"
                              disabled={!edit}
                              onClick={() => handleRemoveDeduction(index, 0)}
                              className="icon-button"
                            >
                              <MdDeleteForever size={25} className="delIcon" />
                            </button>
                          </TableCell>
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
                      <TableCell
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
                          {symbolOptions.map((symbol) => (
                            <option key={symbol} value={symbol}>
                              {symbol}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell
                        rowSpan={item?.deduction.length || 1}
                        className="tableCell"
                      >
                        <input
                          value={item?.wastageValue ?? ""}
                          className="input itemInput"
                          type="number"
                          onChange={(e) =>
                            handleChangeDeliver(
                              e.target.value,
                              "wastageValue",
                              index
                            )
                          }
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
                    </TableRow>

                    {/* Remaining stone rows */}
                    {item.deduction.map(
                      (s, i) =>
                        i !== 0 && (
                          <TableRow key={i}>
                            <TableCell className="tableCell">
                              <select
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
                                {stoneOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
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
                            </TableCell>
                            <TableCell className="tableCell">
                              <MdDeleteForever
                                className="delIcon"
                                size={25}
                                onClick={() => handleRemoveDeduction(index, i)}
                              />
                            </TableCell>
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
                  deduction: [{ type: "", weight: "" }],
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
        </Box>
        {/* Received Section */}
        <Box className="section" style={{ opacity: edit ? 1 : 0.5 }}>
          <h3 className="section-title">Received Section</h3>
          <div className="received-section-container">
            {receivedMetalReturns.map((row, i) => (
              <div
                key={row.id || `received-${i}`}
                className="received-section-row"
              >
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
                <span className="operator">x</span>
                <input
                  type="number"
                  placeholder="Touch"
                  value={row.touch}
                  onChange={(e) =>
                    handleReceivedRowChange(i, "touch", e.target.value)
                  }
                  className="input-small"
                  // disabled={isLoading || !isReceivedSectionEnabled}
                  onWheel={(e) => e.target.blur()}
                />
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
                  disabled={!edit}
                  onClick={() => handleRemoveReceive(i)}
                  className="icon-button"
                >
                  <MdDeleteForever size={25} className="delIcon" />
                </button>
              </div>
            ))}
            <button
              disabled={!edit}
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
          </div>
          <div className="totals-section">
            <div className="total-row">
              <span className="total-purity-label">Total Received Purity:</span>
              <span className="total-purity-value">
                {format(totalReceivedPurity)}
              </span>
            </div>
          </div>
        </Box>
        <Box className="section" style={{ textAlign: "center" }}>
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
        </Box>
      </DialogContent>
      <DialogActions className="actionButton">
        <Button autoFocus onClick={handleSave}>
          {edit ? "Update" : "Save"}
        </Button>
        <Button autoFocus onClick={handleCloseJobcard}>
          Print
        </Button>
      </DialogActions>
    </>
  );
}
export default AgrNewJobCard;
