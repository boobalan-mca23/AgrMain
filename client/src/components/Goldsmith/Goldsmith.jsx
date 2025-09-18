
import React, { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  InputAdornment,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";

import DeleteIcon from "@mui/icons-material/Delete";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Goldsmith.css";
import { Link } from "react-router-dom";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import AgrNewJobCard from "./AgrNewJobCard";
import axios from "axios";

const Goldsmith = () => {
  const [goldsmith, setGoldsmith] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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

  const [selectedName, setSelectedName] = useState({});
  const [receivedMetalReturns, setReceivedMetalReturns] = useState([
    { weight: "", touch: "", purity: "" },
  ]);
  const [dropDownItems,setDropDownItems]=useState({masterItems:[],touchList:[],masterWastage:[]})
  const [jobCardError, setJobCardError] = useState({});
  const [jobCardId, setJobCardId] = useState(null);
  const [noJobCard, setNoJobCard] = useState({});
  const [isStock,setIsStock]=useState("")
  const [openingBalance, setOpeningBalance] = useState(0);
  const [rawGoldStock, setRawGoldStock]=useState([])

  const [open,setOpen]=useState(false)
  const [edit, setEdit] = useState(false);
  const [lastJobCard,setLastJobCard]=useState({})

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

  useEffect(() => {
    const fetchGoldsmiths = async () => {
      try {
        const response = await fetch(`${BACKEND_SERVER_URL}/api/goldsmith`);
        const data = await response.json();
        setGoldsmith(data);
      } catch (error) {
        console.error("Error fetching goldsmith data:", error);
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
    fetchGoldsmiths();

  }, []);



  const filteredGoldsmith = goldsmith.filter((gs) => {
    const nameMatch =
      gs.name && gs.name.toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = gs.phone && gs.phone.includes(searchTerm);
    const addressMatch =
      gs.address && gs.address.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || phoneMatch || addressMatch;
  });
const handleCloseJobcard = () => {
    
    fetchRawGold();
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
  const handleSaveStock=async()=>{
    
    const payLoad={
      "jobCardId":jobCardId, // job cardId
      "itemDelivery":itemDelivery,
      "goldSmithId":selectedName.id
    }
    try{
      const response=await axios.post(`${BACKEND_SERVER_URL}/api/assignments/stock`,payLoad)
      
    }catch(err){
       toast.error(err.response.data.error);
    }

  }
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
        id:jobCardId,
        givenTotal,
        deliveryTotal,
        receivedTotal,
        jobCardBalance,
        openingBalance
      },
      
    };
   
    try {
      const response = await axios.put(
        `${BACKEND_SERVER_URL}/api/assignments/${selectedName.id}/${jobCardId}`, // id is GoldSmith and jobCard id
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
     
      toast.success(response.data.message,{autoClose:2000});
    } catch (err) {
      toast.error(err.message);
    }
  };
  const handleJobCardId = (id) => {
    const num = Number(id);
    if (isNaN(num)) {
      setJobCardError({ err: "Please Enter Vaild Input" });
    } else {
      setJobCardError({});
      setJobCardId(num);
    }
  };
  const handleSearch = () => {
      if (!jobCardError.err && !isNaN(jobCardId) && jobCardId !== null) {
        const fetchJobCardById = async () => {
          try {
            const res = await fetch(
              `${BACKEND_SERVER_URL}/api/assignments/${jobCardId}/jobcard`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            const data = await res.json();
            console.log('data',data)
            if (res.status === 404) {
              setOpen(false);
              setEdit(false);
              setNoJobCard({ err: "No Job Card For This Id" });
            } else {
              setDescription(data.jobcard[0].description) 
              setGivenGold(data.jobcard[0].givenGold);
              setItemDelivery(
                data.jobcard[0].deliveries.length >= 1
                  ? data.jobcard[0].deliveries
                  : []
              );
           
              setReceivedMetalReturns(data.jobcard[0].received);
              setSelectedName(data.jobcard[0].goldsmith);
              setOpeningBalance(data.jobcard[0].total[0].openingBalance);
              setLastJobCard(data.lastJobCard)
              setIsStock(data.jobcard[0].stockIsMove)
              setOpen(true);
              setEdit(true);
              setNoJobCard({});
            }
          } catch (err) {
            toast.error(err.message);
          }
        };
        fetchJobCardById();
      }
    };

  return (
      <div className="homeContainer">

     
      <Paper className="customer-details-container" elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" align="center" gutterBottom>
         Goldsmith Details
        </Typography>

        <TextField
          label="Search Goldsmith Name"
          variant="outlined"
          fullWidth
          margin="normal"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "30px",
              width: "18rem",
              backgroundColor: "#f8f9fa",
              "&.Mui-focused": {
                backgroundColor: "#ffffff",
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon style={{ color: "#777" }} />
              </InputAdornment>
            ),
          }}
        />

        <Table>
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
              <TableCell align="center">
                <strong>Goldsmith Name</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Phone Number</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Address</strong>
              </TableCell>
              <TableCell align="center">
                <strong>Actions</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGoldsmith.length > 0 ? (
              filteredGoldsmith.map((goldsmith, index) => (
                <TableRow key={index}>
                  <TableCell align="center">{goldsmith.name}</TableCell>
                  <TableCell align="center">{goldsmith.phone}</TableCell>
                  <TableCell align="center">{goldsmith.address}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Jobcard">
                      <Link
                        to={`/goldsmithcard/${goldsmith.id}/${goldsmith.name}`}
                        state={{
                          phone: goldsmith.phone,
                          address: goldsmith.address,
                        }}
                        style={{ marginRight: "10px", color: "#1976d2" }}
                      >
                        <AssignmentIndOutlinedIcon
                          style={{ cursor: "pointer" }}
                        />
                      </Link>
                    </Tooltip>

                   

                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
               No goldsmith details available...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

     <div className="customer-details-container">
        <Typography variant="h6" gutterBottom>
          Search Job Card
        </Typography>
        <div className="searchBox">
          <div className="inputWithError">
            <TextField
              id="outlined-basic"
              label="JobCard Id"
              onChange={(e) => handleJobCardId(e.target.value)}
              variant="outlined"
              autoComplete="off"
            />
            {jobCardError.err && (
              <p className="errorText">{jobCardError.err}</p>
            )}
            {noJobCard.err && <p className="errorText">{noJobCard.err}</p>}
          </div>

          <Button
            className="searchBtn"
            variant="contained"
            onClick={handleSearch}
            disabled={!!jobCardError.err}
          >
            Search
          </Button>
        </div>
      </div>

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
          rawGoldStock={rawGoldStock}
          setRawGoldStock={setRawGoldStock}
          openingBalance={openingBalance}
          name={selectedName.name}
          edit={edit}
          jobCardId={jobCardId}
          open={open}
          handleCloseJobcard={handleCloseJobcard}
          handleUpdateJobCard={handleUpdateJobCard}
          handleSaveStock={handleSaveStock}
          lastJobCardId={lastJobCard.jobcardId}
          lastIsFinish={lastJobCard.isFinished}
          isStock={isStock}
        />

     


      <ToastContainer position="top-right" autoClose={3000} />
   </div>
  );
};

export default Goldsmith;
