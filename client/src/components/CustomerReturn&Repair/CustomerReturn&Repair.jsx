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
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(false);

  // pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // filters
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // "RETURN" | "REPAIR"
  const [actionType, setActionType] = useState(null); 

  // const [openRepairDialog, setOpenRepairDialog] = useState(false);
  // const [repairReason, setRepairReason] = useState("");
  // const [selectedItem, setSelectedItem] = useState(null);

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


const openRepairPopup = (item) => {
  setSelectedProduct(item);
  setSelectedGoldsmith("");
  setReason("");
  setOpenSendDialog(true);
};


  // ================= FETCH SOLD BILLS =================
  const fetchSoldBills = async () => {
    try {
      const res = await fetch(`${BACKEND_SERVER_URL}/api/bill?status=ACTIVE`);
      const json = await res.json();
      setBills(Array.isArray(json.data) ? json.data : []);
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
  const returnItem = async (item) => {
    if (!window.confirm(`Return ${item.productName}?`)) return;
    console.log("data",item);
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_SERVER_URL}/api/returns/customer-item-return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBill.id,
          productId: item.id,
          orderItemId: item.id,
          reason: "Customer return",
          productName: item.productName,
          weight: item.weight,
          stoneWeight: item.stoneWeight,
          count: item.count,
        }),
      });
      console.log("data",item);
      if (!res.ok) throw new Error();

      toast.success("Item returned successfully");
      setSelectedBill(prev => ({
        ...prev,
        orders: prev.orders.map(o =>
          o.id === item.id
            ? { ...o, repairStatus: "RETURNED" }
            : o
        )
      }));

      setSelectedBill(null);
      fetchSoldBills();
    } catch {
      toast.error("Failed to return item");
    } finally {
      setLoading(false);
    }
  };

  // ================= RETURN ENTIRE BILL =================
  const returnEntireBill = async () => {
    if (!window.confirm(`Return entire Bill #${selectedBill.id}?`)) return;

    const hasRepairItems = selectedBill.orders?.some(
      item => item.repairStatus === "IN_REPAIR"
    );

    if (hasRepairItems) {
      toast.error("Cannot return bill while items are in repair");
      return;
    }


    try {
      setLoading(true);

      
      const res = await fetch(`${BACKEND_SERVER_URL}/api/returns/customer-bill-return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBill.id,
          reason: "Full bill return",
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Entire bill returned");
      setSelectedBill(null);
      fetchSoldBills();
    } catch {
      toast.error("Failed to return bill");
    } finally {
      setLoading(false);
    }
  };

  //sned to repair
const handleSend = async () => {
  try {
    setLoading(true);

    await axios.post(`${BACKEND_SERVER_URL}/api/repair/customer-send`, {
      billId: selectedBill.id,
      orderItemId: selectedProduct.id,
      reason
    });

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
                            onClick={() => returnItem(item)}
                            disabled={loading}
                          >
                            Return Item
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                  </TableBody>
                </Table>

                {!hasRepairItems && selectedBill?.orders?.some(
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
              )}

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
                <Button
                  fullWidth
                  sx={{ mt: 2 }}
                  variant="contained"
                  color="error"
                  disabled={loading}
                  onClick={repairEntireBill}
                >
                  Repair Entire Bill
                </Button>

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
          <p><b>{selectedProduct?.productName}</b></p>

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

          {/* ⭐ REASON INPUT */}
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
    </Box>
  );
};

export default CustomerReturn;
