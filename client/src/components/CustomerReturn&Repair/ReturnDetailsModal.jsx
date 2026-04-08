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

const ReturnDetailsModal = ({ open, onClose, selectedReturn }) => {
  if (!selectedReturn) return null;

  const fmtNum = (v, d = 3) => (v != null && !isNaN(v) ? Number(v).toFixed(d) : "0.000");

  const {
    productName, itemName,
    count,
    weight, grossWeight, itemWeight,
    enteredStoneWeight,
    stoneWeight, stone,
    awt, netWeight,
    percentage, touch,
    pureGoldReduction, purity, fwt,
    hallmarkReduction, hallmark, billNo, billId,
    reason
  } = selectedReturn;

  const displayItemName = productName || itemName || "Item";
  const displayCount = count || 1;
  const displayWeight = weight || grossWeight || itemWeight || 0;
  
  // For Returns, usually FWT is the primary impact
  const displayFWT = fwt || pureGoldReduction || purity || 0;
  
  const displayEnteredStone = enteredStoneWeight || 0;
  const displayActualStone = stoneWeight || 0;
  
  const displayAwt = awt || netWeight || (displayWeight - displayActualStone);
  
  const displayTouch = percentage || touch || (selectedReturn.percentage === 0 || selectedReturn.touch === 0 ? 0 : 100);
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
            Return Product Details
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ maxHeight: '75vh', overflowY: 'auto', px: 1 }}>
          <Box sx={{ px: 1 }}>
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
            {/* <div className="detail-item">
              <span className="detail-label">Entered St.WT (g):</span>
              <span className="detail-val">{fmtNum(displayEnteredStone)} g</span>
            </div> */}
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
              <Typography variant="body2" sx={{ fontWeight: "600", color: "#475569" }}>Ledger Impact (FWT)</Typography>
              <Typography variant="body2" sx={{ fontWeight: "800", color: "#0ea5e9" }}>
                {fmtNum(displayFWT, 3)} g
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

export default ReturnDetailsModal;
