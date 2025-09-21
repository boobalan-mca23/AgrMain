import React from "react";
const PrintJobTable=(props)=>{
    return(
        <>
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
              {props.deliveries.map((item, index) => (
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
        </>
    )
}

const styles={
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
}
export default PrintJobTable