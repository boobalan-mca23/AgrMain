import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { BACKEND_SERVER_URL } from "../../Config/Config";
import { TablePagination, Button } from "@mui/material";
import "./Stock.css";

const ItemPurchaseStock = () => {

  const [stockData, setStockData] = useState([]);

  const [page, setPage] = useState(0);

  const [rowsPerPage, setRowsPerPage] = useState(50);


  useEffect(() => {

    fetchStock();

  }, []);


  const fetchStock = async () => {

    try {

      const res =
        await axios.get(
          `${BACKEND_SERVER_URL}/api/item-purchase/stock`
        );

      setStockData(res.data.allStock);

    }

    catch (err) {

      console.error(err);

    }

  };


  const markSold = async (id) => {

    if (!window.confirm("Mark item as sold?"))
      return;

    try {

      await axios.put(
        `${BACKEND_SERVER_URL}/api/item-purchase/sold/${id}`
      );

      fetchStock();

    }

    catch {

      alert("Failed");

    }

  };


  const safeFixed = (num) => {

    const n = parseFloat(num);

    return isNaN(n) ? "0.000" : n.toFixed(3);

  };


  // PAGINATION

  const paginatedData =
    stockData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );


  // SUMMARY CALCULATIONS

  const totals =
    useMemo(() => {

      return stockData.reduce(

        (acc, item) => {

          acc.items += 1;

          acc.weight += Number(item.netWeight || 0);

          acc.wastage += Number(item.wastagePure || 0);

          acc.purity += Number(item.finalPurity || 0);

          return acc;

        },

        {
          items: 0,
          weight: 0,
          wastage: 0,
          purity: 0
        }

      );

    }, [stockData]);


  const currentPageTotals =
    useMemo(() => {
      return paginatedData.reduce(
        (acc, item) => {
          acc.weight += Number(item.netWeight || 0);
          acc.wastage += Number(item.wastagePure || 0);
          acc.purity += Number(item.finalPurity || 0);
          return acc;
        },
        {
          weight: 0,
          wastage: 0,
          purity: 0
        }
      );
    }, [paginatedData]);


  const handleChangePage =
    (e, newPage) =>
      setPage(newPage);


  const handleChangeRowsPerPage =
    (e) => {

      setRowsPerPage(parseInt(e.target.value));

      setPage(0);

    };


  return (

    <div className="stock-container">

      <h2 className="stock-heading">
        Item Purchase Stock
      </h2>


      {/* SUMMARY */}

      <div className="stock-summary">

        <div className="stock-card">

          <p>Total Items</p>

          <h3>{totals.items}</h3>

        </div>


        <div className="stock-card">

          <p>Total Net Weight (g)</p>

          <h3>{safeFixed(totals.weight)}</h3>

        </div>


        <div className="stock-card">

          <p>Total Wastage Pure (g)</p>

          <h3>{safeFixed(totals.wastage)}</h3>

        </div>


        <div className="stock-card">

          <p>Total Final Purity (g)</p>

          <h3>{safeFixed(totals.purity)}</h3>

        </div>

      </div>


      {/* TABLE */}

      <div className="stock-table-container">

        <table className="stock-table">

          <thead>

            <tr>

              <th>SNo</th>

              <th>Item Name</th>

              <th>ItemWeight (g)</th>

              <th>Touch</th>

              <th>StoneWt (g)</th>

              <th>NetWeight (g)</th>

              <th>WastageValue</th>

              <th>WastagePure (g)</th>

              <th>Final Purity (g)</th>

              <th>Action</th>

            </tr>

          </thead>


          <tbody>

            {paginatedData.map((item, index) => (

              <tr key={item.id}>

                <td>
                  {page * rowsPerPage + index + 1}
                </td>

                <td>
                    {item.itemName}
                </td>

                <td>
                  {safeFixed(item.grossWeight)}
                </td>


                <td>
                  {item.touch}
                </td>


                <td>
                  {safeFixed(item.stoneWeight)}
                </td>


                <td>
                  {safeFixed(item.netWeight)}
                </td>


                <td>
                  {item.wastage} ({item.wastageType})
                </td>


                <td>
                  {safeFixed(item.wastagePure)}
                </td>


                <td>
                  {safeFixed(item.finalPurity)}
                </td>


                <td>

                    {item.isBilled ? (

                        !item.isSold ? (

                        <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => markSold(item.id)}
                        >
                            Sold
                        </Button>

                        ) : (

                        <span style={{ color: "red" }}>
                            Sold
                        </span>

                        )

                    ) : (

                        <span style={{
                        color: "#888",
                        fontStyle: "italic"
                        }}>
                        -
                        </span>

                    )}

                    </td>

              </tr>

            ))}

          </tbody>


          <tfoot>
            <tr>
              <td colSpan={5}>
                <strong>Total</strong>
              </td>
              <td>
                <strong>{safeFixed(currentPageTotals.weight)}</strong>
              </td>
              <td></td>
              <td>
                <strong>{safeFixed(currentPageTotals.wastage)}</strong>
              </td>
              <td>
                <strong>{safeFixed(currentPageTotals.purity)}</strong>
              </td>
              <td></td>
            </tr>
          </tfoot>

        </table>


        <TablePagination

          component="div"

          count={stockData.length}

          page={page}

          onPageChange={handleChangePage}

          rowsPerPage={rowsPerPage}

          onRowsPerPageChange={handleChangeRowsPerPage}

          rowsPerPageOptions={[10, 25, 50, 100]}

        />

      </div>

    </div>

  );

};

export default ItemPurchaseStock;