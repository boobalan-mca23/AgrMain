
import React,{Suspense,lazy} from "react";
import { CircularProgress, Box } from "@mui/material";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// Lazy Loading Components
const Home=lazy(()=>import('./components/Home/Home'))
const Customer=lazy(()=>import('./components/Customer/Customer'))
const Goldsmith=lazy(()=>import('./components/Goldsmith/Goldsmith'))
const Billing=lazy(()=> import('./components/Billing/Billing'))
const Report=lazy(()=>import('./components/Report/Report'))
const Stock=lazy(()=>import('./components/Stock/Stock'))
const RawGoldStock=lazy(()=>import('./components/RawGoldStock/RawGoldStock'))
const Navbar=lazy(()=>import('./components/Navbar/Navbar'))
const Master=lazy(()=>import('./components/Master/Master'))
const MasterCustomer=lazy(()=>import('./components/Master/Mastercustomer'))
const Customertrans=lazy(()=>import('./components/Customer/Customertrans'))
const CustomerReport=lazy(()=>import('./components/Report/customer.report'))
const Overallreport=lazy(()=>import('./components/Report/overallreport'))
const Jobcardreport=lazy(()=>import('./components/Report/jobcardreport'))
const ReceiptReport=lazy(()=>import('./components/Report/receiptreport'))
const Receipt=lazy(()=>import('./components/ReceiptVoucher/receiptvoucher'))
const Customerorders=lazy(()=>import('./components/Customer/Customerorders'))
const Orderreport=lazy(()=>import('./components/Report/orderreport'))
const Newjobcard=lazy(()=>import('./components/Goldsmith/Newjobcard'))
const ExpenseTracker=lazy(()=>import('./components/ExpenseTracker/ExpenseTracker'))
const  JobCardDetails=lazy(()=>import('./components/Goldsmith/JobCard'))
const MasterBullion=lazy(()=>import('./components/Master/Masterbullion'))
const Bullion=lazy(()=>import('./components/Bullion/Bullion'))
const Repair=lazy(()=>import('./components/Repair/Repair'))
const Jewelstockreport =lazy(()=>import('./components/Report/jewelstockreport'))
const BillView=lazy(()=>import('./components/Billing/BillView'))

const Loader = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      fontSize:'1.5rem',
      fontWeight:'bold'
    }}
  > Loading...
    <CircularProgress /> 
  </Box>
);
function App() {
  return (
    <BrowserRouter>

    <Suspense fallback={<Loader/>}>
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
          path="/expenseVoucher"
          element={
            <PageWithNavbar>
             <ExpenseTracker/>
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
          path="/bill-view/:billId"
          element={
            <PageWithNavbar>
              <BillView />
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
          path="/productstock"
          element={
            <PageWithNavbar>
              <Stock />
            </PageWithNavbar>
          }
        />
        <Route
          path="/rawGoldStock"
          element={
            <PageWithNavbar>
              <RawGoldStock/>
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
    </Suspense>
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


