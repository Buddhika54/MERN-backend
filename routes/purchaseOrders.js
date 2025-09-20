const express = require("express");
const router = express.Router();
const { getPOs, updateDeliveryStatus } = require("../controllers/purchaseOrderController");

router.get("/", getPOs);
router.post("/update-status", updateDeliveryStatus);

module.exports = router;
