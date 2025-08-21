import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
} from "@mui/material";
import "./Newjobcard.css";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { MdDeleteForever } from "react-icons/md";

const format = (val) =>
  isNaN(parseFloat(val)) ? "" : parseFloat(val).toFixed(3);

const NewJobCard = ({
  onClose,
  onSave,
  initialData,
  artisanId,
  goldsmithName,
}) => {
  const [assignmentId, setAssignmentId] = useState(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [goldRows, setGoldRows] = useState([
    { id: null, weight: "", touch: "", purity: "" },
  ]);
  const [itemRows, setItemRows] = useState([
    {
      id: null,
      weight: "",
      name: "",
      wastageValue: "",
      wastageType: "Touch",
      deductions: [{ id: null, type: "Stone", customType: "", weight: "" }],
      finalPurity: 0,
    },
  ]);
  const [receivedMetalReturns, setReceivedMetalReturns] = useState([
    { id: null, weight: "", touch: "", purity: "" },
  ]);
  const [openingBalance, setOpeningBalance] = useState(0.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [displayDate, setDisplayDate] = useState(
    new Date().toLocaleDateString("en-IN")
  );

  const symbolOptions = ["Touch", "%", "+"];
  const [masterItemOptions, setMasterItemOptions] = useState([]);
  const stoneOptions = ["Stone", "Enamel", "Beads", "Others"];

  useEffect(() => {
    const fetchMasterItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/master-items`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch master items: ${response.status} ${response.statusText} - ${errorText}`
          );
        }
        const data = await response.json();
        setMasterItemOptions(data.map((item) => item.itemName));
      } catch (err) {
        console.error("Error fetching master items:", err);
        setError(`Failed to load item options: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMasterItems();
  }, []);

  const calculatePurity = (w, t) =>
    !isNaN(w) && !isNaN(t)
      ? ((parseFloat(w) * parseFloat(t)) / 100).toFixed(3)
      : "";

  const recalculateFinalPurity = (item) => {
    const totalItemDeductions = item.deductions.reduce(
      (sum, deduction) => sum + parseFloat(deduction.weight || 0),
      0
    );
    const itemNetWeightCalc =
      parseFloat(item.weight || 0) - totalItemDeductions;
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

  useEffect(() => {
    if (initialData) {
      setAssignmentId(initialData.id);
      setDescription(initialData.description || "");
      setDisplayDate(
        initialData.createdAt
          ? new Date(initialData.createdAt).toLocaleDateString("en-IN")
          : new Date().toLocaleDateString("en-IN")
      );

      setGoldRows([
        {
          id: initialData.id,
          weight:
            initialData.weight !== undefined ? String(initialData.weight) : "",
          touch:
            initialData.touch !== undefined ? String(initialData.touch) : "",
          purity: calculatePurity(initialData.weight, initialData.touch),
        },
      ]);

      const mappedItemRows = initialData.deliveries.map((delivery) => {
        const itemWeight = parseFloat(delivery.itemWeight || 0);
        const stoneWeight = parseFloat(delivery.stoneWeight || 0);
        const wastageValue = parseFloat(delivery.wastageValue || 0);
        let finalPurity = 0;

        if (delivery.wastageType === "Touch") {
          finalPurity = ((itemWeight - stoneWeight) * wastageValue) / 100;
        } else if (delivery.wastageType === "%") {
          finalPurity =
            itemWeight -
            stoneWeight +
            ((itemWeight - stoneWeight) * wastageValue) / 100;
        } else if (delivery.wastageType === "+") {
          finalPurity = itemWeight - stoneWeight + wastageValue;
        }

        return {
          id: delivery.id,
          weight:
            delivery.itemWeight !== undefined
              ? String(delivery.itemWeight)
              : "",
          name: delivery.itemName || "",
          wastageValue:
            delivery.wastageValue !== undefined
              ? String(delivery.wastageValue)
              : "",
          wastageType: delivery.wastageType || "Touch",
          deductions: [
            {
              id: delivery.id,
              type: "Stone",
              customType: "",
              weight:
                delivery.stoneWeight !== undefined
                  ? String(delivery.stoneWeight)
                  : "",
            },
          ],
          finalPurity: delivery.finalPurity || 0,
        };
      });

      setItemRows(
        mappedItemRows.length > 0
          ? mappedItemRows
          : [
              {
                id: null,
                weight: "",
                name: "",
                wastageValue: "",
                wastageType: "Touch",
                deductions: [
                  { id: null, type: "Stone", customType: "", weight: "" },
                ],
                finalPurity: 0,
              },
            ]
      );
      const initialReceivedReturns =
        initialData?.receivedMetalReturns?.length > 0
          ? initialData.receivedMetalReturns
          : initialData?.received?.length > 0
          ? initialData.received.map((item) => ({
              id: item.id,
              weight: item.weight !== undefined ? String(item.weight) : "",
              touch: item.touch !== undefined ? String(item.touch) : "",
              purity: calculatePurity(item.weight, item.touch),
            }))
          : [{ id: null, weight: "", touch: "", purity: "" }];

      setReceivedMetalReturns(initialReceivedReturns);

      if (initialData.totalRecord) {
        setOpeningBalance(
          parseFloat(initialData.totalRecord.openingBalance || 0)
        );
      }
    } else {
      setAssignmentId(null);
      setDescription("");
      setGoldRows([{ id: null, weight: "", touch: "", purity: "" }]);
      setItemRows([
        {
          id: null,
          weight: "",
          name: "",
          wastageValue: "",
          wastageType: "Touch",
          deductions: [{ id: null, type: "Stone", customType: "", weight: "" }],
          finalPurity: 0,
        },
      ]);
      setReceivedMetalReturns([
        { id: null, weight: "", touch: "", purity: "" },
      ]);
      setDisplayDate(new Date().toLocaleDateString("en-IN"));
      setOpeningBalance(0);
    }
  }, [initialData, artisanId]);

  const handleGoldRowChange = (i, field, val) => {
    const copy = [...goldRows];
    copy[i][field] = val;
    copy[i].purity = calculatePurity(
      parseFloat(copy[i].weight),
      parseFloat(copy[i].touch)
    );
    setGoldRows(copy);
  };

  const handleItemRowChange = (i, field, val) => {
    const updated = [...itemRows];
    updated[i][field] = val;
    updated[i].finalPurity = recalculateFinalPurity(updated[i]);
    setItemRows(updated);
  };

  const handleDeductionChange = (itemIndex, deductionIndex, field, val) => {
    const updated = [...itemRows];
    updated[itemIndex].deductions[deductionIndex][field] = val;
    updated[itemIndex].finalPurity = recalculateFinalPurity(updated[itemIndex]);
    setItemRows(updated);
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

  const totalInputPurityGiven = goldRows.reduce(
    (sum, row) => sum + parseFloat(row.purity || 0),
    0
  );

  const totalItemWeight = itemRows.reduce(
    (sum, item) => sum + parseFloat(item.weight || 0),
    0
  );

  const totalDeductionWeight = itemRows.reduce(
    (sum, item) =>
      sum +
      item.deductions.reduce(
        (dSum, deduction) => dSum + parseFloat(deduction.weight || 0),
        0
      ),
    0
  );

  const netWeight = format(totalItemWeight - totalDeductionWeight);

  const totalFinishedPurity = itemRows.reduce(
    (sum, item) => sum + parseFloat(item.finalPurity || 0),
    0
  );

  const totalReceivedPurity = receivedMetalReturns.reduce(
    (sum, row) => sum + parseFloat(row.purity || 0),
    0
  );

  const totalGivenToGoldsmith = openingBalance + totalInputPurityGiven;
  const totalFromGoldsmith = totalFinishedPurity + totalReceivedPurity;
  const ownerGivesBalance = totalFromGoldsmith > totalGivenToGoldsmith;
  const balanceDifference = Math.abs(
    totalFromGoldsmith - totalGivenToGoldsmith
  );

  const isEditing = assignmentId !== null;
  const isItemDeliveryEnabled = isEditing;
  const isReceivedSectionEnabled = isEditing;

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setMessage("");

    let jobcardId = initialData?.id;
    let jobcardPayload;

    try {
      if (!isEditing) {
        jobcardPayload = {
          goldsmithId: artisanId,
          description: description,
          weight: parseFloat(goldRows[0]?.weight || 0),
          touch: parseFloat(goldRows[0]?.touch || 0),
          purity: parseFloat(goldRows[0]?.purity || 0),
          openingBalance: openingBalance,
          totalPurity: totalInputPurityGiven,
          totalBalance: totalGivenToGoldsmith,
        };

        const jobcardResponse = await fetch(
          `${BACKEND_SERVER_URL}/api/assignments/create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jobcardPayload),
          }
        );

        if (!jobcardResponse.ok) {
          const errorText = await jobcardResponse.text();
          let errorMessage = `Failed to create job card. Status: ${jobcardResponse.status}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            console.error("Server responded with non-JSON error:", errorText);
          }
          throw new Error(errorMessage);
        }

        const jobcardData = await jobcardResponse.json();
        jobcardId = jobcardData.jobcard.id;
        setMessage("Job card created successfully!");
      } else {
        jobcardPayload = {
          goldsmithId: artisanId,
          description: description,
          weight: parseFloat(goldRows[0]?.weight || 0),
          touch: parseFloat(goldRows[0]?.touch || 0),
          purity: parseFloat(goldRows[0]?.purity || 0),
          openingBalance: openingBalance,
          totalPurity: totalInputPurityGiven,
          totalBalance: totalGivenToGoldsmith,
        };
      }

      const itemsPayload = itemRows
        .filter((item) => parseFloat(item.weight || 0) > 0)
        .map((item) => ({
          itemName: item.name,
          itemWeight: parseFloat(item.weight || 0),
          type: "Jewelry",
          stoneWeight: item.deductions.reduce(
            (sum, deduction) => sum + parseFloat(deduction.weight || 0),
            0
          ),
          wastageType: item.wastageType,
          wastageValue: parseFloat(item.wastageValue || 0),
          finalPurity: parseFloat(item.finalPurity || 0),
        }));

      const deliveriesExist = isEditing && initialData?.deliveries?.length > 0;

      if (itemsPayload.length > 0 && !deliveriesExist) {
        const itemDeliveryResponse = await fetch(
          `${BACKEND_SERVER_URL}/api/assignments/item-deliveries`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              goldsmithId: artisanId,
              jobcardId: jobcardId,
              items: itemsPayload,
            }),
          }
        );

        if (!itemDeliveryResponse.ok) {
          const errorText = await itemDeliveryResponse.text();
          let errorMessage = `Failed to save item deliveries. Status: ${itemDeliveryResponse.status}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error("Server responded with non-JSON error:", errorText);
          }
          throw new Error(errorMessage);
        }
        setMessage(`Item deliveries saved successfully!`);
      }

      const receivedPayload = receivedMetalReturns
        .filter(
          (item) =>
            parseFloat(item.weight || 0) > 0 && parseFloat(item.touch || 0) > 0
        )
        .map((item) => ({
          weight: parseFloat(item.weight),
          touch: parseFloat(item.touch),
          purity: parseFloat(item.purity),
          goldsmithId: artisanId,
          jobcardId: jobcardId,
          date: item.date || new Date().toISOString(),
          description: item.description || "",
        }));

      const receivedSectionExists =
        isEditing && initialData?.received?.length > 0;

      if (receivedPayload.length > 0 && !receivedSectionExists) {
        const receivedResponse = await fetch(
          `${BACKEND_SERVER_URL}/api/assignments/received-section`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(receivedPayload[0]),
          }
        );

        if (!receivedResponse.ok) {
          const errorText = await receivedResponse.text();
          let errorMessage = `Failed to save received metal returns. Status: ${receivedResponse.status}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error("Server responded with non-JSON error:", errorText);
          }
          throw new Error(errorMessage);
        }
        setMessage(`Received metal returns saved successfully!`);
      }

      if (onSave) {
        onSave({
          jobcard: {
            ...(isEditing ? initialData : jobcardPayload),
            id: jobcardId,
            itemName: itemRows[0]?.name || "",
            itemWeight: parseFloat(itemRows[0]?.weight || 0),
            totalStoneWeight: totalDeductionWeight,
            wastage: parseFloat(itemRows[0]?.wastageValue || 0),
            wastageType: itemRows[0]?.wastageType || "Touch",
            finalPurity: parseFloat(itemRows[0]?.finalPurity || 0),
          },
          totalRecord: {
            openingBalance: openingBalance,
            totalBalance: totalGivenToGoldsmith,
            newBalance: totalFromGoldsmith - totalGivenToGoldsmith,
          },
          receivedMetalReturns: receivedPayload,
        });
      }

      onClose();
    } catch (err) {
      console.error("Save failed:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveGoldRow=(i)=>{
    console.log('gold index',i)
  }

  return (
    <Dialog
      open={true}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      scroll="paper"
      sx={{
        "& .MuiDialog-paper": {
          width: "96%",
          minWidth: "1100px",
        },
      }}
    >
      <DialogContent>
        {isLoading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              zIndex: 1000,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <div className="container">
          <div className="header">
            <div className="header-item">
              <span className="header-label">Name:</span> {goldsmithName}
            </div>
            <div className="header-item">
              <span className="header-label">Date:</span> {displayDate}
            </div>
          </div>

          <div className="section">
            <label htmlFor="description" className="label">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="textarea"
              placeholder="Enter job Description...."
            />
          </div>

          <div className="section">
            <h3 className="section-title">Given Details</h3>
            {goldRows.map((row, i) => (
              <div key={row.id || `gold-${i}`} className="row">
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
                <input
                  type="number"
                  placeholder="Touch"
                  value={row.touch}
                  onChange={(e) =>
                    handleGoldRowChange(i, "touch", e.target.value)
                  }
                  onWheel={(e) => e.target.blur()}
                  className="input"
                />
                <span className="operator">=</span>
                <input
                  type="text"
                  readOnly
                  placeholder="Purity"
                  value={format(row.purity)}
                  className="input-read-only"
                />
                <MdDeleteForever size={25} onClick={()=>handleRemoveGoldRow(i)} />
              </div>
            ))}
            <button
              onClick={() =>
                setGoldRows([
                  ...goldRows,
                  { id: null, weight: "", touch: "", purity: "" },
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

          <div className="section">
            <h3 className="section-title">Balance</h3>
            <div className="balance-block">
              <div className="balance-display-row">
                <span className="balance-label">Opening Balance:</span>
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
          </div>

          <div
            className="section"
            style={{
              opacity: isItemDeliveryEnabled ? 1 : 0.5,
              pointerEvents: isItemDeliveryEnabled ? "auto" : "none",
            }}
          >
            <h3 className="section-title">Item Delivery</h3>
            <div className="item-delivery-container">
              <div className="item-delivery-header">
                <span>Item Weight</span>
                <span>Item Name</span>
                <span>Deductions</span>
                <span>Net Weight</span>
                <span>Wastage Type</span>
                <span>Wastage Value</span>
                <span>Final Purity</span>
              </div>

              {itemRows.map((item, itemIndex) => {
                const totalItemDeductions = item.deductions.reduce(
                  (sum, deduction) => sum + parseFloat(deduction.weight || 0),
                  0
                );
                const itemNetWeightCalc =
                  parseFloat(item.weight || 0) - totalItemDeductions;

                return (
                  <div
                    key={item.id || `item-${itemIndex}`}
                    className="item-delivery-row"
                  >
                    <input
                      type="number"
                      placeholder="Weight"
                      value={item.weight}
                      onChange={(e) =>
                        handleItemRowChange(itemIndex, "weight", e.target.value)
                      }
                      className="input-small"
                      disabled={isLoading || !isItemDeliveryEnabled}
                      onWheel={(e) => e.target.blur()}
                    />

                    <select
                      value={item.name}
                      onChange={(e) =>
                        handleItemRowChange(itemIndex, "name", e.target.value)
                      }
                      className="select-small"
                      disabled={isLoading || !isItemDeliveryEnabled}
                    >
                      <option value="">Item</option>
                      {masterItemOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <div className="deductions-column">
                      {item.deductions.map((deduction, deductionIndex) => (
                        <div key={deductionIndex} className="deduction-row">
                          <select
                            value={deduction.type}
                            onChange={(e) =>
                              handleDeductionChange(
                                itemIndex,
                                deductionIndex,
                                "type",
                                e.target.value
                              )
                            }
                            className="select-small"
                            disabled={isLoading || !isItemDeliveryEnabled}
                          >
                            {stoneOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>

                          {deduction.type === "Others" && (
                            <input
                              type="text"
                              value={deduction.customType}
                              onChange={(e) =>
                                handleDeductionChange(
                                  itemIndex,
                                  deductionIndex,
                                  "customType",
                                  e.target.value
                                )
                              }
                              placeholder="Specify"
                              className="input-small"
                              disabled={isLoading || !isItemDeliveryEnabled}
                            />
                          )}

                          <input
                            type="number"
                            value={deduction.weight}
                            onChange={(e) =>
                              handleDeductionChange(
                                itemIndex,
                                deductionIndex,
                                "weight",
                                e.target.value
                              )
                            }
                            placeholder="Weight"
                            className="input-small"
                            disabled={isLoading || !isItemDeliveryEnabled}
                            onWheel={(e) => e.target.blur()}
                          />

                          <button
                            onClick={() => {
                              const updated = [...itemRows];
                              updated[itemIndex].deductions.splice(
                                deductionIndex,
                                1
                              );
                              setItemRows(updated);
                            }}
                            className="remove-button"
                            disabled={
                              isLoading ||
                              !isItemDeliveryEnabled ||
                              item.deductions.length <= 1
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => {
                          const updated = [...itemRows];
                          updated[itemIndex].deductions.push({
                            id: null,
                            type: "Stone",
                            customType: "",
                            weight: "",
                          });
                          setItemRows(updated);
                        }}
                        className="add-deduction-button"
                        disabled={isLoading || !isItemDeliveryEnabled}
                      >
                        +
                      </button>
                    </div>

                    <input
                      type="text"
                      readOnly
                      value={format(itemNetWeightCalc)}
                      className="input-small input-read-only"
                    />

                    <select
                      value={item.wastageType}
                      onChange={(e) =>
                        handleItemRowChange(
                          itemIndex,
                          "wastageType",
                          e.target.value
                        )
                      }
                      className="select-small"
                      disabled={isLoading || !isItemDeliveryEnabled}
                    >
                      {symbolOptions.map((symbol) => (
                        <option key={symbol} value={symbol}>
                          {symbol}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="Value"
                      value={item.wastageValue}
                      onChange={(e) =>
                        handleItemRowChange(
                          itemIndex,
                          "wastageValue",
                          e.target.value
                        )
                      }
                      className="input-small"
                      disabled={isLoading || !isItemDeliveryEnabled}
                      onWheel={(e) => e.target.blur()}
                    />

                    <span className="final-purity-value">
                      {format(item.finalPurity)}
                    </span>
                  </div>
                );
              })}

              <button
                onClick={() => {
                  setItemRows([
                    ...itemRows,
                    {
                      id: null,
                      weight: "",
                      name: "",
                      wastageValue: "",
                      wastageType: "Touch",
                      deductions: [
                        {
                          id: null,
                          type: "Stone",
                          customType: "",
                          weight: "",
                        },
                      ],
                      finalPurity: 0,
                    },
                  ]);
                }}
                className="circle-button"
                disabled={isLoading || !isItemDeliveryEnabled}
              >
                +
              </button>
            </div>
            <div className="totals-section">
              <div className="total-row">
                <span className="total-purity-label">Total Item Purity:</span>
                <span className="total-purity-value">
                  {format(totalFinishedPurity)}
                </span>
              </div>
            </div>
          </div>

          <div
            className="section"
            style={{
              opacity: isReceivedSectionEnabled ? 1 : 0.5,
              pointerEvents: isReceivedSectionEnabled ? "auto" : "none",
            }}
          >
            <h3 className="section-title">Received Section</h3>
            <div className="received-section-container">
              <div className="received-section-header">
                <span>Weight</span>
                <span>Touch</span>
                <span>Purity</span>
              </div>
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
                    disabled={isLoading || !isReceivedSectionEnabled}
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
                    disabled={isLoading || !isReceivedSectionEnabled}
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
                </div>
              ))}
              <button
                onClick={() =>
                  setReceivedMetalReturns([
                    ...receivedMetalReturns,
                    { id: null, weight: "", touch: "", purity: "" },
                  ])
                }
                className="circle-button"
                disabled={isLoading || !isReceivedSectionEnabled}
              >
                +
              </button>
            </div>
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

          {parseFloat(totalGivenToGoldsmith) !== 0 && (
            <div className="final-balance-section">
              <h3 className="section-title">Final Balance</h3>
              <div className="balance-block">
                <div className="balance-display-row">
                  <span className="balance-label">
                    Total Given to Goldsmith:
                  </span>
                  <span className="balance-value">
                    {format(totalGivenToGoldsmith)}
                  </span>
                </div>
                <div className="balance-display-row">
                  <span className="balance-label">Total from Goldsmith:</span>
                  <span className="balance-value">
                    {format(totalFromGoldsmith)}
                  </span>
                </div>
                <div>----------</div>
                {ownerGivesBalance ? (
                  <p className="balance-text-owner">
                    Owner should give balance:
                    <span className="balance-amount">
                      {format(balanceDifference)}
                    </span>
                  </p>
                ) : (
                  <p className="balance-text-artisan">
                    Goldsmith should give balance:
                    <span className="balance-amount">
                      {format(balanceDifference)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {error && (
            <p style={{ color: "red", marginBottom: "10px" }}>Error: {error}</p>
          )}
          {message && (
            <p style={{ color: "green", marginBottom: "10px" }}>{message}</p>
          )}
          <Button
            variant="contained"
            color={isEditing ? "primary" : "success"}
            onClick={handleSave}
            disabled={isLoading}
          >
            {isEditing ? "UPDATE JOB CARD" : "SAVE INITIAL"}
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          CANCEL
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewJobCard;
