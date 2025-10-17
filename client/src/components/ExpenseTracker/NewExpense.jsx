import {
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  IconButton,
  Divider,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "./NewExpense.css";
import { ToastContainer, toast } from "react-toastify";
import { useState } from "react";
import {z} from "zod"
import {
  checkAvailabilityStock,
} from "../jobcardvalidation/JobcardValidation";
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
    
const expenseSchema = z.object({
  gold: z
    .number({ invalid_type_error: "Gold must be a number" })
    .min(1, "Gold cannot be negative"),
  touch: z
    .number({ invalid_type_error: "Touch must be a number" })
    .min(0, "Touch cannot be negative"),
  
});
  
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
      gold: parseFloat(newExpense.gold),
      touch: parseFloat(newExpense.touch),
      purity: parseFloat(newExpense.purity),
    };

    expenseSchema.parse(dataToValidate); // Throws if invalid
    setExpenseError({}); // Clear previous errors

    // If validation passes
     let exist = checkAvailabilityStock(rawGold);
    if (exist.stock === "ok") {
      handleSaveExpense(dataToValidate);
      handleClosePop();
    } else {
      toast.warn(`No Gold Stock in Touch ${exist.touch}`);
    }

  } catch (err) {
      if (err instanceof z.ZodError) {
      const errors = {};
      err.issues.forEach((e) => { // use 'issues' instead of 'errors'
        if (e.path[0]) errors[e.path[0]] = e.message;
      });
      setExpenseError(errors);
    }
  }
  
};

  return (
    <Dialog
      open={open}
      onClose={handleClosePop}
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
              <textarea
                className="description"
                name="description"
                value={newExpense.description}
                type=""
                onChange={(e) => {
                  handleChangeExpense(e);
                }}
              />

              <input
                placeholder="GivenGold"
                name="gold"
                type="number"
                value={newExpense.gold}
                onChange={(e) => {
                  handleChangeExpense(e);
                }}
                onWheel={(e)=>e.target.blur()}
              ></input>
              {expenseError.gold&& <p style={{color:"red"}}>{expenseError.gold}</p>}
              <select
                onChange={(e) => {
                  handleChangeExpense(e);
                }}
                name="touch"
                value={newExpense.touch}
              >
                <option value={""}>Select Touch </option>
                {touch.map((t, index) => (
                  <option key={index + 1} value={t.touch}>
                    {t.touch}
                  </option>
                ))}
              </select>
                {expenseError.touch&& <p style={{color:"red"}}>{expenseError.touch}</p>}
              <input
                placeholder="Purity"
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
                      <td>{rawStock.weight}</td>
                      <td
                        style={{
                          backgroundColor:
                            rawStock.remainingWt < 0 ? "red" : "",
                        }}
                      >
                        {rawStock.remainingWt}
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
