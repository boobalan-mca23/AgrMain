
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  Dialog,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  IconButton,
  Divider,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Add, Visibility } from "@mui/icons-material";
import NewJobCard from "../Goldsmith/Newjobcard";
import { BACKEND_SERVER_URL } from "../../Config/Config";

const GoldsmithDetails = () => {
  const { id, name } = useParams();
  const location = useLocation();
  const [error, setError] = useState(null);
  const { phone, address } = location.state || {};

  const [openJobcardDialog, setOpenJobcardDialog] = useState(false);
  const [jobcards, setJobcards] = useState([]);
  const [totalRecords, setTotalRecords] = useState([]);
  const [selectedJobcard, setSelectedJobcard] = useState(null);
  const [loadingJobcards, setLoadingJobcards] = useState(true);

  const fetchJobcards = useCallback(async () => {
    try {
      setLoadingJobcards(true);
      const res = await fetch(
        `${BACKEND_SERVER_URL}/api/assignments/goldsmith/${id}`
      );
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      console.log("Fetched jobcard data:", data);

      if (data.success) {
        const sortedJobcards = [...(data.jobcards || [])].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        const sortedTotalRecords = [...(data.totalRecords || [])].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setJobcards(sortedJobcards);
        setTotalRecords(sortedTotalRecords);
      } else {
        setJobcards([]);
        setTotalRecords([]);
      }
      setLoadingJobcards(false);
    } catch (err) {
      console.error("Error fetching jobcards:", err);
      setJobcards([]);
      setTotalRecords([]);
      setLoadingJobcards(false);
      setError("Failed to fetch job cards. Please try again.");
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchJobcards();
  }, [id, fetchJobcards]);

  const handleCreateJobcard = () => {
    setSelectedJobcard(null);
    setOpenJobcardDialog(true);
  };

  const handleEditJobcard = (jobcard) => {
    const enhancedJobcard = {
      ...jobcard,
      deliveries: (jobcard.deliveries || []).map((delivery) => ({
        ...delivery,
        finalPurity: delivery.finalPurity || calculateFinalPurity(delivery),
      })),
      receivedMetalReturns: (jobcard.received || []).map((receivedItem) => ({
        ...receivedItem,
        weight: receivedItem.weight || 0,
        touch: receivedItem.touch || 0,
        purity: receivedItem.purity || 0,
        date: receivedItem.date || new Date().toISOString(),
        description: receivedItem.description || "",
      })),
    };
    setSelectedJobcard(enhancedJobcard);
    setOpenJobcardDialog(true);
  };

  const calculateFinalPurity = (delivery) => {
    const itemWeight = parseFloat(delivery.itemWeight || 0);
    const stoneWeight = parseFloat(delivery.stoneWeight || 0);
    const wastageValue = parseFloat(delivery.wastageValue || 0);
    const netWeight = itemWeight - stoneWeight;

    if (delivery.wastageType === "Touch") {
      return (netWeight * wastageValue) / 100;
    } else if (delivery.wastageType === "%") {
      return netWeight + (netWeight * wastageValue) / 100;
    } else if (delivery.wastageType === "+") {
      return netWeight + wastageValue;
    }
    return 0;
  };

  const handleSaveJobcard = () => {
    fetchJobcards();
    setOpenJobcardDialog(false);
  };

  const handleCloseJobcard = () => {
    setOpenJobcardDialog(false);
    setSelectedJobcard(null);
  };

  const getJobcardBalance = (jobcard) => {
    const givenPurity = jobcard.purity || 0;
    let deliveredPurity = 0;
    let receivedPurityFromGoldsmith = 0;

    if (jobcard.deliveries && jobcard.deliveries.length > 0) {
      jobcard.deliveries.forEach((delivery) => {
        deliveredPurity += delivery.finalPurity || 0;
      });
    }

    if (jobcard.received && Array.isArray(jobcard.received)) {
      jobcard.received.forEach((received) => {
        receivedPurityFromGoldsmith += received.purity || 0;
      });
    }

    const totalGivenToGoldsmith = givenPurity;
    const totalReceivedFromGoldsmith =
      deliveredPurity + receivedPurityFromGoldsmith;
    return totalGivenToGoldsmith - totalReceivedFromGoldsmith;
  };

  const getJobcardBalanceStatus = (jobcard) => {
    const balance = getJobcardBalance(jobcard);
    if (balance > 0) return "Goldsmith";
    if (balance < 0) return "Owner";
    return "Settled";
  };

  const getJobcardNumericalBalance = (jobcard) => {
    return Math.abs(getJobcardBalance(jobcard)).toFixed(3);
  };

  const calculateNetWeight = (delivery) => {
    const itemWeight = delivery.itemWeight || 0;
    const stoneWeight = delivery.stoneWeight || 0;
    return (itemWeight - stoneWeight).toFixed(3);
  };

  const getTotalRecordForJobcard = (jobcard, index) => {
    return totalRecords[index];
  };

  const calculateRunningBalance = (jobcard, index) => {
    const totalRecord = getTotalRecordForJobcard(jobcard, index);
    return totalRecord?.totalBalance || 0;
  };

  return (
    <Container maxWidth="xxl" sx={{ py: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error: {error}
        </Alert>
      )}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: "bold", textAlign: "center" }}
        >
          Goldsmith Details
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            mb: 3,
          }}
        >
          <div>
            <Box sx={{ pl: 2 }}>
              <Typography>
                <b>Name:</b> {name}
              </Typography>
            </Box>
          </div>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            Job Card Records
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleCreateJobcard}
          >
            New Job Card
          </Button>
        </Box>

        {loadingJobcards ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : jobcards.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="textSecondary">
              No job cards found for this goldsmith
            </Typography>
          </Paper>
        ) : (
          <Paper elevation={2} sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 1500 }}>
              <TableHead
                sx={{
                  backgroundColor: "#e3f2fd",
                  "& th": {
                    backgroundColor: "#e3f2fd",
                    color: "#0d47a1",
                    fontWeight: "bold",
                    fontSize: "1rem",
                  },
                }}
              >
                <TableRow>
                  <TableCell rowSpan={2}>S.No</TableCell>
                  <TableCell rowSpan={2}>Date</TableCell>
                  <TableCell rowSpan={2}>Description</TableCell>
                  <TableCell colSpan={3}>Given Gold</TableCell>
                  <TableCell rowSpan={2}>OB</TableCell>
                  <TableCell rowSpan={2}>TB</TableCell>
                  <TableCell colSpan={2}>Item Delivery</TableCell>
                  <TableCell rowSpan={2}>Stone WT</TableCell>
                  <TableCell rowSpan={2}>Wastage</TableCell>
                  <TableCell rowSpan={2}>Net WT</TableCell>
                  <TableCell rowSpan={2}>Final Purity</TableCell>
                  <TableCell colSpan={3}>Received Gold</TableCell>
                  <TableCell rowSpan={2}>Balance Owed By</TableCell>
                  <TableCell rowSpan={2}>Balance</TableCell>
                  <TableCell rowSpan={2}>Actions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Weight</TableCell>
                  <TableCell>Touch</TableCell>
                  <TableCell>Purity</TableCell>
                  <TableCell>Item Name</TableCell>
                  <TableCell>Item Weight</TableCell>
                  <TableCell>Weight</TableCell>
                  <TableCell>Touch</TableCell>
                  <TableCell>Purity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobcards.map((jobcard, index) => {
                  const deliveries = jobcard.deliveries || [];
                  const received = jobcard.received || [];
                  const maxRows = Math.max(
                    deliveries.length,
                    received.length,
                    1
                  );
                  const totalRecord = getTotalRecordForJobcard(jobcard, index);
                  const runningBalance = calculateRunningBalance(
                    jobcard,
                    index
                  );
                  const jobcardBalanceStatus = getJobcardBalanceStatus(jobcard);
                  const jobcardNumericalBalance =
                    getJobcardNumericalBalance(jobcard);

                  return [...Array(maxRows)].map((_, i) => (
                    <TableRow key={`jobcard-${jobcard.id}-row-${i}`}>
                      {i === 0 && (
                        <>
                          <TableCell align="center" rowSpan={maxRows}>
                            {index + 1}
                          </TableCell>
                          <TableCell align="center" rowSpan={maxRows}>
                            {new Date(jobcard.createdAt).toLocaleDateString(
                              "en-IN"
                            )}
                          </TableCell>
                          <TableCell align="center" rowSpan={maxRows}>
                            {jobcard.description || "-"}
                          </TableCell>
                          <TableCell align="center" rowSpan={maxRows}>
                            {jobcard.weight ?? "-"}
                          </TableCell>
                          <TableCell align="center" rowSpan={maxRows}>
                            {jobcard.touch ?? "-"}
                          </TableCell>
                          <TableCell align="center" rowSpan={maxRows}>
                            {jobcard.purity?.toFixed(3) ?? "-"}
                          </TableCell>
                          <TableCell align="center" rowSpan={maxRows}>
                            {totalRecord?.openingBalance?.toFixed(3) || "0.000"}
                          </TableCell>
                          <TableCell align="center" rowSpan={maxRows}>
                            {runningBalance.toFixed(3)}
                          </TableCell>
                        </>
                      )}
                      {deliveries[i] ? (
                        <>
                          <TableCell align="center">
                            {deliveries[i].itemName}
                          </TableCell>
                          <TableCell align="center">
                            {deliveries[i].itemWeight?.toFixed(3) || "-"}
                          </TableCell>
                          <TableCell align="center">
                            {deliveries[i].stoneWeight?.toFixed(3) || "-"}
                          </TableCell>
                          <TableCell align="center">
                            {deliveries[i].wastageValue?.toFixed(3) || "-"}
                          </TableCell>
                          <TableCell align="center">
                            {calculateNetWeight(deliveries[i])}
                          </TableCell>
                          <TableCell align="center">
                            {deliveries[i].finalPurity?.toFixed(3) || "0.000"}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell align="center">-</TableCell>
                          <TableCell align="center">-</TableCell>
                          <TableCell align="center">-</TableCell>
                          <TableCell align="center">-</TableCell>
                          <TableCell align="center">-</TableCell>
                          <TableCell align="center">-</TableCell>
                        </>
                      )}
                      {received[i] ? (
                        <>
                          <TableCell align="center">
                            {received[i].weight?.toFixed(3) || "-"}
                          </TableCell>
                          <TableCell align="center">
                            {received[i].touch?.toFixed(3) || "-"}
                          </TableCell>
                          <TableCell align="center">
                            {received[i].purity?.toFixed(3) || "-"}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell align="center">-</TableCell>
                          <TableCell align="center">-</TableCell>
                          <TableCell align="center">-</TableCell>
                        </>
                      )}
                      {i === 0 && (
                        <>
                          <TableCell align="center" rowSpan={maxRows}>
                            {jobcardBalanceStatus}
                          </TableCell>
                          <TableCell align="center" rowSpan={maxRows}>
                            {jobcardNumericalBalance}
                          </TableCell>
                          <TableCell align="center" rowSpan={maxRows}>
                            <IconButton
                              onClick={() => handleEditJobcard(jobcard)}
                            >
                              <Visibility color="primary" />
                            </IconButton>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </Paper>
        )}
      </Paper>

      <Dialog
        open={openJobcardDialog}
        onClose={handleCloseJobcard}
        fullWidth
        maxWidth="xl"
        scroll="paper"
      >
        <NewJobCard
          onClose={handleCloseJobcard}
          onSave={handleSaveJobcard}
          initialData={selectedJobcard}
          artisanId={parseInt(id)}
          goldsmithName={name}
        />
      </Dialog>
    </Container>
  );
};

export default GoldsmithDetails;







