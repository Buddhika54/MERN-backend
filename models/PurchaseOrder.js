const mongoose = require("mongoose");

const PurchaseOrderSchema = new mongoose.Schema({
  poId: { type: String, unique: true },
  pr: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseRequest" },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
  quantity: Number,
  status: { type: String, enum: ["pending", "delivered", "cancelled"], default: "pending" },
  deliveryDate: Date,
}, { timestamps: true });

PurchaseOrderSchema.pre("save", async function(next) {
  if (!this.poId) {
    const count = await mongoose.model("PurchaseOrder").countDocuments() + 1;
    this.poId = `PO${1000 + count}`; // e.g., PO1001
  }
  next();
});

module.exports = mongoose.model("PurchaseOrder", PurchaseOrderSchema);
