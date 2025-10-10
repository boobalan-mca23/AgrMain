import React, { forwardRef } from "react";
import { FaCheck } from "react-icons/fa";
import { GrFormSubtract } from "react-icons/gr";
import './jobcardreport.css'

const JobCardRepTable=forwardRef((props,ref)=>{

    const currentPageTotal = props.paginatedData.reduce(
    (acc, job) => {
      acc.givenWt += job.total[0]?.givenTotal;
      acc.itemWt += job.total[0]?.deliveryTotal;
      acc.receive += job.total[0]?.receivedTotal;
      return acc;
    },
    { givenWt: 0, itemWt: 0,receive: 0 } // Initial accumulator
  );
    const totalStoneWt = (deduction) => {
    return deduction.reduce((acc, val) => val.weight + acc, 0);
  };
return(

   <>
        <table ref={ref} className="reportTable">
                  <thead  id="reportHead">
                    <tr className="reportThead">
                      <th >S.No</th>
                      <th >Date</th>
                      <th >Id</th>
                      <th colSpan="4">Given Wt</th>
                      <th colSpan="11">Item Delivery</th>
                      <th colSpan="3">Receive</th>
                      <th>Total</th>
                      <th >Balance</th>
                      {/* <th colSpan="3">ReceiveAmt</th> */}
                
                      <th>Is Finished</th>
                    </tr>
                    <tr className="reportThead">
                      <th colSpan={3}></th>
                      <th>Issue Date</th>
                      <th>Weight</th>
                      <th>Touch</th>
                      <th>Purity</th>
                      <th>DlyDate</th>
                      <th>Itme Name</th>
                      <th>Wt</th>
                      <th>Count</th>
                      <th>tch</th>
                      <th>stoneWt</th>
                      <th>NetWt</th>
                      <th>wastageTyp</th>
                      <th>w.Value</th>
                      <th>w.Pure</th>
                      <th>FinalPurity</th>
                      <th>weight</th>
                      <th>touch</th>
                      <th>purity</th>
                      <th colSpan={4}></th>
                    </tr>
                  </thead>
                  <tbody className="reportTbody">
                    {props.paginatedData.map((job, jobIndex) => {
                      const given = job.givenGold;
                      const deliveries = job.deliveries;
                      const receive = job.received;
                      const maxRows =
                        Math.max(
                          given?.length,
                          deliveries?.length,
                          receive?.length
                        ) || 1;
                      const total = job.total?.[0];

                      return [...Array(maxRows)].map((_, i) => {
                        const g = given?.[i] || {};
                        const d = deliveries?.[i] || {};
                        const r = receive?.[i] || {};

                        return (
                          <tr key={`${job.id}-${i}`}>
                            {i === 0 && (
                              <>
                                <td rowSpan={maxRows} >
                                  { jobIndex + 1}
                                </td>
                                <td rowSpan={maxRows}>
                                  {new Date(job.createdAt).toLocaleDateString(
                                    "en-GB"
                                  )}
                                </td>
                                <td rowSpan={maxRows}>{job.id}</td>
                              </>
                            )}
                            <td>
                              {g?.createdAt
                                ? new Date(g.createdAt).toLocaleDateString(
                                    "en-GB"
                                  )
                                : "-"}
                            </td>
                            <td>{g?.weight || "-"}</td>
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
                          <td>{d?.itemWeight || "0"}</td>
                          <td>{d?.count || "0"}</td>
                          <td>{d?.touch || "0"}</td>

                          <td>
                            {d?.deduction && totalStoneWt(d?.deduction)|| "0"}
                          </td>
                          <td>{d?.netWeight || "0"}</td>
                          <td>{d?.wastageType || "-"}</td>
                          <td>{d?.wastageValue || "0"}</td>
                          <td>{d?.wastagePure||"0"}</td>
                          <td>{d?.finalPurity || "0"}</td>
                          
                          <td>{r?.weight || "0"}</td> 
                          <td>{r?.touch || "0"}</td>
                          <td>{r?.purity || "0"}</td>

                          {i === 0 && (
                            <>
                               <td rowSpan={maxRows}>
                                  {total?.receivedTotal || "-"}
                                </td>
                              <td rowSpan={maxRows}>{total?.jobCardBalance|| "-"}</td>
                               <td rowSpan={maxRows}>
                                  {total?.isFinished === "true" ? <FaCheck /> :<GrFormSubtract size={30}/>}
                                </td>
                            </>
                            )}
                           
                          </tr>
                        );
                      });
                    })}
                  
                  </tbody>
                  <tfoot className="totalOfJobCardReport">
                      <tr className="totalOfJobCardReport" id="reportFoot" >
                      <td colSpan="6">
                        <b>Total</b>
                      </td>
                      <td>
                        <b>{currentPageTotal.givenWt.toFixed(3)}</b>
                      </td>
                      <td colSpan="10"></td>
                      <td>
                        <b>{currentPageTotal.itemWt.toFixed(3)}</b>
                      </td>
                      <td colSpan="2"></td>
                      <td>
                        <b>{currentPageTotal.receive.toFixed(3)}</b>
                      </td>
                      <td colSpan={4}></td>
                    </tr>
                  </tfoot>
                </table>
   </>)
}
)

export default JobCardRepTable