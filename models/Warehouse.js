const mongoose = require("mongoose");

const WarehouseSchema = new mongoose.Schema({
  warehouseId: { type: String, unique: true },
  name: { type: String, required: true },
  location: String,
  type: { type: String, enum: ["raw_material", "finished_goods"], default: "raw_material" },
}, { timestamps: true });

WarehouseSchema.pre("save", async function(next) {
  if (!this.warehouseId) {
    const count = await mongoose.model("Warehouse").countDocuments() + 1;
    this.warehouseId = `WH${1000 + count}`; // e.g., WH1001
  }
  next();
});

module.exports = mongoose.model("Warehouse", WarehouseSchema);
