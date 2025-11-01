import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiChevronDown, FiChevronUp } from "react-icons/fi";
import NotificationBell from "../Notification/Notification";
import logo from "../../Assets/agrLogo.png";
const Navbar = () => {
  const navigate = useNavigate();
  const [showReports, setShowReports] = useState(false);
  const [activeLink, setActiveLink] = useState("");
  const [activeReport, setActiveReport] = useState("");
  const [hoveredItem, setHoveredItem] = useState(null);
  const reportsRef = useRef(null);
  const [showStock, setShowStock] = useState(false);
  const [activeStock, setActiveStock] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleLinkClick = (path) => {
    setActiveLink(path);
    setShowReports(false);
  };

  const handleReportClick = (path) => {
    setActiveReport(path);
    handleLinkClick(path);
  };

  const toggleReports = (e) => {
    e.stopPropagation();
    setShowReports(!showReports);
  };

  const toggleStock = (e) => {
    e.stopPropagation();
    setShowStock(!showStock);
  };

  const handleStockClick = (path) => {
    setActiveStock(path);
    handleLinkClick(path);
    navigate(path);
  };

  const getNavLinkStyle = (path) => ({
    ...navLink,
    color: activeLink === path ? "#fff" : "rgba(255, 255, 255, 0.8)",
    backgroundColor:
      activeLink === path
        ? "rgba(255, 255, 255, 0.15)"
        : hoveredItem === path
        ? "rgba(255, 255, 255, 0.1)"
        : "transparent",
    fontWeight: activeLink === path ? 600 : 500,
    transform: hoveredItem === path ? "translateY(-1px)" : "translateY(0)",
    boxShadow: hoveredItem === path ? "0 2px 5px rgba(0,0,0,0.1)" : "none",
  });

  const getReportItemStyle = (path) => ({
    ...dropdownItem,
    backgroundColor:
      activeReport === path
        ? "#f1f3f5"
        : hoveredItem === path
        ? "#f8f9fa"
        : "#fff",
    fontWeight: activeReport === path ? 600 : 400,
    transform: hoveredItem === path ? "translateX(2px)" : "translateX(0)",
  });

  return (
    <div style={navContainer}>
      <div style={navLeft}>
        <div style={logoContainer}>
          <img style={logoImg} src={logo} alt="Agrlogo"></img>
          <span style={logoText}>AGR</span>
        </div>

        {[
          "Master",
          "Customer",
          "Goldsmith",
          "Bill",
          "Expense Voucher",
          "Bullion",
          "Repair",
        ].map((label) => {
          const path = `/${label.replace(/\s+/g, "").toLowerCase()}`;
          return (
            <a
              key={label}
              href={path}
              style={getNavLinkStyle(path)}
              onClick={() => handleLinkClick(path)}
              onMouseEnter={() => setHoveredItem(path)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {label}
            </a>
          );
        })}
        <div
          style={{
            ...navLink,
            backgroundColor:
              hoveredItem === "stock"
                ? "rgba(255, 255, 255, 0.1)"
                : "transparent",
            color: "rgba(255, 255, 255, 0.8)",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            position: "relative",
            cursor: "pointer",
          }}
          onClick={toggleStock}
          onMouseEnter={() => {
            setHoveredItem("stock");
            setShowStock(true);
          }}
          onMouseLeave={() => {
            setHoveredItem(null);
            setTimeout(() => setShowStock(false), 300);
          }}
        >
          Stock{" "}
          {showStock ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          {showStock && (
            <div
              style={dropdownMenu}
              onMouseEnter={() => setShowStock(true)}
              onMouseLeave={() => setShowStock(false)}
            >
              {[
                ["Product Stock", "/productstock"],
                ["Raw Gold Stock", "/rawgoldstock"],
              ].map(([name, path]) => (
                <a
                  key={path}
                  href={path}
                  style={getReportItemStyle(path)} // reuse styles
                  onClick={(e) => {
                    e.preventDefault();
                    handleStockClick(path);
                  }}
                  onMouseEnter={() => setHoveredItem(path)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {name}
                  {activeStock === path && (
                    <span style={selectedIndicator}>✓</span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>

        <div
          ref={reportsRef}
          style={{
            ...navLink,
            backgroundColor:
              hoveredItem === "reports"
                ? "rgba(255, 255, 255, 0.1)"
                : "transparent",
            color: "rgba(255, 255, 255, 0.8)",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            position: "relative",
            cursor: "pointer",
          }}
          onClick={toggleReports}
          onMouseEnter={() => {
            setHoveredItem("reports");
            setShowReports(true);
          }}
          onMouseLeave={() => {
            setHoveredItem(null);
            setTimeout(() => setShowReports(false), 300);
          }}
        >
          Reports{" "}
          {showReports ? (
            <FiChevronUp size={16} />
          ) : (
            <FiChevronDown size={16} />
          )}
          {showReports && (
            <div
              style={dropdownMenu}
              onMouseEnter={() => setShowReports(true)}
              onMouseLeave={() => setShowReports(false)}
            >
              {[
                ["Daily Sales Report", "/report"],
                ["Customer Report", "/customerreport"],
                // ["Overall Report", "/overallreport"],
                ["Jobcard Report", "/jobcardReport"],
                // ["Receipt Report", "/receiptreport"],
                ["Order Report", "/orderreport"],
                // ["Jewelstock Report", "/jewelstockreport"],
                ["Receipt Report", "/receiptreport"],
                ["Over All Report", "/overallreport"],
              ].map(([name, path]) => (
                <a
                  key={path}
                  href={path}
                  style={getReportItemStyle(path)}
                  onClick={(e) => {
                    e.preventDefault();
                    handleReportClick(path);
                    navigate(path);
                  }}
                  onMouseEnter={() => setHoveredItem(path)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {name}
                  {activeReport === path && (
                    <span style={selectedIndicator}>✓</span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={navRight}>
        <NotificationBell />
        <button
          onClick={handleLogout}
          style={{
            ...logoutButton,
            transform:
              hoveredItem === "logout" ? "translateY(-1px)" : "translateY(0)",
            boxShadow:
              hoveredItem === "logout" ? "0 2px 5px rgba(0,0,0,0.1)" : "none",
          }}
          onMouseEnter={() => setHoveredItem("logout")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <FiLogOut size={18} />
          <span style={{ marginLeft: "8px" }}>Logout</span>
        </button>
      </div>
    </div>
  );
};

const navContainer = {
  backgroundColor: "#2c3e50",
  background: "linear-gradient(135deg, #2c3e50 0%, #1a2530 100%)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 24px",
  color: "#fff",
  position: "relative",
  height: "64px",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
};

const logoContainer = {
  marginRight: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "start",
  gap: "10px",
};
const logoImg = {
  width: "100%",
  height: "30px",
  borderRadius: "5px",
};

const logoText = {
  fontSize: "1.25rem",
  fontWeight: "600",
  background: "linear-gradient(90deg, #fff, #a5d8ff)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

const navLeft = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  height: "100%",
  position: "relative",
};

const navLink = {
  cursor: "pointer",
  fontSize: "1.15rem",
  fontWeight: "600",
  textDecoration: "none",
  padding: "8px 16px",
  borderRadius: "6px",
  transition: "all 0.2s ease",
  height: "100%",
  display: "flex",
  alignItems: "center",
};

const navRight = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const logoutButton = {
  backgroundColor: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  color: "white",
  borderRadius: "6px",
  padding: "8px 16px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  transition: "all 0.2s ease",
};

const dropdownMenu = {
  position: "absolute",
  top: "100%",
  left: "0",
  backgroundColor: "#fff",
  color: "#333",
  borderRadius: "8px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  overflow: "hidden",
  zIndex: 999,
  minWidth: "220px",
  border: "1px solid rgba(0, 0, 0, 0.05)",
};

const dropdownItem = {
  padding: "12px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  textDecoration: "none",
  color: "#495057",
  fontSize: "1rem",
  fontWeight: "500",
  transition: "all 0.2s ease",
};

const selectedIndicator = {
  marginLeft: "8px",
  color: "#4dabf7",
  fontWeight: "bold",
};

export default Navbar;
