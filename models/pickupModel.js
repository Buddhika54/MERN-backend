const mongoose = require("mongoose");

const pickupSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId, // Use ObjectId type
      ref: "Order", // Reference the Order model
      required: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    pickupDate: {
      type: Date,
      required: true,
    },
    pickupTime: {
      type: String,
      required: true,
    },
    truckAssigned: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Scheduled", "PickedUp", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false, // optional: remove __v field
  }
);

const Pickup = mongoose.model("Pickup", pickupSchema);

module.exports = Pickup;
