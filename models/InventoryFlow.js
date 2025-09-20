
const mongoose = require("mongoose");

const InventoryFlowSchema = new mongoose.Schema({
  stage: { type: String, required: true }, // e.g. "Raw Material Received"
  description: { type: String },
  status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("InventoryFlow", InventoryFlowSchema);
