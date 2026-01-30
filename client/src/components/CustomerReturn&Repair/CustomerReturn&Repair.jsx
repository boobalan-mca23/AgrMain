import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField,
  TablePagination,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./Customer.css";
import axios from "axios";

// import "./Stock.css";
const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 800,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 3,
  borderRadius: "8px",
};

const CustomerReturn = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // "RETURN" | "REPAIR"
  const [actionType, setActionType] = useState(null); 

  // const [openRepairDialog, setOpenRepairDialog] = useState(false);
  // const [repairReason, setRepairReason] = useState("");
  // const [selectedItem, setSelectedItem] = useState(null);
  //return pop up 
   const [openReturnDialog, setOpenReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnQC, setReturnQC] = useState({
    touch: 0,
    itemWeight: 0,
    count: 1,
    stoneWeight: 0,
    wastageValue: 0,
    wastageType: null,
    wastagePure: 0,
    netWeight: 0,
    finalPurity: 0,
    finalWeight: 0,
  });
  //send to repair popup
  const [openSendDialog, setOpenSendDialog] = useState(false);
  const [selectedGoldsmith, setSelectedGoldsmith] = useState("");
  const [reason, setReason] = useState("");           // ⭐ NEW
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [goldsmiths, setGoldsmiths] = useState([]);

  useEffect(() => {
  if (openSendDialog) {
    fetchGoldsmiths();
  }
}, [openSendDialog]);

// useEffect(() => {
//   const net =
//     Number(returnQC.itemWeight || 0) -
//     Number(returnQC.stoneWeight || 0) -
//     Number(returnQC.wastageValue || 0);

//   const wastagePure =
//     (Number(returnQC.wastageValue || 0) *
//       Number(returnQC.finalPurity || 0)) / 100;

//   setReturnQC(q => ({
//     ...q,
//     netWeight: net,
//     wastagePure
//   }));
// }, [
//   returnQC.itemWeight,
//   returnQC.stoneWeight,
//   returnQC.wastageValue,
//   returnQC.finalPurity
// ]);

const openRepairPopup = (item) => {
  setSelectedProduct(item);
  setSelectedGoldsmith("");
  setReason("");
  setOpenSendDialog(true);
};

