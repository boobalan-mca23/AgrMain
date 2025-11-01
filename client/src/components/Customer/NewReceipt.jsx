import * as React from "react";
import { useState } from "react";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import "./NewReceipt.css";
import {checkReceipt} from '../cashOrGoldValidation/cashOrGoldValidation'
const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    width: "100%",
    minWidth: "450px", // like your Add Transaction popup
    borderRadius: "12px",
  },
  "& .MuiDialogContent-root": {
    padding: theme.spacing(2),
  },
  "& .MuiDialogActions-root": {
    padding: theme.spacing(1),
  },
}));

export default function NewReceipt(props) {
  const { handleClose, open } = props;
  const today = new Date();
  const formattedToday = today.toISOString().split("T")[0];
  const [newReceipt, setNewReceipt] = useState({
    date: formattedToday,
    type: "",
    goldRate: "",
    gold: "",
    touch: "",
    purity: "",
    amount: "",
    hallMark: "",
  });
 const [goldCashError,setGoldCashError]=useState({})

 const handleChangeReceipt = (e) => {
  const { name, value } = e.target;

  setNewReceipt((prev) => {
    const updated = { ...prev, [name]: value };

    let amount = parseFloat(updated.amount) || 0;
    let goldRate = parseFloat(updated.goldRate) || 0;
    let gold = parseFloat(updated.gold) || 0;
    let touch = parseFloat(updated.touch) || 0;

    // If cash receipt
    if (updated.type === "cash" && amount > 0 && goldRate > 0) {
      updated.purity = (amount / goldRate).toFixed(3);
    }

    // If gold receipt
    if (updated.type === "gold" && gold > 0 && touch > 0) {
      updated.purity = (gold * (touch / 100)).toFixed(3);
    }

    return updated;
  });
};

const handleSubmit=()=>{
    let isTrue=checkReceipt(newReceipt,setGoldCashError)
    if(Object.keys(isTrue).length===0){
         handleClose()
    }
 
}

  return (
    <React.Fragment>
      <BootstrapDialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
          Add New Receipt
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={(theme) => ({
            position: "absolute",
            right: 8,
            top: 8,
            color: theme.palette.grey[500],
          })}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent dividers>
          <form className="receipt-form">
            <label><strong>Date :</strong></label>
            <input
              type="date"
              name="date"
              value={newReceipt.date}
              onChange={(e) => handleChangeReceipt(e)}
            ></input>
            {goldCashError.date && (
                      <p style={{ color: "red" }}>{goldCashError.date}</p>
            )}
            <label><strong>Select Receipt Type :</strong></label>
            <select
              name="type"
              onChange={(e) => {
                handleChangeReceipt(e);
              }}
            >
              <option value={""}>Select</option>
              <option value={"cash"}>Cash</option>
              <option value={"gold"}>Gold</option>
            </select>
            {goldCashError.type && (
              <p style={{ color: "red" }}>{goldCashError.type}</p>
            )}
            {newReceipt.type === "cash" ? (
              <>
                <label><strong>Cash:</strong></label>
                <input
                  type="number"
                  onWheel={(e)=>e.target.blur()}
                  name="amount"
                  className="receipt-form-input"
                  value={newReceipt.amount}
                  onChange={(e) => handleChangeReceipt(e)}
                />
                {goldCashError.amount && (
              <p style={{ color: "red" }}>{goldCashError.amount}</p>
            )}
                <label><strong>GoldRate:</strong></label>
                <input
                  type="number"
                  onWheel={(e)=>e.target.blur()}
                  name="goldRate"
                  value={newReceipt.goldRate}
                  onChange={(e) => handleChangeReceipt(e)}
                />
                 {goldCashError.goldRate && (
              <p style={{ color: "red" }}>{goldCashError.goldRate}</p>
            )}
                <label><strong>Hall Mark:</strong></label>
                <input
                  type="number"
                  onWheel={(e)=>e.target.blur()}
                  name="hallMark"
                  value={newReceipt.hallMark}
                  onChange={(e) => handleChangeReceipt(e)}
                />

                <label><strong>Purity:</strong></label>
                <input value={newReceipt.purity} readOnly />
              </>
            ) : (
              <>
                {newReceipt.type === "gold" ? (
                  <>
                    <label><strong>Gold:</strong></label>
                    <input
                      type="number"
                      onWheel={(e)=>e.target.blur()}
                      name="gold"
                      className="receipt-form-input"
                      value={newReceipt.gold}
                      onChange={(e) => handleChangeReceipt(e)}
                    />
                    {goldCashError.gold && (
              <p style={{ color: "red" }}>{goldCashError.gold}</p>
            )}
                    <label><strong>Touch:</strong></label>
                    <input
                      name="touch"
                      value={newReceipt.touch}
                      onChange={(e) => handleChangeReceipt(e)}
                    />
                    
                    <label><strong>Hall Mark:</strong></label>
                    <input
                      type="number"
                      onWheel={(e)=>e.target.blur()}
                      name="hallMark"
                      value={newReceipt.hallMark}
                      onChange={(e) => handleChangeReceipt(e)}
                    />
                    <label><strong>Purity:</strong></label>
                    <input value={newReceipt.purity} readOnly />
                  </>
                ) : (
                  <></>
                )}
              </>
            )}
          </form>
        </DialogContent>
        <DialogActions>
          <Button autoFocus onClick={handleSubmit}>
            Save Receipt
          </Button>
        </DialogActions>
      </BootstrapDialog>
    </React.Fragment>
  );
}
