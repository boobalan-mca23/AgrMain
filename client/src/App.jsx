
import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./components/Home/Home";
import Customer from "./components/Customer/Customer";
import Goldsmith from "./components/Goldsmith/Goldsmith";
import Billing from "./components/Billing/Billing";
import Report from "./components/Report/Report";
import Stock from "./components/Stock/Stock";
import Navbar from "./components/Navbar/Navbar";
import Master from "./components/Master/Master";
import MasterCustomer from "./components/Master/Mastercustomer";
import Customertrans from "./components/Customer/Customertrans";
import CustomerReport from "./components/Report/customer.report";
import Overallreport from "./components/Report/overallreport";
import Jobcardreport from "./components/Report/jobcardreport";
import ReceiptReport from "./components/Report/receiptreport";
import Receipt from "./components/ReceiptVoucher/receiptvoucher";
import Customerorders from "./components/Customer/Customerorders";
import Orderreport from "./components/Report/orderreport";
import Newjobcard from "./components/Goldsmith/Newjobcard";
// import Goldsmithcard from "./components/Goldsmith/goldsmithcard"
import JobCardDetails from "./components/Goldsmith/JobCard"
import MasterBullion from "./components/Master/Masterbullion";
import Bullion from "./components/Bullion/Bullion";
import Repair from "./components/Repair/Repair";
import Jewelstockreport from "./components/Report/jewelstockreport";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/customer"
          element={
            <PageWithNavbar>
              <Customer />
            </PageWithNavbar>
          }
        />
        <Route
          path="/goldsmith"
          element={
            <PageWithNavbar>
              <Goldsmith />
            </PageWithNavbar>
          }
        />
        <Route
          path="/goldsmithcard/:id/:name"
          element={
            <PageWithNavbar>
              <JobCardDetails/>
            </PageWithNavbar>
          }
        />

        <Route
          path="/bill"
          element={
            <PageWithNavbar>
              <Billing />
            </PageWithNavbar>
          }
        />
      
        <Route
          path="/report"
          element={
            <PageWithNavbar>
              <Report />
            </PageWithNavbar>
          }
        />
        <Route
          path="/repair"
          element={
            <PageWithNavbar>
              <Repair />
            </PageWithNavbar>
          }
        ></Route>
        <Route
          path="/customerreport"
          element={
            <PageWithNavbar>
              <CustomerReport />
            </PageWithNavbar>
          }
        />
        <Route
          path="/jewelstockreport"
          element={
            <PageWithNavbar>
              <Jewelstockreport />
            </PageWithNavbar>
          }
        />
        <Route
          path="/overallreport"
          element={
            <PageWithNavbar>
              <Overallreport />
            </PageWithNavbar>
          }
        />
        <Route
          path="/orderreport"
          element={
            <PageWithNavbar>
              <Orderreport />
            </PageWithNavbar>
          }
        ></Route>
        <Route
          path="/jobcardreport"
          element={
            <PageWithNavbar>
              <Jobcardreport />
            </PageWithNavbar>
          }
        />
        <Route
          path="/receiptreport"
          element={
            <PageWithNavbar>
              <ReceiptReport />
            </PageWithNavbar>
          }
        />
        <Route
          path="/receiptvoucher"
          element={
            <PageWithNavbar>
              <Receipt />
            </PageWithNavbar>
          }
        />
        <Route
          path="/stock"
          element={
            <PageWithNavbar>
              <Stock />
            </PageWithNavbar>
          }
        />
        <Route
          path="/customertrans"
          element={
            <PageWithNavbar>
              <Customertrans />
            </PageWithNavbar>
          }
        />
        <Route
          path="/customerorders"
          element={
            <PageWithNavbar>
              <Customerorders />
            </PageWithNavbar>
          }
        />
    
        <Route
          path="/newjobcard/:id/:name"
          element={
            <PageWithNavbar>
              <Newjobcard />
            </PageWithNavbar>
          }
        />
    

        <Route
          path="/bullion"
          element={
            <PageWithNavbar>
              <Bullion />
            </PageWithNavbar>
          }
        ></Route>

        <Route path="/master" element={<Master />} />
        <Route path="/mastercustomer" element={<MasterCustomer />} />
        <Route path="/masterbullion" element={<MasterBullion />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

function PageWithNavbar({ children }) {
  const location = useLocation();
  const hideNavbarPaths = ["/"];
  if (hideNavbarPaths.includes(location.pathname)) {
    return children;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default App;