const openReturnPopup = (item) => {
  setSelectedProduct(item);
  console.log("item",item);
  setReturnQC({
    itemWeight: item.weight || 0,
    touch: item.touch || item.percentage || 0,
    count: item.count || 0,
    stoneWeight: item.stoneWeight || 0,
    wastageValue: item.wastageValue || 0,
    wastageType: item.wastageType || null,
    wastagePure: item.wastagePure || 0,
    netWeight: item.netWeight || 0,
    finalPurity: item.finalPurity || 0,
    finalWeight: item.finalWeight || 0,
  });

  setReturnReason("");
  setOpenReturnDialog(true);
};


  // ================= FETCH SOLD BILLS =================
  const fetchSoldBills = async () => {
    try {
      const res = await fetch(`${BACKEND_SERVER_URL}/api/bill?status=ACTIVE`);
      const json = await res.json();
      setBills(Array.isArray(json.data) ? json.data : []);
      console.log("bills",json.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch bills");
    }
  };

  useEffect(() => {
    fetchSoldBills();
  }, []);

    const fetchGoldsmiths = async () => {
    const res = await axios.get(`${BACKEND_SERVER_URL}/api/goldsmith`);
    setGoldsmiths(res.data || []);
  };

  // ================= FILTER LOGIC =================

  const activeBills = bills.filter(bill =>
    bill.orders?.some(item => item.repairStatus !== "IN_REPAIR")
  );


  const filteredBills = bills.filter((bill) => {
    
    const hasActiveItems = bill.orders?.some(
      item => item.repairStatus === "NONE"
    );

    if (!hasActiveItems) return false;

    const searchValue = search.toLowerCase();

    const matchesSearch =
      !search ||
      bill.id.toString().includes(searchValue) ||
      bill.customers?.name?.toLowerCase().includes(searchValue) ||
      bill.orders?.some(item =>
        item.productName?.toLowerCase().includes(searchValue)
      );

    const billDate = bill.date ? new Date(bill.date) : null;

    const matchesFrom =
      !fromDate || (billDate && billDate >= new Date(fromDate));

    const matchesTo =
      !toDate || (billDate && billDate <= new Date(toDate));

    return matchesSearch && matchesFrom && matchesTo;
  });



  // ================= PAGINATION =================
  const paginatedBills = filteredBills.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  

  useEffect(() => {
    setPage(0);
  }, [search, fromDate, toDate, rowsPerPage]);


  // ================= RETURN SINGLE ITEM =================
  // const returnItem = async (item) => {
  //   if (!window.confirm(`Return ${item.productName}?`)) return;
  //   console.log("data",item);
  //   try {
  //     setLoading(true);
  //     const res = await fetch(`${BACKEND_SERVER_URL}/api/returns/customer-item-return`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         billId: selectedBill.id,
  //         productId: item.id,
  //         orderItemId: item.id,
  //         reason: "Customer return",
  //         productName: item.productName,
  //         weight: item.weight,
  //         stoneWeight: item.stoneWeight,
  //         count: item.count,
  //       }),
  //     });
  //     console.log("data",item);
  //     if (!res.ok) throw new Error();

  //     toast.success("Item returned successfully");
  //     setSelectedBill(prev => ({
  //       ...prev,
  //       orders: prev.orders.map(o =>
  //         o.id === item.id
  //           ? { ...o, repairStatus: "RETURNED" }
  //           : o
  //       )
  //     }));

  //     setSelectedBill(null);
  //     fetchSoldBills();
  //   } catch {
  //     toast.error("Failed to return item");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

const confirmReturn = async () => {
  await axios.post(
    `${BACKEND_SERVER_URL}/api/returns/customer-item-return`,
    {
      billId: selectedBill.id,
      currentHallmark: selectedBill.hallMark || 0,
      orderItemId: selectedProduct.id,
      reason: returnReason,
      ...returnQC
    }
  );

  toast.success("Item returned successfully");
//   setSelectedBill(prev => ({
//   ...prev,
//   orders: prev.orders.map(o =>
//     o.id === selectedProduct.id
//       ? { ...o, repairStatus: "RETURNED" }
//       : o
//   )
// }));

  setOpenReturnDialog(false);
  setSelectedBill(null);
  fetchSoldBills();
};
  // ================= RETURN ENTIRE BILL =================
  // const returnEntireBill = async () => {
  //   if (!window.confirm(`Return entire Bill #${selectedBill.id}?`)) return;

  //   const hasRepairItems = selectedBill.orders?.some(
  //     item => item.repairStatus === "IN_REPAIR"
  //   );

  //   if (hasRepairItems) {
  //     toast.error("Cannot return bill while items are in repair");
  //     return;
  //   }


  //   try {
  //     setLoading(true);

      
  //     const res = await fetch(`${BACKEND_SERVER_URL}/api/returns/customer-bill-return`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         billId: selectedBill.id,
  //         reason: "Full bill return",
  //       }),
  //     });

  //     if (!res.ok) throw new Error();

  //     toast.success("Entire bill returned");
  //     setSelectedBill(null);
  //     fetchSoldBills();
  //   } catch {
  //     toast.error("Failed to return bill");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  //sned to repair
const handleSend = async () => {
  try {
    setLoading(true);

    await axios.post(`${BACKEND_SERVER_URL}/api/repair/customer-send`, {
      billId: selectedBill.id,
      goldsmithId: selectedGoldsmith, 
      orderItemId: selectedProduct.id,
      reason
    });
    console.log("data to send",selectedProduct)
    toast.success("Item sent to repair");

    setSelectedBill(prev => ({
      ...prev,
      orders: prev.orders.map(item =>
        item.id === selectedProduct.id
          ? { ...item, repairStatus: "IN_REPAIR" }
          : item
      )
    }));

    setOpenSendDialog(false);
    setReason("");
    setSelectedProduct(null);
    fetchSoldBills();
  
  } catch (err) {
    toast.error(err.response?.data?.error || "Failed to send to repair");
  } finally {
    setLoading(false);
  }
};

const repairEntireBill = async () => { 
  if (!window.confirm(`Send entire Bill #${selectedBill.id} to repair?`)) return;

  try {
    setLoading(true);

    await axios.post(`${BACKEND_SERVER_URL}/api/repair/customer-bill-send`, {
      billId: selectedBill.id,
      reason: "Entire bill repair"
    });

    toast.success("Entire bill sent to repair");
    setSelectedBill(null);
    fetchSoldBills();

  } catch (err) {
    toast.error(err.response?.data?.error || "Failed to repair bill");
  } finally {
    setLoading(false);
  }
};

const hasRepairItems = selectedBill?.orders?.some(
  item => item.repairStatus === "IN_REPAIR"
);

const allReturned = selectedBill?.orders?.every(
  item => item.repairStatus === "RETURNED"
);

  const safeFixed = (v, d = 3) =>
    isNaN(parseFloat(v)) ? "0.000" : parseFloat(v).toFixed(d);


  const showValue = (v) =>
    v === null || v === undefined || v === "" ? "-" : v;

  return (
    <Box p={3}>
      <Typography variant="h5" mb={2}>
        Customer Return & Repair
      </Typography>

      {/* ===== Filters ===== */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="Search (Bill / Customer / Product)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <TextField
          type="date"
          size="small"
          label="From Date"
          InputLabelProps={{ shrink: true }}
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        <TextField
          type="date"
          size="small"
          label="To Date"
          InputLabelProps={{ shrink: true }}
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />

        <Button
          variant="outlined"
          onClick={() => {
            setSearch("");
            setFromDate("");
            setToDate("");
          }}
        >
          Reset
        </Button>
      </Box>


  {/* ===== Bills Table ===== */}
  <Table >
    <TableHead className="BillTable"> 
      <TableRow>
        <TableCell className="BillTable-th-td" style={{width:'10px !important'}}>S.No</TableCell>
        <TableCell className="BillTable-th-td">Bill No</TableCell>
        <TableCell className="BillTable-th-td">Customer</TableCell>
        <TableCell className="BillTable-th-td">Date</TableCell>
        <TableCell className="BillTable-th-td"></TableCell>
        <TableCell className="BillTable-th-td">Action</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {paginatedBills.length > 0 ? (
        paginatedBills.map((bill, index) => (
          <TableRow key={bill.id}>
            <TableCell className="BillTable-tb-td">
              {page * rowsPerPage + index + 1}
            </TableCell>
            <TableCell className="BillTable-tb-td">{bill.id}</TableCell>
            <TableCell className="BillTable-tb-td">
              {showValue(bill.customers?.name)}
            </TableCell>
            <TableCell className="BillTable-tb-td">
              {bill.date
                ? new Date(bill.date).toLocaleDateString("en-IN")
                : "-"}
            </TableCell>
            <TableCell className="BillTable-tb-td">
              <Button
                variant="outlined"
                onClick={() => navigate(`/bill-view/${bill.id}`)}
              >
                View Bill
              </Button>
            </TableCell>
            <TableCell className="BillTable-tb-td">
              <Button
                variant="outlined"
                onClick={() => {
                  setSelectedBill(bill)
                  setActionType("RETURN");
                }}
              >
                Return
              </Button>{" "}
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  setSelectedBill(bill);
                  setActionType("REPAIR");
                }}
              >
                Repair
              </Button>
            </TableCell>
          </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">
                No matching bills
              </TableCell>
            </TableRow>
          )}
        </TableBody>
          </Table>

      <TablePagination
        component="div"
        count={filteredBills.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(e, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />

      {/* ===== Modal ===== */}
      <Modal open={!!selectedBill} onClose={() => {
      setSelectedBill(null);
      setActionType(null);
    }}>
      <Box sx={modalStyle}>
        {selectedBill && (
          <>
            {/* HEADER */}
            <div className="model-heading-section">
              <Typography variant="h6">
                Bill no: <strong>{selectedBill.id}</strong>
              </Typography>

              <Typography variant="h6">
                Customer: <strong>{selectedBill.customers?.name}</strong>
              </Typography>
            </div>

            {/* ================= RETURN MODE ================= */}
            {actionType === "RETURN" && (
              <>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="BillTable-th-td">Product</TableCell>
                      <TableCell className="BillTable-th-td">Weight</TableCell>
                      <TableCell className="BillTable-th-td">Count</TableCell>
                      <TableCell className="BillTable-th-td">Action</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {selectedBill.orders
                      ?.filter(item => item.repairStatus === "NONE")
                      .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.weight}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>
                          <Button
                            color="error"
                            variant="outlined"
                            size="small"
                            onClick={() => openReturnPopup(item)}
                            disabled={loading}
                          >
                            Return Item
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                  </TableBody>
                </Table>

                {/* {!hasRepairItems && selectedBill?.orders?.some(
                  item => item.repairStatus !== "RETURNED"
                ) && (

                <Button
                  fullWidth
                  sx={{ mt: 2 }}
                  variant="contained"
                  color="error"
                  onClick={returnEntireBill}
                  disabled={loading}
                >
                  Return Entire Bill
                </Button>
              )} */}

              </>
            )}

            {/* ================= REPAIR MODE ================= */}
            {actionType === "REPAIR" && (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>
                  Send Items to Repair
                </Typography>

                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="BillTable-th-td">Product</TableCell>
                      <TableCell className="BillTable-th-td">Weight</TableCell>
                      <TableCell className="BillTable-th-td">Action</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                  {console.log("selectedBill",selectedBill)}
                    {selectedBill.orders
                      ?.filter(item => item.repairStatus === "NONE")
                      .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.weight}</TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => openRepairPopup(item)}
                          >
                            Send to Repair
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* <Button
                  fullWidth
                  sx={{ mt: 2 }}
                  variant="contained"
                  color="error"
                  disabled={loading}
                  onClick={repairEntireBill}
                >
                  Repair Entire Bill
                </Button> */}

              </>
            )}
          </>
        )}
      </Box>
    </Modal>

    {/* SEND TO REPAIR POPUP */}
      <Dialog open={openSendDialog} onClose={() => setOpenSendDialog(false)}>
        <DialogTitle>Send Product to Repair</DialogTitle>

        <DialogContent>
          {/* ITEM HEADER */}
          {console.log("selectedProduct",selectedProduct)}
        <div
          style={{
            borderBottom: "2px solid #ddd",
            marginBottom: "12px",
            paddingBottom: "8px"
          }}
        >
          <h3 style={{ margin: 0, color: "#2e7d32" }}>
           Item Name : {selectedProduct?.productName}
          </h3>
        </div>

        {/* ITEM INFO CARD */}
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "15px"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "8px" }}>
            <div><b>Item Weight (g)</b></div>
            <div>{safeFixed(selectedProduct?.weight)}</div>
            
            <div><b>Stone Weight (g)</b></div>
            <div>{safeFixed(selectedProduct?.stoneWeight)}</div>

            <div><b>Net Weight (g)</b></div>
            <div>{safeFixed(selectedProduct?.afterWeight)}</div>

            <div><b>Touch</b></div>
            <div>{safeFixed(selectedProduct?.touch)}</div>          
            
            {/* <div><b>Wastage Type (g)</b></div>
            <div>{selectedProduct?.wastageType || "-"}</div> */}

            <div><b>Wastage Value (g)</b></div>
            <div>{selectedProduct?.wastageValue}</div>

            <div><b>Wastage Pure (g)</b></div>
            <div>{safeFixed(selectedProduct?.wastagePure)}</div>

            <div><b>Final Purity</b></div>
            <div style={{ fontWeight: "bold", color: "#2e7d32" }}>
              {safeFixed(selectedProduct?.finalPurity)}
            </div>
          </div>
        </div>

          {/* GOLDMSITH SELECT */}
          <TextField
            select
            fullWidth
            label="Goldsmith"
            value={selectedGoldsmith}
            onChange={(e) => setSelectedGoldsmith(e.target.value)}
            margin="normal"
          >
            {goldsmiths.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Repair Reason"
            placeholder="Eg. Stone missing / polish / solder break"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            margin="normal"
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenSendDialog(false)}>Cancel</Button>

          {/* disable until filled (optional) */}
          <Button
            variant="contained"
            disabled={!selectedGoldsmith || !reason}
            onClick={handleSend}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* RETURN POPUP */}
      <Dialog open={openReturnDialog} onClose={() => setOpenReturnDialog(false)}>
      <DialogTitle>Confirm Customer Return</DialogTitle>

      <DialogContent>
        {/* <h4 >Item name{" "}:{" "}{selectedProduct?.productName}</h4> */}

        <table style={{ width: "100%", fontSize: '1rem' }}>
          <tbody>
            <tr>
              <td><b>Item name</b></td>
              <td>
                {selectedProduct?.productName}
              </td>
            </tr>
            <tr>
              <td><b>Item Weight (g)</b></td>
              <td>
                {returnQC.itemWeight}
                {/* <TextField
                  size="small"
                  type="number"
                  value={returnQC.itemWeight}
                  onChange={(e) =>
                    setReturnQC({ ...returnQC, itemWeight: e.target.value })
                  }
                /> */}
              </td>
            </tr>

            <tr>
              <td><b>Count</b></td>
              <td>
                {returnQC.count}
                {/* <TextField
                  size="small"
                  type="number"
                  value={returnQC.count}
                  onChange={(e) =>
                    setReturnQC({ ...returnQC, count: e.target.value })
                  }
                /> */}
              </td>
            </tr>

            <tr>
              <td><b>Stone Weight (g)</b></td>
              <td>
                {returnQC.stoneWeight}
                {/* <TextField
                  size="small"
                  type="number"
                  value={returnQC.stoneWeight}
                  onChange={(e) =>
                    setReturnQC({ ...returnQC, stoneWeight: e.target.value })
                  }
                /> */}
              </td>
            </tr>

            <tr>
              <td><b>Net Weight (g)</b></td>
              <td>{returnQC.netWeight}</td>
            </tr>

            <tr>
              <td><b>Touch</b></td>
              <td>{returnQC.touch || "N/A"}</td>
            </tr>

             {/* <tr>
              <td>Actual Purity</td>
              <td><b>{returnQC.actualPurity || "N/A"}</b></td>
            </tr> */}
            <tr>
              <td><b>Wastage Type</b></td>
              <td>{returnQC.wastageType || "-"}</td>
            </tr>
            <tr>
              <td><b>Wastage Value %</b></td>
              <td>
              {returnQC.wastageValue}
                {/* <TextField
                  size="small"
                  type="number"
                  value={returnQC.wastageValue}
                  onChange={(e) =>
                    setReturnQC({ ...returnQC, wastageValue: e.target.value })
                  }
                /> */}
              </td>
            </tr>
            <tr>
              <td><b>Wastage Pure (g)</b></td>
              <td>{returnQC.wastagePure.toFixed(3)}</td>
            </tr>
            <tr>
              <td><b>Final Purity</b></td>
              <td>{returnQC.finalPurity.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>

        <TextField
          fullWidth
          label="Return Reason"
          margin="normal"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpenReturnDialog(false)}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          disabled={!returnReason || loading}
          onClick={confirmReturn}
        >
          Confirm Return
        </Button>
      </DialogActions>
    </Dialog>

    </Box>
  );
};

export default CustomerReturn;
