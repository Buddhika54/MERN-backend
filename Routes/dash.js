const express = require("express");
const { getDashboardSummary } = require("../Controllers/dashController");

const router = express.Router();

// GET /Dash/summary
router.get("/summary", getDashboardSummary);

module.exports = router;


