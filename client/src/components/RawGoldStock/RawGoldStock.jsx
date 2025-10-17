import React, { useState, useEffect } from "react";
import axios from "axios";
import { TextField, InputAdornment,Box } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./RawGold.css";
import { GiGoldBar } from "react-icons/gi";

const RawGoldStock = () => {
  const [rawGoldStock, setRawGoldStock] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTouch = rawGoldStock.filter((gs) => {
    console.log("touchMatch", gs);
    const touchMatch = gs.touch && gs.touch.toString().includes(searchTerm);

    return touchMatch;
  });
  useEffect(() => {
    const fetchRawGold = async () => {
      try {
        const response = await axios.get(`${BACKEND_SERVER_URL}/api/rawGold`);
        console.log("response.data.allRawGold", response.data.allRawGold);
        setRawGoldStock(response.data.allRawGold);
      } catch (err) {
        console.log(err);
        alert(err.message);
      }
    };
    fetchRawGold();
  }, []);

  return (
    <div className="rawGoldContainer">
      <h2 className="rawgoldhead">Raw Gold Stock</h2>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          paddingLeft: "2rem",
          marginTop: "1rem",
        }}
      >
        <TextField
          label="Search Touch"
          type="number"
          variant="outlined"
          autoComplete="off"
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
      </Box>
      {filteredTouch.length >= 1 ? (
        <div className="rawGoldGrid">
          {filteredTouch.map((item, index) => (
            <div key={index} className="rawGoldCard">
              <div className="rawGoldIcon">
                <GiGoldBar />
              </div>
              <div className="rawGoldContent">
                <h3>Touch {item.touch}</h3>
                <p>
                  <span className="rawGoldWeight">{Number(item.weight).toFixed(3)}</span>{" "}
                  <span className="gr">gr</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="emptyText">No Stock Available</p>
      )}
    </div>
  );
};

export default RawGoldStock;
