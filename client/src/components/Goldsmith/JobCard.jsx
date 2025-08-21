import {
  Container,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
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
import { useParams, useLocation } from "react-router-dom";
import { Add, Visibility } from "@mui/icons-material";
import { useState, useEffect } from "react";
import AgrNewJobCard from "./AgrNewJobCard";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { ToastContainer, toast } from "react-toastify";

function JobCardDetails() {
  const { id, name } = useParams();
  const [jobCards, setJobCards] = useState([]);
  const [jobCardLength, setJobCardLength] = useState(0);
  const [description, setDescription] = useState("");
  const [givenGold, setGivenGold] = useState([
    { weight: "", touch: "", purity: "" },
  ]);

  const [itemDelivery, setItemDelivery] = useState([
    {
      itemName: "",
      itemWeight: "",
      touch: "",
      deduction: [{ type: "", weight: "" }],
      netWeight: "",
      wastageType: "",
      wastageValue: "",
      finalPurity: "",
    },
  ]);


  const [receivedMetalReturns, setReceivedMetalReturns] = useState([
    { weight: "", touch: "", purity: "" },
  ]);
  const [masterItems, setMasterItems] = useState([]);
  const [touchList, setTouchList] = useState([]);
  const [jobCardId,setJobCardId]=useState(0)
  const [jobCardIndex,setJobCardIndex]=useState(0)
  const [openJobcardDialog, setOpenJobcardDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [edit, setEdit] = useState(false);
 
  const handleOpenJobcard = async () => {
    setOpenJobcardDialog(true);

    try {
      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/assignments/${id}/lastBalance` // this id is GoldSmithId
      );
      console.log("res of openBalance", res);
      res.data.status === "nobalance"
        ? setOpeningBalance(res.data.balance)
        : setOpeningBalance(res.data.balance);
    } catch (err) {
      alert(err.message);
      toast.error("Something went wrong.");
    }
  };
  const handleCloseJobcard = () => {
    setOpenJobcardDialog(false);
    setEdit(false)
    setDescription("")
    setGivenGold([{ weight: "", touch: "", purity: "" }])
    setItemDelivery([{
      itemName: "",
      ItemWeight: "",
      Touch: "",
      deduction: [{ type: "", weight: "" }], 
      netwt: "",
      wastageType: "",
      wastageValue: "",
      finalPurity: "",
    },])
    setReceivedMetalReturns([ { weight: "", touch: "", purity: "" }])
  };


const handleFilterJobCard=(id,index)=>{
    setJobCardId(id);
    setJobCardIndex(index); 
    let copy=[...jobCards] 
    const filteredJobcard = copy.filter((item, _) => item.id === id);
    setDescription( JSON.parse(JSON.stringify(filteredJobcard[0]?.description||"")))
    setGivenGold(
      JSON.parse(JSON.stringify(filteredJobcard[0]?.givenGold || []))
    );
    setItemDelivery(
      JSON.parse(JSON.stringify(filteredJobcard[0]?.deliveries || []))
    );
     setReceivedMetalReturns(
      JSON.parse(JSON.stringify(filteredJobcard[0]?.received || []))
    );
     setOpeningBalance(JSON.parse(JSON.stringify(filteredJobcard[0]?.total[0]?.openingBalance || 0)))
     setOpenJobcardDialog(true);
     setEdit(true);
}



  // save jobCard Api
  const handleSaveJobCard = async (
    givenTotal,
    jobCardBalance,
    openingBalance
  ) => {
    const payload = {
      goldSmithId: id,
      description: description,
      givenGold: givenGold,
      total: {
        givenTotal: givenTotal,
        jobCardBalance: jobCardBalance,
        openingBalance: openingBalance,
      },
    };
    try {
      const response = await axios.post(
        `${BACKEND_SERVER_URL}/api/assignments/create`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      handleCloseJobcard();
      setGivenGold([{ weight: "", touch: "", purity: "" }])
      setDescription("")
      toast.success(response.data.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

   const handleUpdateJobCard = async (
    givenTotal,
    deliveryTotal,
    receivedTotal,
    jobCardBalance,
    openingBalance
  ) => {
    const payload = {
      description,
      givenGold,
      itemDelivery,
      receiveSection:receivedMetalReturns,
      total: {
        id:jobCards[jobCardIndex]?.total[0]?.id,
        givenTotal,
        deliveryTotal,
        receivedTotal,
        jobCardBalance,
        openingBalance
      },
    };
    try {
      const response = await axios.put(
        `${BACKEND_SERVER_URL}/api/assignments/${id}/${jobCardId}`, // id is GoldSmith and jobCard id
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      handleCloseJobcard();
      setGivenGold([{ weight: "", touch: "", purity: "" }])
      setDescription("")
      toast.success(response.data.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    const fetchJobCards = async () => {
      try {
        const res = await axios.get(
          `${BACKEND_SERVER_URL}/api/assignments/${id}` // this is GoldSmith Id from useParams
        );

        setJobCards(res.data.jobCards);
        console.log("res", res.data.jobCards);
        setJobCardLength(res.data.jobCardLength);
      } catch (err) {
        alert(err.message);
        toast.error("Something went wrong.");
      }
    };
    const fetchMasterItems = async () => {
      const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-items/`);
      setMasterItems(res.data);
    };
    const fetchTouch = async () => {
      try {
        const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
        setTouchList(res.data);
      } catch (err) {
        console.error("Failed to fetch touch values", err);
      }
    };

    fetchMasterItems();
    fetchTouch();
    fetchJobCards();
  }, []);

  return (
    <>
      <Container maxWidth="xxl" sx={{ py: 3 }}>
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
              onClick={handleOpenJobcard}
            >
              New Job Card
            </Button>
          </Box>
          {jobCards.length === 0 ? (
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
                    <TableCell colSpan={4}>Given Gold</TableCell>
                    <TableCell rowSpan={2}>Actions</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>ItemDate</TableCell>
                    <TableCell>Weight</TableCell>
                    <TableCell>Touch</TableCell>
                    <TableCell>Purity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobCards.map((job, jobIndex) => {
                    const given = job.givenGold;
                   
                    const maxRows =
                      Math.max(
                        given?.length,
                        
                      ) || 1;

                    return [...Array(maxRows)].map((_, i) => {
                      const g = given?.[i] || {};
                      
                      const total = job.total?.[0];

                      return (
                        <TableRow key={`${job.id}-${i}`}>
                          {i === 0 && (
                            <>
                              <TableCell rowSpan={maxRows}> {jobIndex + 1}</TableCell>
                              <TableCell rowSpan={maxRows}>
                                {new Date(job.createdAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )}
                              </TableCell>
                              <TableCell rowSpan={maxRows}>{job.description}</TableCell>
                            </>
                          )}

                          <TableCell>
                            {g?.createdAt
                              ? new Date(g?.createdAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )
                              : "-"}
                          </TableCell>
                         
                          <TableCell>{Number(g?.weight)?.toFixed(3) || "-"}</TableCell>
                          {/* {i === 0 && (
                            <td rowSpan={maxRows}>{total?.givenWt || "-"}</td>
                          )} */}
                          <TableCell>{g?.touch || "-"}</TableCell>
                          <TableCell>{g?.purity || "-"}</TableCell>
                          {/* <td>
                            {" "}
                            {d?.createdAt
                              ? new Date(d?.createdAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )
                              : "-"}
                          </td> */}
                          {/* <td>{d?.itemName || "-"}</td>
                          <td>{d?.sealName || "-"}</td>
                          <td>{Number(d?.weight)?.toFixed(3) || "-"}</td> */}

                          {/* {i === 0 && (
                            <>
                              <td rowSpan={maxRows}>
                                {(total?.stoneWt).toFixed(3) ?? "-"}
                              </td>
                              <td rowSpan={maxRows}>
                                {(total?.wastage).toFixed(3) ?? "-"}
                              </td>
                              <td rowSpan={maxRows}>
                                {(total?.balance).toFixed(3) ?? "-"}
                              </td>
                            </>
                          )} */}
                          {/* <td>{r?.weight || "-"}</td>
                          <td>{r?.touch || "-"}</td> */}

                          {i === 0 && (
                            <>
                              {/* <td rowSpan={maxRows}>
                                {total?.receivedTotal || "-"}
                              </td> */}
                              {/* <td rowSpan={maxRows}>
                                {total?.isFinished === "true" ? (
                                  <FaCheck />
                                ) : (
                                  <GrFormSubtract size={30} />
                                )}
                              </td> */}

                              <TableCell rowSpan={maxRows}>
                                <button
                                  style={{
                                    color: "white",
                                    backgroundColor: "green",
                                    fontSize: "18px",
                                  }}
                                  onClick={() =>
                                    handleFilterJobCard(job.id, jobIndex)
                                  }
                                >
                                  View
                                </button>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    });
                  })}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Paper>
      </Container>
      <Dialog
        open={openJobcardDialog}
        onClose={handleCloseJobcard}
        fullWidth
        maxWidth="md"
      >
        <AgrNewJobCard
          description={description}
          setDescription={setDescription}
          givenGold={givenGold}
          setGivenGold={setGivenGold}
          itemDelivery={itemDelivery}
          setItemDelivery={setItemDelivery}
          receivedMetalReturns={receivedMetalReturns}
          setReceivedMetalReturns={setReceivedMetalReturns}
          masterItems={masterItems}
          setMasterItems={setMasterItems}
          touchList={touchList}
          setTouchList={setTouchList}
          openingBalance={openingBalance}
          name={name}
          edit={edit}
          jobCardLength={jobCardLength}
          jobCardId={jobCardId}
          handleCloseJobcard={handleCloseJobcard}
          handleSaveJobCard={handleSaveJobCard}
          handleUpdateJobCard={handleUpdateJobCard}
        />
      </Dialog>
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
    </>
  );
}
export default JobCardDetails;

const box = {
  backgroundColor: "red",
};
