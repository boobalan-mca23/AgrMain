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
  width: 600,
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1a237e" }}>
            Repair Product Details
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Table size="small">
          <TableBody>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold", width: "40%" }}>Item Name</TableCell>
              <TableCell>{selectedRepair.productName || selectedRepair.itemName}</TableCell>
            </TableRow>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold" }}>Item Weight (g)</TableCell>
              <TableCell>{fmtNum(selectedRepair.weight || selectedRepair.grossWeight)}</TableCell>
            </TableRow>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold" }}>Count</TableCell>
              <TableCell>{selectedRepair.count}</TableCell>
            </TableRow>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold" }}>Stone Weight (g)</TableCell>
              <TableCell>{fmtNum(selectedRepair.stoneWeight)}</TableCell>
            </TableRow>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold" }}>Entered St.WT (g)</TableCell>
              <TableCell>{fmtNum(selectedRepair.enteredStoneWeight)}</TableCell>
            </TableRow>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold" }}>Actual St.WT (g)</TableCell>
              <TableCell>{fmtNum(selectedRepair.stoneWeight)}</TableCell>
            </TableRow>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold" }}>AWT (g)</TableCell>
              <TableCell>{fmtNum(selectedRepair.awt, 3)}</TableCell>
            </TableRow>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold" }}>Touch % (profit percentage entered while billing)</TableCell>
              <TableCell>{fmtNum(selectedRepair.percentage, 3)}</TableCell>
            </TableRow>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold" }}>FWT (g)</TableCell>
              <TableCell sx={{ color: "#d32f2f", fontWeight: "bold" }}>
                {fmtNum(selectedRepair.pureGoldReduction, 3)}
              </TableCell>
            </TableRow>
            <TableRow sx={rowStyle}>
              <TableCell sx={{ fontWeight: "bold" }}>Reason</TableCell>
              <TableCell sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                {selectedRepair.reason || "None"}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

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
