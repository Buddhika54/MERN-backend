const mongoose = require("mongoose");

const StockMovementSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
  quantity: Number,  // +incoming, -outgoing
  type: { type: String, enum: ["incoming", "outgoing", "transfer"] },
  relatedSupplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  relatedWarehouseTo: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
  notes: String
}, { timestamps: true });

module.exports = mongoose.model("StockMovement", StockMovementSchema);
