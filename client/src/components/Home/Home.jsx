import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../Assets/shared image.jpg"; 
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.getAppVersion === "function") {
      window.electronAPI.getAppVersion().then((v) => {
        if (v) setVersion(v);
      });
    }
  }, []);

  return (
    <div className="luxury-container">
      <div className="logo-frame">
        <div className="logo-inner">
          <img src={logo} alt="Logo" className="brand-logo" />
        </div>
      </div>

      <div className="content-wrapper">
        <h1 className="brand-name">AGR Jewellery</h1>
        <p className="brand-tagline">
          Timeless elegance, crafted to perfection
        </p>
        <button
          className="discover-btn"
          onClick={() => {
            console.log("Clicked Login");
            navigate("/customer");
          }}
        >
          Go to Home Page
        </button>
      </div>

      {version && (
        <div className="corner-version-tag">
          v{version}
        </div>
      )}
    </div>
  );
}

export default Home;
