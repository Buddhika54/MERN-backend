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
  items: {
    type: Number,
    min: 1,
    default: 1,
  },
  productSpecs: {
    type: String, // optional
  },
  deliveryInstructions: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
  },
  price: {
    type: Number, // total price in LKR for this order
  },
  auctionWinner: {
    type: String, // winner bidder name from auction close
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
