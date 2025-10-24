import '../customerReport.css'
const CustomerReportPrint=(props)=>{
   const { fromDate,toDate,customerName,billInfo,
    billReceive, billAmount,overAllBalance}=props
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
                  <th style={style.customerReportBorder}>Bill Id</th>
                  <th style={style.customerReportBorder}>Date</th>
                  <th style={style.customerReportBorder}>Bill&Receive</th>
                  <th style={style.customerReportBorder}>ReceiveAmount</th>
                  <th style={style.customerReportBorder}>BillAmount</th>
                </tr>
              </thead>
              <tbody >
                {billInfo.map((bill, index) => (
                  <tr key={index + 1}>
                    <td style={style.customerReportBorder}>{index + 1}</td>
                    <td style={style.customerReportBorder}>{bill.type==="bill"?bill.info.id:"-"}</td>
                    <td style={style.customerReportBorder}>
                      {new Date(bill.info.createdAt).toLocaleDateString(
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
                                  <td style={style.customerReportBorder}>{item.weight}</td>
                                  <td style={style.customerReportBorder}>{item.stoneWeight}</td>
                                  <td style={style.customerReportBorder}>{item.afterWeight}</td>
                                  <td style={style.customerReportBorder}>{item.percentage}</td>
                                  <td style={style.customerReportBorder}>{item.finalWeight}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p>No orders to this table</p>
                        )
                      ) : (
                        <table style={style.customerReportTable}>
                          <thead >
                            <tr>
                              <th style={style.customerReportBorder}>Entry Type</th>
                              <th style={style.customerReportBorder}>Date</th>
                              <th style={style.customerReportBorder}>goldRate</th>
                              <th style={style.customerReportBorder}>gold</th>
                              <th style={style.customerReportBorder}>touch</th>
                              <th style={style.customerReportBorder}>purity</th>
                              <th style={style.customerReportBorder}>amount</th>
                              <th style={style.customerReportBorder}>hallMark</th>
                            </tr>
                          </thead>
                          <tbody >
                            <tr key={index+1}>
                              <td style={style.customerReportBorder}>{bill.type||""}</td>
                              <td style={style.customerReportBorder}>
                                {new Date(
                                  bill.info.createdAt
                                ).toLocaleDateString("en-GB")}
                              </td>
                              <td style={style.customerReportBorder}>{bill.info.goldRate}</td>
                              <td style={style.customerReportBorder}>{bill.info.gold}</td>
                              <td style={style.customerReportBorder}>{bill.info.touch}</td>
                              <td style={style.customerReportBorder}>{bill.info.purity}</td>
                              <td style={style.customerReportBorder}>{bill.info.amount}</td>
                              <td style={style.customerReportBorder}>{bill.info.receiveHallMark||0}</td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </td>

                    {bill.type === "bill" ? (
                      <>
                        <td style={style.customerReportBorder}>-</td>
                        <td style={style.customerReportBorder}>{bill.info.billAmount}</td>
                      </>
                    ) : (
                      <>
                        <td style={style.customerReportBorder}>{bill.info.purity}</td>
                        <td style={style.customerReportBorder}>-</td>
                      </>
                    )}
                  </tr>
                ))}
               
                 <tr  >
                  <td colSpan={4} style={style.customerReportBorder}></td>

                  <td style={style.customerReportBorder}>
                    <strong>
                      Total Receive :{(billReceive).toFixed(3)} gr
                    </strong>{" "}
                  </td>
                  <td style={style.customerReportBorder}>
                    <strong> Total Bill :{(billAmount).toFixed(3)} gr</strong>
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
             <p><strong>Excess Balance : {overAllBalance<0 ?(overAllBalance).toFixed(3):0.000} gr</strong></p>
             <p><strong>Balance: {overAllBalance>=0 ?(overAllBalance).toFixed(3):0.000} gr</strong></p>
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