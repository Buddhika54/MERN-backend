// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Routes
const dashboardRoutes = require("./routes/dashboard");
const inventoryRoutes = require("./routes/inventory");
const warehouseRoutes = require("./routes/warehouses");
const supplierRoutes = require("./routes/suppliers");
const prRoutes = require("./routes/purchaseRequestRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportsRoutes = require("./routes/reports");
const purchaseOrdersRoutes = require("./routes/purchaseOrders");

// ✅ Add inventory flow route
const inventoryFlowRoutes = require("./routes/inventoryFlowRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/purchase-orders", purchaseOrdersRoutes);
app.use("/api/inventory/purchaserequests", prRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/suppliers", supplierRoutes);

// ✅ Register inventory flow route
app.use("/api/inventory/flow", inventoryFlowRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
