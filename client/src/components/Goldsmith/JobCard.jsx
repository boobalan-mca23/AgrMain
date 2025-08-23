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
import './JobCard.css'
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
  const [receivedMetalReturns, setReceivedMetalReturns] = useState([{ weight: "", touch: "", purity: "" },]);
  const [dropDownItems,setDropDownItems]=useState({masterItems:[],touchList:[]})
  const [jobCardId,setJobCardId]=useState(0)
  const [jobCardIndex,setJobCardIndex]=useState(0)
  const [open, setOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [edit, setEdit] = useState(false);
   
  const handleOpenJobcard = async () => {
    setOpen(true);

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
    setOpen(false);
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
    setReceivedMetalReturns([])
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
     setOpen(true);
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
      setJobCards(response.data.allJobCards)
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
      setItemDelivery( [{
      itemName: "",
      itemWeight: "",
      touch: "",
      deduction: [{ type: "", weight: "" }],
      netWeight: "",
      wastageType: "",
      wastageValue: "",
      finalPurity: "",
    }])
      setReceivedMetalReturns([])
      setJobCards(response.data.allJobCards)
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
      setDropDownItems((prev)=>({...prev,
        masterItems:res.data
      }))
    };
    const fetchTouch = async () => {
      try {
        const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
          setDropDownItems((prev)=>({...prev,
          touchList:res.data
      }))
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
              <table>
                <thead
                className="jobCardThead"
                >
                  <tr>
                    <td rowSpan={2}>S.No</td>
                    <td rowSpan={2}>Date</td>
                    <td rowSpan={2}>Description</td>
                    <td colSpan={4}>Given Gold</td>
                    <td colSpan={9}>Itm Delivery</td>
                    <td rowSpan={2}>Balance</td>
                    <td rowSpan={2}>Actions</td>
                  </tr>
                  <tr>
                    <td>ItemDate</td>
                    <td>Wt</td>
                    <td>Touch</td>
                    <td>Purity</td>
                    <td>DlyDate</td>
                    <td>Itme Name</td>
                    <td>Wt</td>
                    <td>tch</td>
                    <td>
                      Dedecution
                     <td>type</td>
                     <td>weight</td>
                    </td>
                    <td>NetWt</td>
                    <td>wastageTyp</td>
                    <td>wastageValue</td>
                    <td>FinalPurity</td>
                  </tr>
               
                </thead>
                <tbody className="jobCardTbody">
                  {jobCards.map((job, jobIndex) => {
                    const given = job.givenGold;
                    const deliveries=job.deliveries;
                    const received=job.received;

                   
                    const maxRows =
                      Math.max(
                        given?.length,
                        deliveries?.length,
                        received?.length
                        
                      ) || 1;

                    return [...Array(maxRows)].map((_, i) => {
                      const g = given?.[i] ||{};
                      const d = deliveries?.[i] ||{};
                      const r=received?.[i]||{}
                      
                      const total = job.total?.[0];

                      return (
                        <tr key={`${job.id}-${i}`}>
                          {i === 0 && (
                            <>
                              <td rowSpan={maxRows}> {jobIndex + 1}</td>
                              <td rowSpan={maxRows}>
                                {new Date(job.createdAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  }
                                )}
                              </td>
                              <td rowSpan={maxRows}>{job.description}</td>
                            </>
                          )}

                          <td>
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
                          </td>
                         
                          <td>{Number(g?.weight)?.toFixed(3) || "-"}</td>
                          {/* {i === 0 && (
                            <td rowSpan={maxRows}>{total?.givenWt || "-"}</td>
                          )} */}
                          <td>{g?.touch || "-"}</td>
                          <td>{g?.purity || "-"}</td>
                          <td>
                         
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
                          </td>
                          <td>{d?.itemName || "-"}</td>
                          <td>{(d?.itemWeight) || "-"}</td>
                          <td>{d?.touch || "-"}</td>
                        
                          <td>{d?.deduction && d?.deduction.length>=1?d?.deduction.map((ded,dedInd)=>(
                            <tr>
                           <td>{ded.type}</td>
                           <td>{ded.weight}</td>
                          </tr>)):(<>No stone</>)}</td>
                          <td>{d?.netWeight || "-"}</td>
                          <td>{d?.wastageType || "-"}</td>
                          <td>{d?.wastageValue || "-"}</td>
                          <td>{d?.finalPurity || "-"}</td>
                          {i === 0 && (
                            <>
                             <td rowSpan={maxRows}>
                                {(total?.jobCardBalance).toFixed(3) ?? "-"}
                              </td>
                            </>
                          )}
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

                              <td rowSpan={maxRows}>
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
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </Paper>
          )} 
        </Paper>
      </Container>
    
        <AgrNewJobCard
          description={description}
          setDescription={setDescription}
          givenGold={givenGold}
          setGivenGold={setGivenGold}
          itemDelivery={itemDelivery}
          setItemDelivery={setItemDelivery}
          receivedMetalReturns={receivedMetalReturns}
          setReceivedMetalReturns={setReceivedMetalReturns}
          dropDownItems={dropDownItems}
          openingBalance={openingBalance}
          name={name}
          edit={edit}
          jobCardLength={jobCardLength}
          jobCardId={jobCardId}
          open={open}
          handleCloseJobcard={handleCloseJobcard}
          handleSaveJobCard={handleSaveJobCard}
          handleUpdateJobCard={handleUpdateJobCard}
          lastJobCardId={jobCards?.at(-1)?.total[0]?.jobcardId}
          lastIsFinish={jobCards?.at(-1)?.total[0]?.isFinished}
        />
      
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
