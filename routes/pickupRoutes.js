const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Pickup = require("../models/pickupModel");
const Order = require("../models/orderModel");

// @desc    Schedule a new pickup
// @route   POST /api/pickups
router.post("/", async (req, res) => {
  try {
    const { orderId, clientName, pickupDate, pickupTime, truckAssigned } = req.body;

    // Validate required fields
    if (!orderId || !clientName || !pickupDate || !pickupTime || !truckAssigned) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // Validate orderId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, error: "Invalid Order ID" });
    }

    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Optional: Prevent duplicate pickup for the same order
    const existingPickup = await Pickup.findOne({ orderId });
    if (existingPickup) {
      return res.status(400).json({ success: false, error: "Pickup already scheduled for this order" });
    }

    // Create pickup
    const newPickup = new Pickup({
      orderId,
      clientName,
      pickupDate,
      pickupTime,
      truckAssigned,
      status: "Scheduled",
    });

    await newPickup.save();
    return res.status(201).json({ success: true, pickup: newPickup });

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, error: "Server error while scheduling pickup" });
  }
});

// @desc    Get all pickups
// @route   GET /api/pickups
router.get("/", async (req, res) => {
  try {
    const pickups = await Pickup.find().populate("orderId"); // include order details
    return res.status(200).json({ success: true, pickups });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, error: "Server error while fetching pickups" });
  }
});

// @desc    Get a single pickup by ID
// @route   GET /api/pickups/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid Pickup ID" });
    }

    const pickup = await Pickup.findById(id).populate("orderId");
    if (!pickup) {
      return res.status(404).json({ success: false, error: "Pickup not found" });
    }

    return res.status(200).json({ success: true, pickup });

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, error: "Server error while fetching pickup" });
  }
});

// @desc    Update pickup status or details
// @route   PUT /api/pickups/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid Pickup ID" });
    }

    const pickup = await Pickup.findById(id);
    if (!pickup) {
      return res.status(404).json({ success: false, error: "Pickup not found" });
    }

    // Only allow updates to certain fields
    const allowedUpdates = ["pickupDate", "pickupTime", "truckAssigned", "status"];
    allowedUpdates.forEach((key) => {
      if (req.body[key] !== undefined) pickup[key] = req.body[key];
    });

    await pickup.save();
    return res.status(200).json({ success: true, pickup });

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, error: "Server error while updating pickup" });
  }
});

// @desc    Delete a pickup
// @route   DELETE /api/pickups/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid Pickup ID" });
    }

    const pickup = await Pickup.findByIdAndDelete(id);
    if (!pickup) {
      return res.status(404).json({ success: false, error: "Pickup not found" });
    }

    return res.status(200).json({ success: true, message: "Pickup deleted" });

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, error: "Server error while deleting pickup" });
  }
});

module.exports = router;
