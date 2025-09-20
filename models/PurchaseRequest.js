const mongoose = require("mongoose");

const PurchaseRequestSchema = new mongoose.Schema({
  prId: { type: String, unique: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
  quantity: { type: Number, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "ordered"], default: "pending" },
}, { timestamps: true });

// Auto-generate human-readable PR ID
PurchaseRequestSchema.pre("save", async function(next) {
  if (!this.prId) {
    const count = await mongoose.model("PurchaseRequest").countDocuments() + 1;
    this.prId = `PR${1000 + count}`; // e.g., PR1001
  }
  next();
});

module.exports = mongoose.model("PurchaseRequest", PurchaseRequestSchema);
