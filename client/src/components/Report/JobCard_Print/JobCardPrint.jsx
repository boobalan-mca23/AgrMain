
import { FaCheck } from "react-icons/fa";
import { GrFormSubtract } from "react-icons/gr";

const JobCardPrintLayout = (props) => {
  const { fromDate, toDate, goldSmithName, jobCard, totalJobCard, page, rowsPerPage } = props;

  const currentPageTotal = jobCard.reduce(
    (acc, job) => {
      acc.givenWt += job.total[0]?.givenTotal || 0;
      acc.itemWt += job.total[0]?.deliveryTotal || 0;
      acc.receive += job.total[0]?.receivedTotal || 0;
      return acc;
    },
    { givenWt: 0, itemWt: 0, receive: 0 } // Initial accumulator
  );

  const totalStoneWt = (deduction) => {
    return deduction.reduce((acc, val) => val.weight + acc, 0);
  };

  return (
    <>
      <div style={style.jobReportPrint}>
        {props.viewType !== "REPAIR" && (
          <>
            <h3 style={style.jobHead}>Job Card Report</h3>

        <div style={style.jobReportPrintHead}>
          <div style={style.jobReportDetails}>
            <div style={{ display: "flex", gap: "20px" }}>
              <p>From Date: <strong>{fromDate}</strong></p>
              <p>To Date: <strong>{toDate}</strong></p>
            </div>
            <p>GoldSmith Name: <strong>{goldSmithName}</strong></p>
          </div>
          
          {totalJobCard.length > 0 && totalJobCard.at(-1)?.total?.length > 0 ? (
            <div className="jobInfo">
              {totalJobCard.at(-1).total[0].jobCardBalance >= 0 ? (
                <span style={{ color: "green", fontSize: "16px", fontWeight: "bold" }}>
                  Gold Smith Should Give: {totalJobCard.at(-1).total[0].jobCardBalance.toFixed(3)}g
                </span>
              ) : (
                <span style={{ color: "red", fontSize: "16px", fontWeight: "bold" }}>
                  Owner Should Give: {Math.abs(totalJobCard.at(-1).total[0].jobCardBalance).toFixed(3)}g
                </span>
              )}
            </div>
          ) : (
            <div className="jobInfo">
              <span>No Balance</span>
            </div>
          )}
        </div>

        <table style={style.jobReportTable}>
          <thead>
            <tr style={style.jobReportThead}>
              <th rowSpan="2" style={style.jobReportBorder}>S.No</th>
              <th rowSpan="2" style={style.jobReportBorder}>Date</th>
              <th rowSpan="2" style={style.jobReportBorder}>Id</th>
              <th colSpan="4" style={style.jobReportBorder}>Given Wt</th>
              <th colSpan="11" style={style.jobReportBorder}>Item Delivery</th>
              <th colSpan="3" style={style.jobReportBorder}>Receive</th>
              <th rowSpan="2" style={style.jobReportBorder}>Total</th>
              <th rowSpan="2" style={style.jobReportBorder}>Balance</th>
              <th rowSpan="2" style={style.jobReportBorder}>Is Finished</th>
            </tr>
            <tr style={style.jobReportThead}>
              <th style={style.jobReportBorder}>Issue Date</th>
              <th style={style.jobReportBorder}>Weight</th>
              <th style={style.jobReportBorder}>Touch</th>
              <th style={style.jobReportBorder}>Purity</th>
              <th style={style.jobReportBorder}>Due Date</th>
              <th style={style.jobReportBorder}>Item Name</th>
              <th style={style.jobReportBorder}>Wt</th>
              <th style={style.jobReportBorder}>Count</th>
              <th style={style.jobReportBorder}>Touch</th>
              <th style={style.jobReportBorder}>Stone Wt</th>
              <th style={style.jobReportBorder}>Net Wt</th>
              <th style={style.jobReportBorder}>Wastage Type</th>
              <th style={style.jobReportBorder}>W.Value</th>
              <th style={style.jobReportBorder}>W.Pure</th>
              <th style={style.jobReportBorder}>FinalPurity</th>
              <th style={style.jobReportBorder}>Weight</th>
              <th style={style.jobReportBorder}>Touch</th>
              <th style={style.jobReportBorder}>Purity</th>
            </tr>
          </thead>
          <tbody className="reportTbody">
            {jobCard.map((job, jobIndex) => {
              const given = job.givenGold;
              const deliveries = job.deliveries || [];
              const receive = job.received;
              const maxRows = Math.max(given?.length, deliveries?.length, receive?.length) || 1;
              const total = job.total?.[0];

              return [...Array(maxRows)].map((_, i) => {
                const g = given?.[i] || {};
                const d = deliveries?.[i] || {};
                const r = receive?.[i] || {};

                return (
                  <tr key={`${jobIndex}-${i}`}>
                    {i === 0 && (
                      <>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>
                          {jobIndex + 1}
                        </td>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>
                          {new Date(job.createdAt).toLocaleDateString("en-GB")}
                        </td>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>{job.id}</td>
                      </>
                    )}
                    <td style={style.jobReportBorder}>
                      {g?.createdAt ? new Date(g.createdAt).toLocaleDateString("en-GB") : "-"}
                    </td>
                    <td style={style.jobReportBorder}>{g?.weight ? Number(g.weight).toFixed(3) : "-"}</td>
                    <td style={style.jobReportBorder}>{g?.touch ? Number(g.touch).toFixed(3) : "-"}</td>
                    <td style={style.jobReportBorder}>{g?.purity ? Number(g.purity).toFixed(3) : "-"}</td>
                    <td style={style.jobReportBorder}>
                      {d?.createdAt ? new Date(d.createdAt).toLocaleDateString("en-GB") : "-"}
                    </td>
                    <td style={style.jobReportBorder}>{d?.itemName || "-"}</td>
                    <td style={style.jobReportBorder}>{d?.itemWeight ? Number(d.itemWeight).toFixed(3) : "0.000"}</td>
                    <td style={style.jobReportBorder}>{d?.count || "0"}</td>
                    <td style={style.jobReportBorder}>{d?.touch ? Number(d.touch).toFixed(3) : "0.000"}</td>
                    <td style={style.jobReportBorder}>
                      {(d?.stoneWeight !== undefined ? Number(d.stoneWeight).toFixed(3) : (d?.deduction && totalStoneWt(d?.deduction) ? Number(totalStoneWt(d.deduction)).toFixed(3) : "0.000"))}
                    </td>
                    <td style={style.jobReportBorder}>{d?.netWeight ? Number(d.netWeight).toFixed(3) : "0.000"}</td>
                    <td style={style.jobReportBorder}>{d?.wastageType || "-"}</td>
                    <td style={style.jobReportBorder}>{d?.wastageValue ? Number(d.wastageValue).toFixed(3) : "0.000"}</td>
                    <td style={style.jobReportBorder}>{d?.wastagePure ? Number(d.wastagePure).toFixed(3) : "0.000"}</td>
                    <td style={style.jobReportBorder}>{d?.finalPurity ? Number(d.finalPurity).toFixed(3) : "0.000"}</td>

                    <td style={style.jobReportBorder}>{r?.weight ? Number(r.weight).toFixed(3) : "0.000"}</td>
                    <td style={style.jobReportBorder}>{r?.touch ? Number(r.touch).toFixed(3) : "0.000"}</td>
                    <td style={style.jobReportBorder}>{r?.purity ? Number(r.purity).toFixed(3) : "0.000"}</td>

                    {i === 0 && (
                      <>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>
                          {total?.receivedTotal ? Number(total.receivedTotal).toFixed(3) : "-"}
                        </td>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>
                          {total?.jobCardBalance ? Number(total.jobCardBalance).toFixed(3) : "-"}
                        </td>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>
                          {total?.isFinished === "true" ? <FaCheck /> : <GrFormSubtract size={30} />}
                        </td>
                      </>
                    )}
                  </tr>
                );
              });
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="6" style={style.jobReportBorder}>
                <b>Total</b>
              </td>
              <td style={style.jobReportBorder}>
                <b>{currentPageTotal.givenWt.toFixed(3)}</b>
              </td>
              <td colSpan="10" style={style.jobReportBorder}></td>
              <td style={style.jobReportBorder}>
                <b>{currentPageTotal.itemWt.toFixed(3)}</b>
              </td>
              <td colSpan="2" style={style.jobReportBorder}></td>
              <td style={style.jobReportBorder}>
                <b>{currentPageTotal.receive.toFixed(3)}</b>
              </td>
              <td colSpan={3} style={style.jobReportBorder}></td>
            </tr>
          </tfoot>
        </table>
        </>
        )}

        {props.viewType !== "JOBCARD" && props.repairs && props.repairs.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h3 style={{ ...style.jobHead, color: "black", fontSize: "14px", textDecoration: "underline" }}>Repaired Products</h3>
            <table style={style.jobReportTable}>
              <thead>
                <tr style={style.jobReportThead}>
                  <th style={style.jobReportBorder}>S.No</th>
                  <th style={style.jobReportBorder}>Sent Date</th>
                  <th style={style.jobReportBorder}>Item Name</th>
                  <th style={style.jobReportBorder}>Count</th>
                  <th style={style.jobReportBorder}>Gross Wt</th>
                  <th style={style.jobReportBorder}>Stone Wt</th>
                  <th style={style.jobReportBorder}>Net Wt</th>
                  <th style={style.jobReportBorder}>Touch</th>
                  <th style={style.jobReportBorder}>Wast.T</th>
                  <th style={style.jobReportBorder}>Wast.V</th>
                  <th style={style.jobReportBorder}>Act.Pur</th>
                  <th style={style.jobReportBorder}>Fin.Pur</th>
                  <th style={style.jobReportBorder}>Reason</th>
                  <th style={style.jobReportBorder}>Status</th>
                </tr>
              </thead>
              <tbody>
                {props.repairs.map((repair, index) => (
                  <tr key={repair.id}>
                    <td style={style.jobReportBorder}>{index + 1}</td>
                    <td style={style.jobReportBorder}>{new Date(repair.sentDate).toLocaleDateString("en-GB")}</td>
                    <td style={style.jobReportBorder}>{repair.itemName || repair.product?.itemName || repair.itemPurchase?.itemName || "-"}</td>
                    <td style={style.jobReportBorder}>{repair.count || repair.orderItem?.count || repair.product?.count || repair.itemPurchase?.count || "-"}</td>
                    <td style={style.jobReportBorder}>{(Number(repair.grossWeight) || 0).toFixed(3)}</td>
                    <td style={style.jobReportBorder}>{(Number(repair.grossWeight || 0) - Number(repair.netWeight || 0)).toFixed(3)}</td>
                    <td style={style.jobReportBorder}>{(Number(repair.netWeight) || 0).toFixed(3)}</td>
                    <td style={style.jobReportBorder}>{repair.orderItem?.touch || repair.product?.touch || repair.itemPurchase?.touch || "-"}</td>
                    <td style={style.jobReportBorder}>{repair.orderItem?.wastageType || repair.product?.wastageType || repair.itemPurchase?.wastageType || "-"}</td>
                    <td style={style.jobReportBorder}>{repair.orderItem?.wastageValue || repair.product?.wastageValue || repair.itemPurchase?.wastage || "-"}</td>
                    <td style={style.jobReportBorder}>
                      {repair.orderItem?.actualPurity || 
                        ((Number(repair.netWeight) || 0) * 
                         (Number(repair.orderItem?.touch || repair.product?.touch || repair.itemPurchase?.touch) || 0) / 100).toFixed(3)}
                    </td>
                    <td style={style.jobReportBorder}>{(Number(repair.purity) || 0).toFixed(3)}</td>
                    <td style={style.jobReportBorder}>{repair.reason || "-"}</td>
                    <td style={style.jobReportBorder}>{repair.status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

const style = {
  jobHead: {
    textAlign: "center",
    color: "red",
    marginBottom: "10px"
  },
  jobReportPrint: {
    padding: "10px"
  },
  jobReportPrintHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "15px"
  },
  jobReportDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    fontSize: "11px"
  },
  jobReportTable: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
    fontSize: "9px"
  },
  jobReportBorder: {
    border: "1px solid black",
    padding: "2px"
  },
  jobReportThead: {
    backgroundColor: "#f2f2f2"
  }
};

export default JobCardPrintLayout;