import React, { forwardRef } from "react";
import { FaCheck } from "react-icons/fa";
import { GrFormSubtract } from "react-icons/gr";
import './jobcardreport.css'

const JobCardRepTable = forwardRef((props, ref) => {

  const currentPageTotal = props.paginatedData.reduce(
    (acc, job) => {
      acc.givenWt += job.total[0]?.givenTotal;
      acc.itemWt += job.total[0]?.deliveryTotal;
      acc.receive += job.total[0]?.receivedTotal;
      return acc;
    },
    { givenWt: 0, itemWt: 0, receive: 0 } // Initial accumulator
  );
  const totalStoneWt = (deduction) => {
    return deduction.reduce((acc, val) => val.weight + acc, 0);
  };
  return (

    <>
      {props.viewType !== "REPAIR" && (
      <table ref={ref} className="reportTable">
        <thead id="reportHead">
          <tr className="reportThead">
            <th rowSpan="2">S.No</th>
            <th rowSpan="2">Date</th>
            <th rowSpan="2">Id</th>
            <th colSpan="4">Given Wt</th>
            <th colSpan="11">Item Delivery</th>
            <th colSpan="3">Receive</th>
            <th rowSpan="2">Total</th>
            <th rowSpan="2">Balance</th>
            <th rowSpan="2">Is Finished</th>
          </tr>
          <tr className="reportThead">
            <th>Issue Date</th>
            <th>Weight</th>
            <th>Touch</th>
            <th>Purity</th>
            <th>Due Date</th>
            <th>Item Name</th>
            <th>Wt</th>
            <th>Count</th>
            <th>Touch</th>
            <th>Stone Wt</th>
            <th>Net Wt</th>
            <th>Wastage Type</th>
            <th>W.Value</th>
            <th>W.Pure</th>
            <th>Final Purity</th>
            <th>Weight</th>
            <th>Touch</th>
            <th>Purity</th>
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
                        {props.page * props.rowsPerPage + jobIndex + 1}
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
                  <td>{g?.weight ? Number(g.weight).toFixed(3) : "-"}</td>
                  <td>{g?.touch ? Number(g.touch).toFixed(3) : "-"}</td>
                  <td>{g?.purity ? Number(g.purity).toFixed(3) : "-"}</td>
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
                  <td>{d?.itemWeight ? Number(d.itemWeight).toFixed(3) : "0"}</td>
                  <td>{d?.count || "0"}</td>
                  <td>{d?.touch ? Number(d.touch).toFixed(3) : "0"}</td>

                  <td>
                    {(d?.stoneWeight !== undefined ? Number(d.stoneWeight).toFixed(3) : (d?.deduction && totalStoneWt(d?.deduction) ? Number(totalStoneWt(d.deduction)).toFixed(3) : "0"))}
                  </td>
                  <td>{d?.netWeight ? Number(d.netWeight).toFixed(3) : "0"}</td>
                  <td>{d?.wastageType || "-"}</td>
                  <td>{d?.wastageValue ? Number(d.wastageValue).toFixed(3) : "0"}</td>
                  <td>{d?.wastagePure ? Number(d.wastagePure).toFixed(3) : "0"}</td>
                  <td>{d?.finalPurity ? Number(d.finalPurity).toFixed(3) : "0"}</td>

                  <td>{r?.weight ? Number(r.weight).toFixed(3) : "0"}</td>
                  <td>{r?.touch ? Number(r.touch).toFixed(3) : "0"}</td>
                  <td>{r?.purity ? Number(r.purity).toFixed(3) : "0"}</td>

                  {i === 0 && (
                    <>
                      <td rowSpan={maxRows}>
                        {total?.receivedTotal ? Number(total.receivedTotal).toFixed(3) : "-"}
                      </td>
                      <td rowSpan={maxRows}>{Number(total?.jobCardBalance).toFixed(3) || "-"}</td>
                      <td rowSpan={maxRows}>
                        {total?.isFinished === "true" ? <FaCheck /> : <GrFormSubtract size={30} />}
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
      )}

      {props.viewType !== "JOBCARD" && props.paginatedRepairs && props.paginatedRepairs.length > 0 && (
        <div style={{ marginTop: "40px" }} ref={props.repairsRef}>
          <h3 style={{ textAlign: "center", marginBottom: "10px" }}>Repaired Products</h3>
          <table className="reportTable">
            <thead id="reportHead">
              <tr className="reportThead">
                <th>S.No</th>
                <th>Sent Date</th>
                <th>Item Name</th>
                <th>Count</th>
                <th>Gross Wt</th>
                <th>Stone Wt</th>
                <th>Net Wt</th>
                <th>Touch</th>
                <th>wastage Type</th>
                <th>wastage</th>
                <th>actual Purity</th>
                <th>Final Purity</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="reportTbody">
              {props.paginatedRepairs.map((repair, index) => (
                <tr key={repair.id}>
                  <td>{props.page * props.rowsPerPage + index + 1}</td>
                  <td>{new Date(repair.sentDate).toLocaleDateString("en-GB")}</td>
                  <td>{repair.itemName || repair.product?.itemName || repair.itemPurchase?.itemName || "-"}</td>
                  <td>{repair.count || repair.orderItem?.count || repair.product?.count || repair.itemPurchase?.count || "-"}</td>
                  <td>{(Number(repair.grossWeight) || 0).toFixed(3)}</td>
                  <td>{(Number(repair.grossWeight || 0) - Number(repair.netWeight || 0)).toFixed(3)}</td>
                  <td>{(Number(repair.netWeight) || 0).toFixed(3)}</td>
                  <td>{repair.orderItem?.touch || repair.product?.touch || repair.itemPurchase?.touch || "-"}</td>
                  <td>{repair.orderItem?.wastageType || repair.product?.wastageType || repair.itemPurchase?.wastageType || "-"}</td>
                  <td>{repair.orderItem?.wastageValue || repair.product?.wastageValue || repair.itemPurchase?.wastage || "-"}</td>
                  <td>
                    {repair.orderItem?.actualPurity || 
                      ((Number(repair.netWeight) || 0) * 
                       (Number(repair.orderItem?.touch || repair.product?.touch || repair.itemPurchase?.touch) || 0) / 100).toFixed(3) || "-"}
                  </td>
                  <td>{(Number(repair.purity) || 0).toFixed(3)}</td>
                  <td style={{ maxWidth: '250px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{repair.reason || "-"}</td>
                  <td>{repair.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>)
}
)

export default JobCardRepTable
