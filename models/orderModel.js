const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
    required: true,
  },
  contactNumber: { type: String, required: true },
  product: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  productSpecs: {
    type: String, // optional
  },
  deliveryInstructions: {
    type: String, // optional
  },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Dispatched", "Delivered"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
