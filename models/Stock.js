const mongoose = require("mongoose");

const StockSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
  quantity: Number,
  batchNumber: String,
  expiryDate: Date,
}, { timestamps: true });

module.exports = mongoose.model("Stock", StockSchema);
