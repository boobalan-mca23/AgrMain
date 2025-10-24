import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./NewExpense.css";
import { ToastContainer, toast } from "react-toastify";
import { useState } from "react";

import {
  checkAvailabilityStock,
} from "../jobcardvalidation/JobcardValidation";
import {checkExpense} from "../../components/cashOrGoldValidation/cashOrGoldValidation"
const NewExpense = ({
  open,
  newExpense,
  setNewExpense,
  touch,
  handleSaveExpense,
  handleClosePop,
  rawGold,
  setRawGold,
}) => {
const [expenseError,setExpenseError]=useState({})

const handleChangeExpense = (e) => {
    const { name, value } = e.target;

    // Save previous touch & weight
    const prevTouch = parseFloat(newExpense.touch) || 0;
    const prevWeight = parseFloat(newExpense.gold) || 0;

    // Update newExpense state
    const copy = { ...newExpense, [name]: value };

    // Update purity
    if (name === "gold" || name === "touch") {
      let gold = parseFloat(copy.gold) || 0;
      let touch = parseFloat(copy.touch) || 0;
      copy.purity = ((gold * touch) / 100).toFixed(3);
    }

    // Update rawGold stock
    let updatedRawGold = rawGold.map((item) => {
      let updatedItem = { ...item };

      // Restore previous weight
      if (updatedItem.touch === prevTouch) {
        updatedItem.remainingWt =
          parseFloat(updatedItem.remainingWt) + prevWeight;
      }

      // Deduct new weight
      if (updatedItem.touch === parseFloat(copy.touch)) {
        updatedItem.remainingWt =
          parseFloat(updatedItem.remainingWt) - (parseFloat(copy.gold) || 0);
      }

      return updatedItem;
    });

    // Set states
    setNewExpense(copy);
    console.log("updateRawGold", updatedRawGold);
    setRawGold(updatedRawGold);
  };

  const handleSave = () => {
  try {
    // Convert values to numbers for Zod
    const dataToValidate = {
      ...newExpense,
      expenseDate:newExpense.expenseDate,
      gold: parseFloat(newExpense.gold),
      touch: parseFloat(newExpense.touch),
      purity: parseFloat(newExpense.purity),
    };

    // If validation passes
    let validExpense=checkExpense(dataToValidate,setExpenseError)
    let exist = checkAvailabilityStock(rawGold);

    if(Object.keys(validExpense).length!==0) return toast.warn("Give Valid Information in Expense ")
    if (exist.stock === "ok") {
      handleSaveExpense(dataToValidate);
      handleClosePop();
    } else {
      toast.warn(`No Gold Stock in Touch ${exist.touch}`);
    }

  } catch (err) {
    alert(err.message)
  }
  
};

  return (
    <Dialog
      open={open}
       onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
            handleClosePop();
          }
         }}
      fullWidth
      maxWidth="xl" // larger than md
      PaperProps={{
        sx: {
          width: "100%", // custom width
          minWidth: "1000px", // optional max width
        },
      }}
    >
      <DialogTitle>
        Add New Expense
        <IconButton
          aria-label="close"
          onClick={handleClosePop}
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
        <div className="newExpenseForm">
          {/* //Forms */}
          <div>
            <form className="formGrid">
             <label className="expense-lable">Expense Date :</label>
              <input
                type="date"
                name="expenseDate"
                value={newExpense.expenseDate}
                onChange={(e) => {
                  handleChangeExpense(e);
                }}
              />
               {expenseError.expenseDate&& <p style={{color:"red"}}>{expenseError.expenseDate}</p>}
              <label className="expense-lable">Notes :</label>
              <textarea
                className="description"
                name="description"
                value={newExpense.description}
                type=""
                onChange={(e) => {
                  handleChangeExpense(e);
                }}
              />
              <label className="expense-lable">Given Gold :</label>
              <input
                // placeholder="GivenGold"
                name="gold"
                type="number"
                value={newExpense.gold}
                onChange={(e) => {
                  handleChangeExpense(e);
                }}
                onWheel={(e)=>e.target.blur()}
              ></input>
              {expenseError.gold&& <p style={{color:"red"}}>{expenseError.gold}</p>}
               <label className="expense-lable">Select Touch :</label>
              <select
                onChange={(e) => {
                  handleChangeExpense(e);
                }}
                name="touch"
                value={newExpense.touch}
              >
                <option value={""}>Touch </option>
                {touch.map((t, index) => (
                  <option key={index + 1} value={t.touch}>
                    {t.touch}
                  </option>
                ))}
              </select>
                {expenseError.touch&& <p style={{color:"red"}}>{expenseError.touch}</p>}
             <label className="expense-lable">Purity :</label>
              <input
                
                readOnly
                value={newExpense.purity}
              ></input>
            </form>
          </div>

          <div>
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
                  {rawGold.map((rawStock, index) => (
                    <tr key={index + 1} className="jobCardTouchTableBody">
                      <td>{index + 1}</td>
                      <td>{rawStock.touch}</td>
                      <td>{Number(rawStock.weight).toFixed(3)}</td>
                      <td
                        style={{
                          backgroundColor:
                            rawStock.remainingWt < 0 ? "red" : "",
                        }}
                      >
                        {Number(rawStock.remainingWt).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        </div>
      </DialogContent>
      <DialogActions className="actionButton">
        <Button
          autoFocus
          onClick={() => {
            handleSave();
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default NewExpense;
