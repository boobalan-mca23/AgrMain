import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Button,
  TextField,
  Paper
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import { BACKEND_SERVER_URL } from "../../Config/Config";


function SupplierPurchaseManagement() {

  const [suppliers, setSuppliers] = useState([]);

  const [filteredSuppliers, setFilteredSuppliers] = useState([]);

  const [supplierFilter, setSupplierFilter] = useState("");

  const navigate = useNavigate();


  useEffect(() => {

    fetchSuppliers();

  }, []);


  useEffect(() => {

    applyFilter();

  }, [supplierFilter, suppliers]);


  const fetchSuppliers = async () => {

    try {

      const res = await axios.get(
        `${BACKEND_SERVER_URL}/api/supplier`
      );

      setSuppliers(res.data);

      setFilteredSuppliers(res.data);

    } catch (err) {

      console.error(err);

    }

  };


  const applyFilter = () => {

    if (!supplierFilter.trim()) {

      setFilteredSuppliers(suppliers);

      return;

    }

    const filtered = suppliers.filter((s) =>
      s.name.toLowerCase().includes(
        supplierFilter.toLowerCase()
      )
    );

    setFilteredSuppliers(filtered);

  };


  const clearFilter = () => {

    setSupplierFilter("");

    setFilteredSuppliers(suppliers);

  };


  const handleView = (supplierId) => {

    navigate(`/master/purchase-entry/${supplierId}`);

  };


  return (

    <div>

      <h2>BC Purchase Management</h2>


      {/* TEXTBOX FILTER */}

      <Paper style={{
        padding: 15,
        marginBottom: 15,
        display: "flex",
        gap: 20,
        alignItems: "center"
      }}>

        <TextField
          label="Search Supplier Name"
          value={supplierFilter}
          onChange={(e) =>
            setSupplierFilter(e.target.value)
          }
          variant="outlined"
          style={{ minWidth: 300 }}
        />

        <Button
          variant="outlined"
          onClick={clearFilter}
        >
          Clear
        </Button>

      </Paper>


      {/* Total Count */}

      <div
        style={{
          marginBottom: 10,
          fontWeight: 600,
          fontSize: 18
        }}
      >

        Total Suppliers: {filteredSuppliers.length}

      </div>


      {/* TABLE */}

      <Paper>

        <table
          className="item-list"
          style={{ width: "100%" }}
        >

          <thead>

            <tr>

              <th>S.No</th>

              <th>Supplier Name</th>

              <th>Opening Balance (g)</th>

              <th>Action</th>

            </tr>

          </thead>


          <tbody>

            {filteredSuppliers.length === 0 && (

              <tr>

                <td colSpan="4" style={{ textAlign: "center" }}>
                  No suppliers found
                </td>

              </tr>

            )}


            {filteredSuppliers.map((supplier, index) => (

              <tr key={supplier.id}>

                <td>{index + 1}</td>

                <td>{supplier.name}</td>

                <td>
                  {Number(
                    supplier.openingBalance || 0
                  ).toFixed(3)}
                </td>

                <td>

                  <Button
                    variant="contained"
                    onClick={() =>
                      handleView(supplier.id)
                    }
                  >
                    View Purchase
                  </Button>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </Paper>

    </div>

  );

}

export default SupplierPurchaseManagement;
