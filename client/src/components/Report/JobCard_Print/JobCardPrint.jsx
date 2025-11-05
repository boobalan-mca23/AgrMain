
import { FaCheck } from "react-icons/fa";
import { GrFormSubtract } from "react-icons/gr";

const JobCardPrintLayout = (props) => {
  const { fromDate, toDate, goldSmithName, jobCard, totalJobCard } = props;

  const currentPageTotal = jobCard.reduce(
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
      <h3 style={style.jobHead}>Job Card Report</h3>

      {totalJobCard.length > 0 && totalJobCard.at(-1)?.total?.length > 0 ? (
        <div className="jobInfo">
          {totalJobCard.at(-1).total[0].jobCardBalance >= 0 ? (
            <span style={{ color: "green", fontSize: "20px" }}>
              Gold Smith Should Given{" "}
              {totalJobCard.at(-1).total[0].jobCardBalance.toFixed(3)}g
            </span>
          ) : totalJobCard.at(-1).total[0].jobCardBalance < 0 ? (
            <span style={{ color: "red", fontSize: "20px" }}>
              Owner Should Given{" "}
              {totalJobCard.at(-1).total[0].jobCardBalance.toFixed(3)}g
            </span>
          ) : (
            <span style={{ color: "black", fontSize: "20px" }}>balance 0</span>
          )}
        </div>
      ) : (
        <div className="jobInfo">
          <span>No Balance</span>
        </div>
      )}
      <div style={style.jobReportPrintHead}>
        <p>From Date : {fromDate}</p>
        <p>To Date : {toDate}</p>
        <p>GoldSmith Name :{goldSmithName}</p>
      </div>

      <div >
        <table  style={style.jobReportTable}>
          <thead >
            <tr >
              <th style={style.jobReportBorder}>S.No</th>
              <th style={style.jobReportBorder}>Date</th>
              <th style={style.jobReportBorder}>Id</th>
              <th colSpan="4" style={style.jobReportBorder}>Given Wt</th>
              <th colSpan="11" style={style.jobReportBorder}>Item Delivery</th>
              <th colSpan="3" style={style.jobReportBorder}>Receive</th>
              <th style={style.jobReportBorder}>Total</th>
              <th style={style.jobReportBorder}>Balance</th>
              {/* <th colSpan="3">ReceiveAmt</th> */}

              <th style={style.jobReportBorder}>Is Finished</th>
            </tr>
            <tr className="reportThead">
              <th colSpan={3} style={style.jobReportBorder}></th>
              <th style={style.jobReportBorder}>Issue Date</th>
              <th style={style.jobReportBorder}>Weight</th>
              <th style={style.jobReportBorder}>Touch</th>
              <th style={style.jobReportBorder}>Purity</th>
              <th style={style.jobReportBorder}>DlyDate</th>
              <th style={style.jobReportBorder}>Itme Name</th>
              <th style={style.jobReportBorder}>Wt</th>
              <th style={style.jobReportBorder}>Count</th>
              <th style={style.jobReportBorder}>tch</th>
              <th style={style.jobReportBorder}>stoneWt</th>
              <th style={style.jobReportBorder}>NetWt</th>
              <th style={style.jobReportBorder}>wastageTyp</th>
              <th style={style.jobReportBorder}>w.Value</th>
              <th style={style.jobReportBorder}>w.Pure</th>
              <th style={style.jobReportBorder}>FinalPurity</th>
              <th style={style.jobReportBorder}>weight</th>
              <th style={style.jobReportBorder}>touch</th>
              <th style={style.jobReportBorder}>purity</th>
              <th style={style.jobReportBorder} colSpan={2}></th>
            </tr>
          </thead>
          <tbody className="reportTbody">
            {jobCard.map((job, jobIndex) => {
              const given = job.givenGold;
              const deliveries = job.deliveries;
              const receive = job.received;
              const maxRows =
                Math.max(given?.length, deliveries?.length, receive?.length) ||
                1;
              const total = job.total?.[0];

              return [...Array(maxRows)].map((_, i) => {
                const g = given?.[i] || {};
                const d = deliveries?.[i] || {};
                const r = receive?.[i] || {};

                return (
                  <tr key={`${job.id}-${i}`}>
                    {i === 0 && (
                      <>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>{jobIndex + 1}</td>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>
                          {new Date(job.createdAt).toLocaleDateString("en-GB")}
                        </td>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>{job.id}</td>
                      </>
                    )}
                    <td  style={style.jobReportBorder}>
                      {g?.createdAt
                        ? new Date(g.createdAt).toLocaleDateString("en-GB")
                        : "-"}
                    </td>
                    <td style={style.jobReportBorder}>{g?.weight || "-"}</td>
                    <td style={style.jobReportBorder}>{g?.touch || "-"}</td>
                    <td style={style.jobReportBorder}>{g?.purity || "-"}</td>
                    <td style={style.jobReportBorder}>
                      {d?.createdAt
                        ? new Date(d?.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td style={style.jobReportBorder}>{d?.itemName || "-"}</td>
                    <td style={style.jobReportBorder}>{d?.itemWeight || "0"}</td>
                    <td style={style.jobReportBorder}>{d?.count || "0"}</td>
                    <td style={style.jobReportBorder}>{d?.touch || "0"}</td>

                    <td style={style.jobReportBorder}>
                      {(d?.deduction && totalStoneWt(d?.deduction)) || "0"}
                    </td>
                    <td style={style.jobReportBorder}>{d?.netWeight || "0"}</td>
                    <td style={style.jobReportBorder}>{d?.wastageType || "-"}</td>
                    <td style={style.jobReportBorder}>{d?.wastageValue || "0"}</td>
                    <td style={style.jobReportBorder}>{d?.wastagePure || "0"}</td>
                    <td style={style.jobReportBorder}>{d?.finalPurity || "0"}</td>

                    <td style={style.jobReportBorder}>{r?.weight || "0"}</td>
                    <td style={style.jobReportBorder}>{r?.touch || "0"}</td>
                    <td style={style.jobReportBorder}>{r?.purity || "0"}</td>

                    {i === 0 && (
                      <>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>{total?.receivedTotal || "-"}</td>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>
                          {total?.jobCardBalance || "-"}
                        </td>
                        <td rowSpan={maxRows} style={style.jobReportBorder}>
                          {total?.isFinished === "true" ? (
                            <FaCheck />
                          ) : (
                            <GrFormSubtract size={30} />
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              });
            })}
          </tbody>
          <tfoot >
            <tr >
              <td colSpan="6" style={style.jobReportBorder}>
                <b>Total</b>
              </td>
              <td style={style.jobReportBorder}>
                <b>{currentPageTotal.givenWt.toFixed(3)}</b>
              </td>
              <td colSpan="10" style={style.jobReportBorder}></td>
              <td style={style.jobReportBorder} >
                <b>{currentPageTotal.itemWt.toFixed(3)}</b>
              </td>
              <td colSpan="2" style={style.jobReportBorder}></td>
              <td style={style.jobReportBorder}>
                <b>{currentPageTotal.receive.toFixed(3)}</b>
              </td>
              <td colSpan={2} style={style.jobReportBorder}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
};
const style = {
  jobHead: {
    textAlign: "center",
    color: "red",
  },
  jobReportPrintHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobReportTable: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "center",
    fontSize:"14px",
    margin:"30px"
   
  },
  jobReportBorder: {
    border: "1px solid black",
  },
  
};
export default JobCardPrintLayout;
