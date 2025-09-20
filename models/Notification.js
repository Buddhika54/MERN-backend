const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: false },
  message: { type: String, required: true },
  type: { type: String, enum: ["low_stock", "info"], default: "info" },
  relatedItem: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
