import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterCustomer from "./Mastercustomer";
import Mastergoldsmith from "./Mastergoldsmith";
import Masteradditems from "./Masteradditems";
import Masterjewelstock from "./Masterjewelstock";
import MasterWastageVal from "./MasterWastageVal";
import Cashgold from "./Cashgold";
import { FiLogOut } from "react-icons/fi";
import Touchentry from "./Touchentry";
import MasterBullion from "./Masterbullion";
import SupplierManagement from "./SupplierManagement";
import PurchaseEntry from "./PurchaseEntry";
import PurchaseStock from "./PurchaseStock";
import PurchaseReport from "./PurchaseReport";

const Master = () => {
  const [activeTab, setActiveTab] = useState("customer");
  const [openPurchaseMenu, setOpenPurchaseMenu] = useState(false); // NEW
  const navigate = useNavigate();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setOpenPurchaseMenu(false); // close dropdown when selecting
  };

  const handleLogout = () => {
    navigate("/");
  };

  const handleBack = () => {
    navigate("/customer");
  };

  const getNavButtonStyle = (tab) => ({
    ...navButton,
    color: activeTab === tab ? "#fff" : "rgba(255, 255, 255, 0.8)",
    fontWeight: activeTab === tab ? 600 : 500,
  });

  return (
    <div style={containerStyle}>
      <div style={navContainer}>
        <div style={navLeft}>

          <button onClick={handleBack} style={getNavButtonStyle("home")}>
            Home
          </button>

          <button onClick={() => handleTabChange("customer")} style={getNavButtonStyle("customer")}>
            Customer
          </button>

          <button onClick={() => handleTabChange("goldsmith")} style={getNavButtonStyle("goldsmith")}>
            Goldsmith Info
          </button>

          <button onClick={() => handleTabChange("items")} style={getNavButtonStyle("items")}>
            Items
          </button>

          {/* --------------------- NEW DROPDOWN MENU --------------------- */}
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setOpenPurchaseMenu(true)}
            onMouseLeave={() => setOpenPurchaseMenu(false)}
          >
            <button style={getNavButtonStyle("purchase")}>
              Purchase ▾
            </button>

            {openPurchaseMenu && (
              <div style={dropdownMenuStyle}>
                <div
                  style={dropdownItemStyle}
                  onClick={() => handleTabChange("suppliermanagement")}
                >
                  Supplier Management
                </div>
                <div
                  style={dropdownItemStyle}
                  onClick={() => handleTabChange("purchaseentry")}
                >
                  Purchase Entry
                </div>
                <div
                  style={{ ...dropdownItemStyle, borderBottom: "none" }}
                  onClick={() => handleTabChange("purchasestockreport")}
                >
                  Purchase Stock Report
                </div>
            </div>
          )}
        </div>
        {/* ------------------------------------------------------------- */}
          <button onClick={() => handleTabChange("cashgold")} style={getNavButtonStyle("cashgold")}>
            Cash / Gold
          </button>

          <button onClick={() => handleTabChange("wastagevalue")} style={getNavButtonStyle("wastagevalue")}>
            Wastage Value
          </button>

          <button onClick={() => handleTabChange("touchentries")} style={getNavButtonStyle("touchentries")}>
            Touch Entries
          </button>

          <button onClick={() => handleTabChange("bullion")} style={getNavButtonStyle("bullion")}>
            Bullion
          </button>
        </div>

        <button onClick={handleLogout} style={logoutButton}>
          <FiLogOut size={18} />
          <span style={{ marginLeft: "8px" }}>Logout</span>
        </button>
      </div>

      <div style={contentContainer}>
        {activeTab === "customer" && <MasterCustomer />}
        {activeTab === "goldsmith" && <Mastergoldsmith />}
        {activeTab === "items" && <Masteradditems />}
        {activeTab === "stock" && <Masterjewelstock />}
        {activeTab === "cashgold" && <Cashgold />}
        {activeTab === "touchentries" && <Touchentry />}
        {activeTab === "bullion" && <MasterBullion />}
        {activeTab === "wastagevalue" && <MasterWastageVal />}
        {activeTab === "suppliermanagement" && <SupplierManagement />}
        {activeTab === "purchaseentry" && <PurchaseEntry />}
        {activeTab === "purchasestock" && <PurchaseStock />}
        {activeTab === "purchasestockreport" && <PurchaseReport />}
      </div>
    </div>
  );
};

// ------------------------------------
// STYLES
// ------------------------------------

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
  transition: "all 0.3s ease",
  height: "100%",
  display: "flex",
  alignItems: "center",
  backgroundColor: "transparent",
  border: "none",
  position: "relative",
  margin: "0 4px",
};

const logoutButton = {
  backgroundColor: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  color: "white",
  borderRadius: "6px",
  padding: "10px 18px",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

// NEW DROPDOWN STYLES
const dropdownMenuStyle = {
  position: "absolute",
  top: "40px",
  left: 0,
  backgroundColor: "#1e2a33",
  borderRadius: "6px",
  overflow: "hidden",
  boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
  minWidth: "180px",
  zIndex: 1000,
};

const dropdownItemStyle = {
  padding: "12px 16px",
  color: "#fff",
  cursor: "pointer",
  fontSize: "0.95rem",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const contentContainer = {
  flex: 1,
  padding: "24px",
  backgroundColor: "#f8f9fa",
};

export default Master;
