import express from "express";
import { getDashboardSummary } from "../controllers/dashController.js";

const router = express.Router();

// GET => http://localhost:5000/Dash
router.get("/", getDashboardSummary);

export default router;
