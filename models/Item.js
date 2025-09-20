const mongoose = require("mongoose");
const Notification = require("./Notification");

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  reorderLevel: { type: Number, required: true },
  category: {
    type: String,
    enum: ["raw_material", "packaging", "equipment"], // allowed categories
    required: true
  },
  unit: { type: String, required: true, default: "kg" } // optional: you can change
}, { timestamps: true });

// Middleware to trigger low stock notification
ItemSchema.post("save", async function(doc) {
  try {
    if (doc.quantity <= doc.reorderLevel) {
      // Avoid duplicate notifications
      const exists = await Notification.findOne({
        relatedItem: doc._id,
        type: "low_stock",
        read: false
      });

      if (!exists) {
        await Notification.create({
          message: `Low stock alert for item: ${doc.name} (Current: ${doc.quantity})`,
          type: "low_stock",
          relatedItem: doc._id
        });
        console.log(`Notification created for low stock: ${doc.name}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
});

module.exports = mongoose.model("Item", ItemSchema);
