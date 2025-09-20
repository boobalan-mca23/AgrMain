import React from "react";

const PrintJobCard = React.forwardRef((props, ref) => {
  const {
    jobId,
    name,
    date,
    time,
    description,
    givenGold,
    totalGivenPure,
    openingBalance,
    totalGivenToGoldsmith,
    deliveries,
    totalDelivery,
    received,
    totalReceive,
    jobCardBalance

  } = props;
  return (
    <>
     
        <div style={styles.jobPrintMain}>


          <div style={styles.title}>
            <p>Job Card of AGR</p>
          </div>
          <div style={styles.jobheaderFlex}>
            <p>ID:{jobId}</p>
            <p>Name:{name}</p>
            <p>Date:{date}</p>
            <p>Time:{time}</p>
          </div>
          <div>
            <span><strong  style={styles.subTitle}>Description</strong>:{description}</span>
          </div>

          <div >
            <span style={styles.subTitle}  ><strong>Given Details</strong>:</span>
            <div style={styles.goldSection}>
              {givenGold.map((item, index) => (
                <div style={styles.goldFlex}>
                  <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                    {index + 1})
                  </span>
                  <div style={styles.goldBox}>{item.weight}</div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>X</div>
                  <div style={styles.goldBox}>{item.touch}</div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>=</div>
                  <div style={styles.goldBox}>{item.purity}</div>
                </div>
              ))}
            </div>
            <div style={styles.totalpuritycontainer}>
              <span style={styles.totalpuritylabel}>Total Purity:</span>
              <span>{totalGivenPure}</span>
            </div>
          </div>

          <div style={styles.balance}>
            <span >
              <strong>Balance:</strong>
              <strong> {openingBalance}{" "}</strong>
              {openingBalance >= 0 ? "(Open Bal)" : "(Excess Bal)"} +
             <strong> {totalGivenPure}</strong>(totalGivenPure ) =<strong>{totalGivenToGoldsmith}</strong> (total)
            </span>
          </div>
          
        <div>
          <span style={styles.subTitle}><strong>Item Delivery:</strong></span>

          <table style={styles.table}>
            <thead>
              <tr>
                <th rowSpan={2} style={styles.th}>S.No</th>
                <th rowSpan={2} style={styles.th}>Item Name</th>
                <th rowSpan={2} style={styles.th}>Item Weight</th>
                <th rowSpan={2} style={styles.th}>Count</th>
                <th rowSpan={2} style={styles.th}>Touch</th>
                <th colSpan={2} style={styles.th}>Deduction</th>
                <th rowSpan={2} style={styles.th}>Net Weight</th>
                <th rowSpan={2} style={styles.th}>Wastage Value</th>
                <th rowSpan={2} style={styles.th}>Wastage Pure</th>
                <th rowSpan={2} style={styles.th}>Final Purity</th>
              </tr>
              <tr>
                <th style={styles.th}>Stone</th>
                <th style={styles.th}>Weight</th>
              </tr>
            </thead>

            <tbody>
              {deliveries.map((item, index) => (
                <React.Fragment key={index}>
                  <tr>
                    <td rowSpan={item?.deduction?.length || 1} style={styles.td}>{index + 1}</td>
                    <td rowSpan={item?.deduction?.length || 1} style={styles.td}>
                      {item.itemName}
                    </td>
                    <td rowSpan={item?.deduction?.length || 1} style={styles.td}>
                      {item.itemWeight}
                    </td>
                    <td rowSpan={item?.deduction?.length || 1} style={styles.td}>{item.count}</td>
                    <td rowSpan={item?.deduction?.length || 1} style={styles.td}>{item.touch}</td>

                  
                    {item?.deduction?.length >= 1 ? (
                      <>
                        <td style={styles.td}>{item.deduction[0].type}</td>
                        <td style={styles.td}>{item.deduction[0].weight}</td>
                      </>
                    ) : (
                      <td colSpan={2} style={styles.td}>No stone</td>
                    )}

                    <td rowSpan={item?.deduction?.length || 1} style={styles.td}>
                      {item.netWeight}
                    </td>
                    <td rowSpan={item?.deduction?.length || 1} style={styles.td}>
                      {item.wastageValue}
                    </td>
                    <td rowSpan={item?.deduction?.length || 1} style={styles.td}>
                      {item.wastagePure}
                    </td>
                    <td rowSpan={item?.deduction?.length || 1} style={styles.td} >
                      {item.finalPurity}
                    </td>
                  </tr>

                
                  {item.deduction?.map(
                    (d, i) =>
                      i !== 0 && (
                        <tr key={i}>
                          <td style={styles.td}>{d.type}</td>
                          <td style={styles.td}>{d.weight}</td>
                        </tr>
                      )
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
            <div style={styles.totalpuritycontainer}>
              <span style={styles.totalpuritylabel}>Total Purity:</span>
              <span>{totalDelivery}</span>
            </div>
        </div>
        <div>

        </div>
        
       <div >
            <span style={styles.subTitle}><strong>Received Details:</strong></span>
            <div style={styles.goldSection}>
              {received.map((item, index) => (
                <div style={styles.goldFlex}>
                  <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                    {index + 1})
                  </span>
                  <div style={styles.goldBox}>{item.weight}</div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>X</div>
                  <div style={styles.goldBox}>{item.touch}</div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>=</div>
                  <div style={styles.goldBox}>{item.purity}</div>
                </div>
              ))}
            </div>
            <div style={styles.totalpuritycontainer}>
              <span style={styles.totalpuritylabel}>Total Purity:</span>
              <span>{totalReceive}</span>
            </div>
          </div>
       
        <div style={{ textAlign: "center" }}>
            {jobCardBalance < 0 ? (
              <p style={styles.balancetextowner}>
                Owner should give balance:
                <span  style={styles.balanceamount}>{jobCardBalance}</span>
              </p>
            ) : jobCardBalance > 0 ? (
              <p style={styles.balancetextgoldsmith}>
                Goldsmith should give balance:
                <span  style={styles.balanceamount}>{jobCardBalance}</span>
              </p>
            ) : (
              <p style={styles.balanceNill}>
                balance Nill:
                <span style={styles.balanceamount}>
                  {jobCardBalance}
                </span>{" "}
              </p>
            )}
          </div>

        </div>

        {/* 
        
        
         <div className="receivedsection"></div>
         <div className="finalBalance"></div> */}
    
    </>
  );
});
const styles = {
  jobPrintMain: {
    width: "100%",
    fontFamily: "Arial, sans-serif",
    margin: 0,
    border: "1px solid black",
    borderRadius: "5px",
    boxSizing: "border-box",
    fontSize:"12px",
    padding:"10px"
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    borderBottom: "1px solid black",
    margin:0
  },
  jobheaderFlex: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    marginBottom:"2px",
    borderBottom:"1px solid black",
    flexWrap: "wrap",
    margin:0
    
  },
  goldFlex: {
    display: "flex",
    justifyContent: "start",
    alignItems: "center",
    gap: "3px",
    margin:0
   
  },
  goldSection: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr" /* 8 columns */,
    gap: "8px",
    alignItems: "center",
    padding:"5px",
    margin:0
  

  },
  goldBox: {
    textAlign: "center",
    width: "60px",
    height: "15px",
    border: "1px solid black",
    borderRadius: "2px",
    boxSizing: "border-box",
    margin:0

  },
  totalpuritycontainer: {
    textAlign:"end",
    margin:0
  },
  totalpuritylabel: {
    fontWeight: "bold",
  },
  balance: {
    margin:0,
   borderTop: "1px solid black",
   borderBottom: "1px solid black"
  },
  balanceBox: {
    margin:0,
    width: "40px",
    height: "15px",
    border: "1px solid black",
    borderRadius: "3px",
  
  },
   table:{
     margin:0,
     borderCollapse:"collapse",
     width:"100%",
     textAlign:"center",
     marginBottom:"2px"
   },
  th:{
   
    border:"1px solid black"
  },
  td:{
    border:"1px solid black"
  },
  balancetextowner:{
    color:"red"
  },
  balancetextgoldsmith:{
    color:"green"
  },
  balanceNill:{
    color:"blue"
  },
  balanceamount:{
    color:"black",
   fontWeight: "bold",
  }

  
};

export default PrintJobCard;
