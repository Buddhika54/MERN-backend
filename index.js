const express = require("express");
const dbConnection = require("./config/db");
const cors = require("cors"); // <- import cors

// ✅ Import pickup routes
const pickupRoutes = require("./routes/pickupRoutes");

const auctionRoutes = require("./routes/auctionRoutes"); 
const invoiceRoutes = require("./routes/invoiceRoutes");


const app = express();

// Middleware to parse JSON
app.use(cors());
app.use(express.json());


// DB Connection
dbConnection();

// Import order routes
const orderRoutes = require("./routes/orderRoutes");

// Use order routes
app.use("/api/orders", orderRoutes);

// ✅ Use pickup routes under /api/pickups
app.use("/api/pickups", pickupRoutes);

app.use("/api/auctions", auctionRoutes);
app.use("/api/invoices", invoiceRoutes);

// Default route
app.get("/", (req, res) => res.send("Hello Server is Running .."));

const PORT = 3000;
app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
