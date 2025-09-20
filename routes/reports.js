
const express = require("express");
const router = express.Router();
const { lowStockReport, inventoryFlowReport } = require("../controllers/reportController");

router.get("/low-stock", lowStockReport);
router.get("/inventory-flow", inventoryFlowReport);

module.exports = router;
