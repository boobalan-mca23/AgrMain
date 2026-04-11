import '../customerReport.css'
const CustomerReportPrint=(props)=>{
   const { fromDate,toDate,customerName,billInfo,
    billReceive, billAmount,overAllBalance, page, rowsPerPage}=props
    return(
      <>
        <div>
          <h3 style={style.custHead}>Customer Report</h3>

          <div style={style.custReportPrintHead}> 
             <p>From Date: <strong>{fromDate}</strong></p>
             <p>To Date: <strong>{toDate}</strong></p>
             <p>customer Name: <strong>{customerName}</strong></p>
          </div>

       
          <div >
          {billInfo.length >= 1 ? (
            <table  style={style.customerReportTable}>
              <thead >
                <tr>
                  <th style={style.customerReportBorder}>S.no</th>
                  <th style={style.customerReportBorder}>Bill No</th>
                  <th style={style.customerReportBorder}>Date</th>
                  <th style={style.customerReportBorder}>Bill & Receive</th>
                  <th style={style.customerReportBorder}>Received Amount</th>
                  <th style={style.customerReportBorder}>Bill Amount</th>
                </tr>
              </thead>
              <tbody >
                {billInfo.map((bill, index) => (
                  <tr key={index + 1}>
                    <td style={style.customerReportBorder}>{index + 1}</td>
                     <td style={style.customerReportBorder}>
                       {bill.type === "bill" 
                         ? bill.info.id 
                         : (bill.info.billNo || bill.info.billId || (bill.info.bill && bill.info.bill.id) || "-")}
                     </td>
                     <td style={style.customerReportBorder}>
                       {new Date(bill.info.createdAt || bill.info.sentDate).toLocaleDateString(
                         "en-GB"
                       )}
                     </td>

                    <td style={style.customerReportBorder}>
                      {bill.type === "bill" ? (
                        bill.info.orders.length >= 1 ? (
                          <table style={style.customerReportTable}>
                            <thead >
                              <tr>
                                <th style={style.customerReportBorder}>Entry Type</th>
                                <th style={style.customerReportBorder}>Date</th>
                                <th style={style.customerReportBorder}>ProductName</th>
                                <th style={style.customerReportBorder}>ItemWt</th>
                                <th style={style.customerReportBorder}>StoneWt</th>
                                <th style={style.customerReportBorder}>AWT</th>
                                <th style={style.customerReportBorder}>%</th>
                                <th style={style.customerReportBorder}>FWT</th>
                              </tr>
                            </thead>
                            <tbody >
                              {bill.info.orders.map((item, index) => (
                                <tr key={index + 1}>
                                  <td style={style.customerReportBorder}>{bill.type||""}</td>
                                  <td style={style.customerReportBorder}>
                                    {new Date(
                                      item.createdAt
                                    ).toLocaleDateString("en-GB")}
                                  </td>
                                  <td style={style.customerReportBorder}>{item.productName}</td>
                                  <td style={style.customerReportBorder}>{(Number(item.weight) || 0).toFixed(3)}</td>
                                  <td style={style.customerReportBorder}>{(Number(item.stoneWeight) || 0).toFixed(3)}</td>
                                  <td style={style.customerReportBorder}>{(Number(item.afterWeight) || 0).toFixed(3)}</td>
                                  <td style={style.customerReportBorder}>{(Number(item.percentage) || 0).toFixed(3)}</td>
                                  <td style={style.customerReportBorder}>{(Number(item.finalWeight) || 0).toFixed(3)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p>No orders to this table</p>
                        )
                      ) : bill.type === "repair" || bill.type === "return" ? (
                         <table style={style.customerReportTable}>
                           <thead>
                             <tr>
                               <th style={style.customerReportBorder}>Entry Type</th>
                               <th style={style.customerReportBorder}>Date</th>
                               <th style={style.customerReportBorder}>Item Name</th>
                               <th style={style.customerReportBorder}>Count</th>
                               <th style={style.customerReportBorder}>Gross Wt</th>
                               <th style={style.customerReportBorder}>Stone Wt</th>
                               <th style={style.customerReportBorder}>Net Wt</th>
                               <th style={style.customerReportBorder}>Touch%</th>
                               <th style={style.customerReportBorder}>Pure Wt</th>
                               <th style={style.customerReportBorder}>Status</th>
                             </tr>
                           </thead>
                           <tbody>
                             <tr>
                               <td style={style.customerReportBorder}>{bill.type === "repair" ? "Repair" : "Return"}</td>
                               <td style={style.customerReportBorder}>
                                 {new Date(bill.info.sentDate || bill.info.createdAt).toLocaleDateString("en-GB")}
                               </td>
                               <td style={style.customerReportBorder}>{bill.info.itemName || bill.info.productName}</td>
                               <td style={style.customerReportBorder}>{bill.info.count}</td>
                               <td style={style.customerReportBorder}>
                                 {bill.type === "repair" 
                                   ? (Number(bill.info.grossWeight) || 0).toFixed(3) 
                                   : (Number(bill.info.weight) || 0).toFixed(3)}
                               </td>
                               <td style={style.customerReportBorder}>
                                 {bill.type === "repair"
                                   ? (Number(bill.info.orderItem?.stoneWeight || bill.info.orderItem?.enteredStoneWeight) || 0).toFixed(3)
                                   : (Number(bill.info.stoneWeight || bill.info.enteredStoneWeight) || 0).toFixed(3)}
                               </td>
                               <td style={style.customerReportBorder}>
                                 {bill.type === "repair" 
                                   ? (Number(bill.info.netWeight) || 0).toFixed(3) 
                                   : (Number(bill.info.awt || 0) || Number(bill.info.weight - (bill.info.stoneWeight || 0))).toFixed(3)}
                               </td>
                               <td style={style.customerReportBorder}>
                                 {bill.type === "repair"
                                   ? (Number(bill.info.orderItem?.touch || bill.info.orderItem?.percentage) || 0).toFixed(3)
                                   : (Number(bill.info.touch || bill.info.percentage) || 0).toFixed(3)}
                               </td>
                               <td style={style.customerReportBorder}>
                                 {bill.type === "repair" 
                                   ? (Number(bill.info.fwt || bill.info.purity) || 0).toFixed(3) 
                                   : (Number(bill.info.fwt || bill.info.pureGoldReduction) || 0).toFixed(3)}
                               </td>
                               <td style={style.customerReportBorder}>{bill.type === "repair" ? (bill.info.status || "-") : "-"}</td>
                             </tr>
                           </tbody>
                         </table>
                       ) : (
                         <table style={style.customerReportTable}>
                           <thead>
                             <tr>
                               <th style={style.customerReportBorder}>Entry Type</th>
                               <th style={style.customerReportBorder}>Date</th>
                               <th style={style.customerReportBorder}>Gold Rate</th>
                               <th style={style.customerReportBorder}>Gold</th>
                               <th style={style.customerReportBorder}>Touch</th>
                               <th style={style.customerReportBorder}>Purity</th>
                               <th style={style.customerReportBorder}>Amount</th>
                               <th style={style.customerReportBorder}>Hall Mark</th>
                             </tr>
                           </thead>
                           <tbody style={style.orderTableTbody}>
                             <tr>
                               <td style={style.customerReportBorder}>
                                 {bill.type === "ReceiptVoucher" ? "Receipt Voucher" : (bill.type || "")}
                               </td>
                               <td style={style.customerReportBorder}>
                                 {new Date(bill.info.createdAt).toLocaleDateString("en-GB")}
                               </td>
                               <td style={style.customerReportBorder}>{bill.info.goldRate || "-"}</td>
                               <td style={style.customerReportBorder}>{(Number(bill.info.gold) || 0).toFixed(3)}</td>
                               <td style={style.customerReportBorder}>{(Number(bill.info.touch) || 0).toFixed(3)}</td>
                               <td style={style.customerReportBorder}>{(Number(bill.info.purity) || 0).toFixed(3)}</td>
                               <td style={style.customerReportBorder}>{(Number(bill.info.amount) || 0).toFixed(2)}</td>
                               <td style={style.customerReportBorder}>{bill.info.receiveHallMark || "0"}</td>
                             </tr>
                           </tbody>
                         </table>
                       )}
                    </td>

                     {bill.type === "bill" ? (
                       <>
                         <td style={style.customerReportBorder}>-</td>
                         <td style={style.customerReportBorder}>{(Number(bill.info.billAmount) || 0).toFixed(3)}</td>
                       </>
                     ) : bill.type === "return" ? (
                        <>
                          <td style={style.customerReportBorder}>{(Number(bill.info.weight) || 0).toFixed(3)}</td>
                          <td style={style.customerReportBorder}>-</td>
                        </>
                      ) : (
                       <>
                         <td style={style.customerReportBorder}>
                        {Number(bill.info.purity) > 0 
                          ? (Number(bill.info.purity)).toFixed(3) 
                          : (Number(bill.info.amount) > 0 
                            ? (Number(bill.info.amount)).toFixed(2) 
                            : "0.000")}
                      </td>
                      <td style={style.customerReportBorder}>-</td>
                    </>
                     )}
                  </tr>
                ))}
               
                 <tr  >
                  <td colSpan={4} style={{...style.customerReportBorder, textAlign: 'right'}}><strong>GRAND TOTAL:</strong></td>

                  <td style={style.customerReportBorder}>
                    <strong>
                      {(billReceive).toFixed(3)} gr
                    </strong>{" "}
                  </td>
                  <td style={style.customerReportBorder}>
                    <strong> {(billAmount).toFixed(3)} gr</strong>
                  </td>
                </tr>
               
              </tbody>
            </table>
          ) : (
            <p
              style={{
                textAlign: "center",
                color: "red",
                fontSize: "20px",
                marginTop: "10px",
              }}
            >
              No Bills and Receive Information
            </p>
          )}
        </div>
       

          <div style={style.custBal}>
             <p><strong>Excess Balance : {overAllBalance.balance<0 ?(overAllBalance.balance).toFixed(3):0.000} gr</strong></p>
             <p><strong>Balance: {overAllBalance.balance>=0 ?(overAllBalance.balance).toFixed(3):0.000} gr</strong></p>
          </div>
        </div>
      </>
    
  )
}
const style={
  custHead:{
    textAlign:"center",
    color:"red"
  },
  custReportPrintHead:{
      display:"flex",
      justifyContent:"space-between",
      alignItems:"center"
  },
  customerReportTable:{
    width:"100%",
    borderCollapse:"collapse",
    textAlign:"center",
  
  },
  customerReportBorder:{
    border:"1px solid black",
     padding:"8px"
  },
  custBal:{
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    gap:"30px"
  }

}
export default CustomerReportPrint
