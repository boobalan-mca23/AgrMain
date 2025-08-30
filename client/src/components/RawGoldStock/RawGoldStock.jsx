import React, { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import "./RawGold.css";
import { GiGoldBar } from "react-icons/gi";


const RawGoldStock = () => {
  const [rawGoldStock, setRawGoldStock] = useState([]);

  useEffect(() => {
    const fetchRawGold = async () => {
      try {
        const response = await axios.get(`${BACKEND_SERVER_URL}/api/rawGold`);
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

      {rawGoldStock.length >= 1 ? (
        <div className="rawGoldGrid">
          {rawGoldStock.map((item, index) => (
            <div key={index} className="rawGoldCard">
              <div className="rawGoldIcon">
               <GiGoldBar />
              </div>
              <div className="rawGoldContent">
                <h3>Touch {item.touch}</h3>
                <p>
                  <span className="rawGoldWeight">{item.weight}</span>{" "}
                
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
