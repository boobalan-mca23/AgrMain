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

const RepairDetailsModal = ({ open, onClose, selectedRepair }) => {
  if (!selectedRepair) return null;

  const fmtNum = (v, d = 3) => (v != null && !isNaN(v) ? Number(v).toFixed(d) : "0.000");

  const rowStyle = {
    "& td": { borderBottom: "1px solid #f0f0f0", py: 1 },
    "&:last-child td": { borderBottom: 0 },
  };

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

        <Box sx={{ px: 1 }}>
          <div className="detail-item">
            <span className="detail-label">Item Name:</span>
            <span className="detail-val">{selectedRepair.productName || selectedRepair.itemName}</span>
          </div>
           <div className="detail-item">
            <span className="detail-label">Count:</span>
            <span className="detail-val">{selectedRepair.count}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Item Weight (g):</span>
            <span className="detail-val">{fmtNum(selectedRepair.weight || selectedRepair.grossWeight)} g</span>
          </div>
          {/* <div className="detail-item">
            <span className="detail-label">Stone Weight (g):</span>
            <span className="detail-val">{fmtNum(selectedRepair.stoneWeight)} g</span>
          </div> */}
          <div className="detail-item">
            <span className="detail-label">Entered St.WT (g):</span>
            <span className="detail-val">{fmtNum(selectedRepair.enteredStoneWeight)} g</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Actual St.WT (g):</span>
            <span className="detail-val">{fmtNum(selectedRepair.stoneWeight)} g</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">AWT (g):</span>
            <span className="detail-val">{fmtNum(selectedRepair.awt, 3)} g</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Touch % (Billing):</span>
            <span className="detail-val">{fmtNum(selectedRepair.percentage, 3)}%</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">FWT (g):</span>
            <span className="detail-val">{fmtNum(selectedRepair.pureGoldReduction, 3)} g</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">HallMark :</span>
            <span className="detail-val">{fmtNum(selectedRepair.hallmarkReduction,0)}</span>
          </div>
          <div className="detail-item" style={{ borderBottom: "none" }}>
            <span className="detail-label">Reason:</span>
            <span className="detail-val" style={{ maxWidth: "60%", textAlign: "right" }}>
              {selectedRepair.reason || "None"}
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
            <Typography variant="body2" sx={{ fontWeight: "800", color: "#dc2626" }}>
              {fmtNum(selectedRepair.pureGoldReduction, 3)} g
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontWeight: "600", color: "#475569" }}>Hallmark Impact</Typography>
            <Typography variant="body2" sx={{ fontWeight: "800", color: "#dc2626" }}>
              {fmtNum(selectedRepair.hallmarkReduction, 2)} g
            </Typography>
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
