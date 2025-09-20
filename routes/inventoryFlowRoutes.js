// routes/inventoryFlowRoutes.js
const express = require("express");
const router = express.Router();
const { getInventoryFlow } = require("../controllers/inventoryFlowController");

router.get("/", getInventoryFlow);

module.exports = router;
