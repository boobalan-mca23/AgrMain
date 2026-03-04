import React, { useState } from "react";
import {
  useNavigate,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation
} from "react-router-dom";

import MasterCustomer from "./Mastercustomer";
import Mastergoldsmith from "./Mastergoldsmith";
import Masteradditems from "./Masteradditems";
import Masterjewelstock from "./Masterjewelstock";
import MasterWastageVal from "./MasterWastageVal";
import Cashgold from "./Cashgold";
import Touchentry from "./Touchentry";
import MasterBullion from "./Masterbullion";

import SupplierManagement from "./SupplierManagement";
import PurchaseEntry from "./PurchaseEntry";
import ItemPurchase from "./ItemSupplierList";
import ItemPurchaseEntry from "./ItemPurchaseEntry";
import SupplierPurchaseManagement from "./SupplierPurchaseManagement";

import ItemPurchaseReport from "./ItemPurchaseReport";
import PurchaseReport from "./PurchaseReport";

import { FiLogOut } from "react-icons/fi";

const Master = () => {

  const [openPurchaseMenu, setOpenPurchaseMenu] = useState(false);

  const navigate = useNavigate();

  // NEW: detect active route
  const location = useLocation();

  const isPurchaseActive =
    location.pathname.startsWith("/master/supplier") ||
    location.pathname.startsWith("/master/purchase-entry") ||
    location.pathname.startsWith("/master/item-purchase") ||
    location.pathname.startsWith("/master/purchase-report") ||
    location.pathname.startsWith("/master/item-purchase-report");

  const handleLogout = () => {
    navigate("/");
  };

  const handleBack = () => {
    navigate("/customer");
  };

  const getNavStyle = ({ isActive }) => ({
    ...navButton,
    color: isActive ? "#fff" : "rgba(255,255,255,0.8)",
    fontWeight: isActive ? 700 : 500,
    textDecoration: "none",
    backgroundColor: isActive
      ? "rgba(255,255,255,0.15)"
      : "transparent"
  });

  return (

    <div style={containerStyle}>

      {/* NAVBAR */}
      <div style={navContainer}>

        <div
          style={navLeft}
          onMouseLeave={() => setOpenPurchaseMenu(false)}
        >

          <button onClick={handleBack} style={navButton}>
            Home
          </button>

          <NavLink to="/master/customer" style={getNavStyle}>
            Customer
          </NavLink>

          <NavLink to="/master/goldsmith" style={getNavStyle}>
            Goldsmith Info
          </NavLink>

          <NavLink to="/master/items" style={getNavStyle}>
            Items
          </NavLink>


          {/* PURCHASE MENU */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setOpenPurchaseMenu(true)}
          >

            {/* UPDATED BUTTON */}
            <button
              style={{
                ...navButton,
                color: isPurchaseActive
                  ? "#fff"
                  : "rgba(255,255,255,0.8)",

                fontWeight: isPurchaseActive
                  ? 700
                  : 500,

                backgroundColor: isPurchaseActive
                  ? "rgba(255,255,255,0.15)"
                  : "transparent"
              }}
            >
              Purchase ▾
            </button>

            {openPurchaseMenu && (

              <div style={dropdownMenuStyle}>

                <NavLink
                  to="/master/supplier"
                  style={getNavStyle}
                >
                  Supplier Master
                </NavLink>

                <NavLink
                  to="/master/purchase-entry"
                  style={getNavStyle}
                >
                  BC Purchase
                </NavLink>

                <NavLink
                  to="/master/item-purchase"
                  style={getNavStyle}
                >
                  Item Purchase
                </NavLink>

                <NavLink
                  to="/master/purchase-report"
                  style={getNavStyle}
                >
                  BC Purchase Report
                </NavLink>

                <NavLink
                  to="/master/item-purchase-report"
                  style={getNavStyle}
                >
                  Item Purchase Report
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/master/cashgold" style={getNavStyle}>
            Cash / Gold
          </NavLink>

          {/* <NavLink to="/master/wastagevalue" style={getNavStyle}>
            Wastage Value
          </NavLink>

          <NavLink to="/master/touchentries" style={getNavStyle}>
            Touch Entries
          </NavLink> */}

          <NavLink to="/master/bullion" style={getNavStyle}>
            Bullion
          </NavLink>
        </div>

        <button onClick={handleLogout} style={logoutButton}>
          <FiLogOut size={18} />
          <span style={{ marginLeft: "8px" }}>
            Logout
          </span>
        </button>
      </div>

      {/* PAGE CONTENT */}
      <div style={contentContainer}>
        <Routes>
          <Route path="/" element={<Navigate to="customer" />} />

          <Route path="customer" element={<MasterCustomer />} />

          <Route path="goldsmith" element={<Mastergoldsmith />} />

          <Route path="items" element={<Masteradditems />} />

          <Route path="stock" element={<Masterjewelstock />} />

          <Route path="cashgold" element={<Cashgold />} />

          <Route path="touchentries" element={<Touchentry />} />

          <Route path="bullion" element={<MasterBullion />} />

          <Route path="wastagevalue" element={<MasterWastageVal />} />


          {/* PURCHASE ROUTES */}
          <Route path="supplier" element={<SupplierManagement />} />

          <Route path="purchase-entry" element={<SupplierPurchaseManagement />} />

          <Route path="purchase-entry/:supplierId" element={<PurchaseEntry />} />

          <Route path="item-purchase" element={<ItemPurchase />} />

          <Route path="item-purchase/:supplierId" element={<ItemPurchaseEntry />} />

          <Route path="item-purchase-report" element={<ItemPurchaseReport />} />

          <Route path="purchase-report" element={<PurchaseReport />} />

        </Routes>

      </div>

    </div>

  );

};


/* STYLES */

const containerStyle = {
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
};

const navContainer = {
  backgroundColor: "#2c3e50",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 24px",
  color: "#fff",
  height: "64px",
  position: "sticky",
  top: 0,
  zIndex: 1000,
};

const navLeft = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  height: "100%",
};

const navButton = {
  cursor: "pointer",
  fontSize: "1.05rem",
  fontWeight: 600,
  padding: "10px 18px",
  height: "100%",
  display: "flex",
  alignItems: "center",
  backgroundColor: "transparent",
  border: "none",
  color: "#fff",
};

const logoutButton = {
  backgroundColor: "transparent",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "white",
  borderRadius: "6px",
  padding: "10px 18px",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const dropdownMenuStyle = {
  position: "absolute",
  top: "40px",
  left: 0,
  backgroundColor: "#1e2a33",
  borderRadius: "6px",
  overflow: "hidden",
  boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
  minWidth: "200px",
  zIndex: 1000,
};

const contentContainer = {
  flex: 1,
  padding: "24px",
  backgroundColor: "#f8f9fa",
};

export default Master;
