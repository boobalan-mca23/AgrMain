
import React from "react"
import { useState,useEffect } from "react"
import axios from 'axios'
import { BACKEND_SERVER_URL } from "../../Config/Config";
import './RawGold.css'
const RawGoldStock=()=>{
    const [rawGoldStock,setRawGoldStock]=useState([])

    useEffect(()=>{
       const fetchRawGold=async()=>{
        try{
          const response=await axios.get(`${BACKEND_SERVER_URL}/api/rawGold`)
          
          setRawGoldStock(response.data.allRawGold)
        }catch(err){
          console.log(err)
          alert(err.message)
        }

       }
       fetchRawGold()
    },[])
    return (
        <>
          <div>
               <div>
                  <h4 className="rawgoldhead">RawGold Stock Information</h4>
               </div>
               <div>
                  {
                    rawGoldStock.length>=1 ? (
                    <div className="rawGoldGrid">
                      {
                        rawGoldStock.map((item,index)=>(
                         <div key={index} className="rawGold">
                            
                            <p>{index+1}) Touch {item.touch}</p>
                            <p>Total Raw Gold : {item.weight}  <span className="gr">gr</span></p>
                        </div>
                        ))
                      }
                    </div>
                    ):(<>No Stock</>)
                       
                    
                  }
               </div>
          </div>
        </>
    )
}
export default RawGoldStock