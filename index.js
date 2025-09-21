import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import deliveryRoutes from "./routes/deliveryRoutes.js";

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/deliveries", deliveryRoutes);

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ MongoDB Connected");
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on port ${process.env.PORT}`);
  });
})
.catch((error) => console.error("❌ MongoDB connection error:", error));
