const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./Routes/auth.routes");
const userRoutes = require("./Routes/user.routes");
const customerRoutes = require("./Routes/customer.routes");
const goldsmithRoutes = require("./Routes/goldsmith.routes");
const masterItemRoutes = require("./Routes/masteritem.routes");
const stockRoutes = require("./Routes/coinstock.routes");
const jewelStockRoutes = require("./Routes/jewelstock.routes");
const transactionRoutes = require("./Routes/transaction.routes");
const entryRoutes = require("./Routes/cashgold.routes");
const customerOrderRoutes = require("./Routes/customerOrder.routes");
const masterTouchRoutes = require("./Routes/mastertouch.routes");
const masterBullionRoutes = require("./Routes/masterbullion.routes");
const bullionPurchaseRoutes = require("./Routes/bullionpurchase.routes");
const assignmentRoutes = require("./Routes/assignment.routes");
const rawGoldRoutes=require("./Routes/rawGoldStock.routes");
const productStock=require("./Routes/productStock.routes");
const billRoutes=require("./Routes/bill.routes")
const receiptRoutes=require("./Routes/receipt.routes");
const masterWastageRoutes = require("./Routes/masterwastage.routes")
const expenseRoutes=require("./Routes/expense.routes")
const supplierRoutes = require("./Routes/supplier.routes");
const purchaseEntryRoutes = require("./Routes/purchaseEntry.routes");
const purchaseStockRoutes = require("./Routes/purchaseStock.routes");
const purchaseReportRoutes = require("./Routes/purchaseReport.routes");
const repairRoutes = require("./Routes/repairStock.routes");
const customerReturnRoutes = require("./Routes/returnStock.routes.js");
// const customerRepairRoutes = require("./Routes/customerReturn-Repair.routes.js");
const path = require("path");
const fs = require("fs");
 
require("dotenv").config();
 
const app = express();
var morgan = require("morgan");
const PORT = process.env.PORT || 5002;
app.use(morgan("dev"));

app.use(cors({
  origin: [
    "https://agrmain.onrender.com",
    "http://localhost:3000",
    "https://agrclientapp.onrender.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use(bodyParser.json());
app.get("/", (req, res) => {
  res.send("Server is running");
});
 
app.use("/api/auth", authRoutes);
app.use("/api/rawgold",rawGoldRoutes);
app.use("/api", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/master-items", masterItemRoutes);
app.use("/api/v1/stocks", stockRoutes);
app.use("/api/goldsmith", goldsmithRoutes);
app.use("/api/jewel-stock", jewelStockRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/customerOrder", customerOrderRoutes);
app.use("/api/master-touch", masterTouchRoutes);
app.use("/api/master-wastage", masterWastageRoutes);
app.use("/api/master-bullion", masterBullionRoutes);
app.use("/api/bullion-purchase", bullionPurchaseRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/productStock",productStock);
app.use("/api/bill",billRoutes)
app.use("/api/receipt",receiptRoutes);
app.use("/api/expense",expenseRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/purchase-entry", purchaseEntryRoutes);
app.use("/api/purchase-stock", purchaseStockRoutes);
app.use("/api/purchase-report", purchaseReportRoutes);
app.use("/api/repair", repairRoutes);
app.use("/api/returns", customerReturnRoutes);
// app.use("/api/repair", customerRepairRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/uploads/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") res.type("jpeg");
  else if (ext === ".png") res.type("png");
  else if (ext === ".webp") res.type("webp");

  res.sendFile(filePath);
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
