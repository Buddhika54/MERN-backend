const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: false },
  product: { type: String, required: true },
  quantity: { type: Number, required: true },
  productSpecs: { type: String },
  deliveryInstructions: { type: String },
  status: { type: String, enum: ["Pending", "Confirmed", "Dispatched", "Delivered"], default: "Pending" },
  tax: { type: Number, default: 0 }, // optional
  totalAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Invoice", invoiceSchema);
