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
  TablePagination,
  Paper,
  IconButton,
  Divider,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";

import { useParams, useLocation } from "react-router-dom";
import { Add, Visibility } from "@mui/icons-material";
import { FaCheck } from "react-icons/fa";
import { GrFormSubtract } from "react-icons/gr";
import { useState, useEffect } from "react";
import AgrNewJobCard from "./AgrNewJobCard";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./JobCard.css";
function JobCardDetails() {
  const { id, name } = useParams();
  const [jobCards, setJobCards] = useState([]);
  const [jobCardLength, setJobCardLength] = useState(0);
  const [description, setDescription] = useState("");
  const [givenGold, setGivenGold] = useState([
    { touchId:"",weight: "", touch: "", purity: "" },
  ]);
  const [itemDelivery, setItemDelivery] = useState([
    {
      itemName: "",
      itemWeight: "",
      count:"",
      touch: "",
      deduction: [{ type: "", weight: "" }],
      netWeight: "",
      wastageType: "",
      wastageValue: "",
      wastagePure:"",
      finalPurity: "",
    },
  ]);
  const [receivedMetalReturns, setReceivedMetalReturns] = useState([
    { weight: "", touch: "", purity: "" },
  ]);
  const [dropDownItems, setDropDownItems] = useState({
    masterItems: [],
    touchList: [],
    masterWastage:[],
  });
  const [rawGoldStock,setRawGoldStock]=useState([])
  const [jobCardId, setJobCardId] = useState(0);
  const [jobCardIndex, setJobCardIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [edit, setEdit] = useState(false);
  const [page, setPage] = useState(0); // 0-indexed for TablePagination
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const paginatedData = jobCards.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
const currentPageTotal = paginatedData.reduce(
    (acc, job) => {
      acc.givenWt += job.total[0]?.givenTotal;
      acc.itemWt += job.total[0]?.deliveryTotal;
      acc.receive += job.total[0]?.receivedTotal;
      return acc;
    },
    { givenWt: 0, itemWt: 0,receive: 0 } // Initial accumulator
  );
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
  
  const fetchRawGold = async () => {
      try {
        const response = await axios.get(`${BACKEND_SERVER_URL}/api/rawGold`);
        setRawGoldStock(response.data.allRawGold);
        console.log('rawGoldStock',response.data.allRawGold)
      } catch (err) {
        console.log(err);
        alert(err.message);
      }
    };

  const handleCloseJobcard = () => {
    fetchRawGold();
    setDescription("");
    setGivenGold([{ weight: "", touch: "", purity: "" }]);
    setItemDelivery([
      {
      itemName: "",
      itemWeight: "",
      count:"",
      touch: "",
      deduction: [{ type: "", weight: "" }],
      netWeight: "",
      wastageType: "",
      wastageValue: "",
      wastagePure:"",
      finalPurity: "",
    },
    ]);
    setReceivedMetalReturns([]);
    
    setOpen(false);
    setEdit(false);
    console.log('rawGoldStock',rawGoldStock)
  };

  const handleFilterJobCard = (id, index) => {
    setJobCardId(id);
    setJobCardIndex(index);
    let copy = [...jobCards];
    const filteredJobcard = copy.filter((item, _) => item.id === id);

    const deepClone=(obj)=>JSON.parse(JSON.stringify(obj))

    setDescription(deepClone(filteredJobcard[0]?.description || ""));
    setGivenGold(deepClone(filteredJobcard[0]?.givenGold || []));
    setItemDelivery(deepClone(filteredJobcard[0]?.deliveries || []));
    setReceivedMetalReturns(deepClone(filteredJobcard[0]?.received || []));
    setOpeningBalance(deepClone(filteredJobcard[0]?.total[0]?.openingBalance || 0));
    setOpen(true);
    setEdit(true);
  };

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
      setGivenGold([{ weight: "", touch: "", purity: "" }]);
      setDescription("");
      setJobCards(response.data.allJobCards);
        alert('JobCard Created')
    } catch (err) {
       toast.error(err.response.data.error);
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
      receiveSection: receivedMetalReturns,
      total: {
        id: jobCards[jobCardIndex]?.total[0]?.id,
        givenTotal,
        deliveryTotal,
        receivedTotal,
        jobCardBalance,
        openingBalance,
      },
      rawGoldStock
    };
    console.log('payload',payload)
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
      setGivenGold([{ weight: "", touch: "", purity: "" }]);
      setDescription("");
      setItemDelivery([
        {
          itemName: "",
          itemWeight: "",
          count:"",
          touch: "",
          deduction: [{ type: "", weight: "" }],
          netWeight: "",
          wastageType: "",
          wastageValue: "",
          wastagePure:"",
          finalPurity: "",
        },
      ]);
      setReceivedMetalReturns([]);
      setJobCards(response.data.allJobCards);
      console.log('update response',response)
      alert('JobCard Updated')
    } catch (err) {
      console.log(err.response.data.error)
      toast.error(err.response.data.error);
    }
  };
  const totalStoneWt=(deduction)=>{
    return deduction.reduce((acc,val)=>val.weight+acc,0)
  }
  

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
      setDropDownItems((prev) => ({ ...prev, masterItems: res.data }));
    };
    const fetchTouch = async () => {
      try {
        const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-touch`);
        setDropDownItems((prev) => ({ ...prev, touchList: res.data }));
      } catch (err) {
        console.error("Failed to fetch touch values", err);
      }
    };
    const fetchWastageVal = async () => {
        try {
          const res = await axios.get(`${BACKEND_SERVER_URL}/api/master-wastage`);
         console.log("wastage fecth test:",res.data)
         setDropDownItems((prev) => ({ ...prev, masterWastage: res.data }));
        } catch (err) {
          console.error("Failed to fetch touch values", err);
        }
      };
    fetchWastageVal();
    fetchRawGold();
    fetchMasterItems();
    fetchTouch();
    fetchJobCards();
  }, []);

  return (
    <>
     <ToastContainer position="top-right" autoClose={1000} hideProgressBar />
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
          {paginatedData.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="textSecondary">
                No job cards found for this goldsmith
              </Typography>
            </Paper>
          ) : (
            <Paper className="jobCardTableContainer">
              <table className="jobcardTable">
                <thead className="jobCardThead">
                  <tr>
                    <td rowSpan={2}>S.No</td>
                    <td rowSpan={2}>Date</td>
                    <td rowSpan={2}>Id</td>
                    <td colSpan={4}>Given Gold</td>
                    <td colSpan={10}>Itm Delivery</td>
                    <td colSpan={3}>Received</td>
                    <td rowSpan={2}>Total</td>
                    <td rowSpan={2}>Balance</td>
                    <td rowSpan={2}>isFinished</td>
                    <td rowSpan={2}>Action</td>
                  </tr>
                  <tr>
                    <td>ItemDate</td>
                    <td>Wt</td>
                    <td>Touch</td>
                    <td>Purity</td>
                    <td>DlyDate</td>
                    <td>Name</td>
                    <td>Wt</td>
                     <td>count</td>
                    <td>tch</td>
                    <td>stoneWt</td>
                    <td>NetWt</td>
                    {/* <td>wastageTyp</td> */}
                    <td>w.Value</td>
                    <td>w.Pure</td>
                    <td>FinalPurity</td>
                    <td>weight</td>
                    <td>touch</td>
                    <td>purity</td>
                  </tr>
                </thead>
                <tbody className="jobCardTbody">
                  {paginatedData.map((job, jobIndex) => {
                    const given = job.givenGold;
                    const deliveries = job.deliveries;
                    const received = job.received;

                    const maxRows =
                      Math.max(
                        given?.length,
                        deliveries?.length,
                        received?.length
                      ) || 1;

                    return [...Array(maxRows)].map((_, i) => {
                      const g = given?.[i] || {};
                      const d = deliveries?.[i] || {};
                      const r = received?.[i] || {};

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
                              <td rowSpan={maxRows}>{job.id}</td>
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

                          <td>{(g?.weight) || "-"}</td>
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
                          <td>{d?.itemWeight || "-"}</td>
                          <td>{d?.count|| "0"}</td>
                          <td>{d?.touch || "-"}</td>

                          <td>
                            {d?.deduction && totalStoneWt(d?.deduction)}
                          </td>
                          <td>{d?.netWeight || "0"}</td>
                          {/* <td>{d?.wastageType || "-"}</td> */}
                          <td>{d?.wastageValue || "0"}</td>
                          <td>{d?.wastagePure||"0"}</td>
                          <td>{d?.finalPurity || "0"}</td>
                         
                          <td>{r?.weight || "0"}</td>
                          <td>{r?.touch || "0"}</td>
                          <td>{r?.purity||"0"}</td>
                            {i === 0 && (
                            <>
                              <td rowSpan={maxRows}>
                                {total?.receivedTotal || "-"}
                              </td>
                              <td rowSpan={maxRows}>
                                {(total?.jobCardBalance).toFixed(3) ?? "-"}
                              </td>
                            </>
                          )}
                          {i === 0 && (
                            <>
                              
                              <td rowSpan={maxRows}>
                                {total?.isFinished === "true" ? (
                                  <FaCheck />
                                ) : (
                                  <GrFormSubtract size={30} />
                                )}
                              </td>

                              <td rowSpan={maxRows}>
                                <button
                                  className="jobCardBtn"
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
                <tfoot className="totalOfJobCard">
                <tr>
                  <td colSpan={6}>
                    <b>Total</b>
                  </td> 
                  <td>
                    <b> {currentPageTotal.givenWt?.toFixed(3)}</b>
                  </td>
                  <td colSpan={9}></td>
                  <td>
                    <b>{currentPageTotal?.itemWt?.toFixed(3)}</b>
                  </td>
                 
                  <td colSpan={3}></td>
                  <td>
                    <b>{currentPageTotal?.receive?.toFixed(3)}</b>
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
              </table>
             
            </Paper>
          )}
        </Paper>
           {jobCards.length >= 1 && (
            <TablePagination
              component="div"
              count={jobCards.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
            />
          )}
         
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
        rawGoldStock={rawGoldStock}
        setRawGoldStock={setRawGoldStock}
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

     
    </>
  );
}
export default JobCardDetails;

const box = {
  backgroundColor: "red",
};
