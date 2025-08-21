const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./Routes/auth.routes");
const userRoutes = require("./Routes/user.routes");
const customerRoutes = require("./Routes/customer.routes");
const goldsmithRoutes = require("./Routes/goldsmith.routes");
const masterItemRoutes = require("./Routes/masteritem.routes");
const stockRoutes = require("./Routes/coinstock.routes");
const billRoutes = require("./Routes/bill.routes");
const jewelStockRoutes = require("./Routes/jewelstock.routes");
const transactionRoutes = require("./Routes/transaction.routes");
const entryRoutes = require("./Routes/cashgold.routes");
const customerOrderRoutes = require("./Routes/customerOrder.routes");
const masterTouchRoutes = require("./Routes/mastertouch.routes");
const masterBullionRoutes = require("./Routes/masterbullion.routes");
const bullionPurchaseRoutes = require("./Routes/bullionpurchase.routes");
const assignmentRoutes = require("./Routes/assignment.routes");
const repairRoutes = require("./Routes/repair.routes");

const path = require("path");

require("dotenv").config();

const app = express();
var morgan = require("morgan");
const PORT = process.env.PORT || 5002;
app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());
app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/master-items", masterItemRoutes);
app.use("/api/v1/stocks", stockRoutes);
app.use("/api/goldsmith", goldsmithRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/jewel-stock", jewelStockRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/customerOrder", customerOrderRoutes);
app.use("/api/master-touch", masterTouchRoutes);
app.use("/api/master-bullion", masterBullionRoutes);
app.use("/api/bullion-purchase", bullionPurchaseRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/repair", repairRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
