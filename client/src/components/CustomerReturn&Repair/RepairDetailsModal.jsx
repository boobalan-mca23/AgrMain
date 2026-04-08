import React from "react";
import {
  Modal,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Divider,
  Button
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 400,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: "8px",
};

const RepairDetailsModal = ({ open, onClose, selectedRepair, reportType }) => {
  if (!selectedRepair) return null;

  const fmtNum = (v, d = 3) => (v != null && !isNaN(v) ? Number(v).toFixed(d) : "0.000");

  const {
    productName, itemName,
    count,
    weight, grossWeight, itemWeight, receivedWeight,
    enteredStoneWeight,
    stoneWeight, stone,
    awt, netWeight,
    percentage, touch,
    pureGoldReduction, purity, receivedPurity, finalPurity, fwt,
    hallmarkReduction, hallmark, billNo, billId,
    reason,
    wastageType, wastageValue, wastagePure
  } = selectedRepair;

  const displayItemName = productName || itemName || "Item";
  const displayCount = count || 1;
  const displayWeight = weight || grossWeight || itemWeight || receivedWeight || 0;
  
  // Separate FWT (Billing/Customer Impact) and Final Purity (Metal/Goldsmith Impact)
  const displayFWT = fwt || pureGoldReduction || 0;
  const displayFinalPurity = purity || receivedPurity || finalPurity || 0;
  
  const displayEnteredStone = enteredStoneWeight || 0;
  const displayActualStone = stoneWeight || 0;
  
  const displayAwt = awt || netWeight || (displayWeight - displayActualStone);
  
  // Use percentage or touch with 100 as broad fallback
  const displayTouch = percentage || touch || (selectedRepair.percentage === 0 || selectedRepair.touch === 0 ? 0 : 100);
  const displayHallmark = hallmarkReduction || hallmark || 0;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ 
          bgcolor: "#1e293b", 
          color: "white", 
          p: 2, 
          mx: -4, 
          mt: -4, 
          mb: 3, 
          borderTopLeftRadius: "8px", 
          borderTopRightRadius: "8px" 
        }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Repair Product Details
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ maxHeight: '75vh', overflowY: 'auto', px: 1 }}>
          <Box sx={{ px: 1 }}>
            {selectedRepair.source === "Stock" ? (
              <>
                <div className="detail-item">
                  <span className="detail-label">Item Name:</span>
                  <span className="detail-val">{displayItemName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Item Weight (g):</span>
                  <span className="detail-val">{fmtNum(displayWeight)} g</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Count:</span>
                  <span className="detail-val">{displayCount}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Touch:</span>
                  <span className="detail-val">{fmtNum(displayTouch, 3)}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Stone Wt (g):</span>
                  <span className="detail-val">{fmtNum(displayActualStone)} g</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Net Weight (g):</span>
                  <span className="detail-val">{fmtNum(selectedRepair.netWeight || (displayWeight - displayActualStone))} g</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Wastage Type:</span>
                  <span className="detail-val">{selectedRepair.wastageType || "None"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Wastage Value:</span>
                  <span className="detail-val">{fmtNum(selectedRepair.wastageValue || 0)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Wastage Pure (g):</span>
                  <span className="detail-val">{fmtNum(selectedRepair.wastagePure || 0)} g</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Final Purity (g):</span>
                  <span className="detail-val">{fmtNum(displayFinalPurity, 3)} g</span>
                </div>
              </>
            ) : (
              <>
                {billNo && (
                  <div className="detail-item">
                    <span className="detail-label">Bill No:</span>
                    <span className="detail-val" style={{ fontWeight: "bold", color: "#0f172a" }}>{billNo}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Item Name:</span>
                  <span className="detail-val">{displayItemName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Count:</span>
                  <span className="detail-val">{displayCount}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Item Weight (g):</span>
                  <span className="detail-val">{fmtNum(displayWeight)} g</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Stone Weight (g):</span>
                  <span className="detail-val">{fmtNum(displayActualStone)} g</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">AWT (Actual G.WT):</span>
                  <span className="detail-val">{fmtNum(displayAwt, 3)} g</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Touch % (Billing):</span>
                  <span className="detail-val">{fmtNum(displayTouch, 3)}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">FWT (Billing g):</span>
                  <span className="detail-val">{fmtNum(displayFWT, 3)} g</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Final Purity (g):</span>
                  <span className="detail-val">{fmtNum(displayFinalPurity, 3)} g</span>
                </div>
              </>
            )}
            <div className="detail-item" style={{ borderBottom: "none" }}>
              <span className="detail-label">Reason:</span>
              <span className="detail-val" style={{ maxWidth: "60%", textAlign: "right" }}>
                {reason || "None"}
              </span>
            </div>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ bgcolor: "#f8fafc", p: 2, borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "700", color: "#64748b", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em", mb: 1.5 }}>
              Ledger & Audit Information
            </Typography>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2" sx={{ fontWeight: "600", color: "#475569" }}>Ledger Impact (Final Purity)</Typography>
              <Typography variant="body2" sx={{ fontWeight: "800", color: "#dc2626" }}>
                {fmtNum(displayFinalPurity, 3)} g
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button variant="contained" onClick={onClose} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default RepairDetailsModal;
