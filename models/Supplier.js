const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  email: { type: String, required: true },
  leadTime: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Supplier", supplierSchema);
