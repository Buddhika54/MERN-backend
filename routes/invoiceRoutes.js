const express = require("express");
const router = express.Router();
const Invoice = require("../models/invoiceModel");

// GET /api/invoices - list all invoices
router.get("/", async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).populate("orderId");
    return res.status(200).json({ success: true, invoices });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ success: false, error: "Server error while fetching invoices" });
  }
});

module.exports = router;
