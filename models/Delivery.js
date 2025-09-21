import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  contactNumber: { type: String, required: true },
  orderQuantity: { type: Number, required: true, min: 1 },
  product: { type: String, required: true },
  status: {
    type: String,
    enum: ["Pending", "Out for Delivery", "Delivered", "Cancelled"],
    default: "Pending",
  },
}, { timestamps: true });

const Delivery = mongoose.model("Delivery", deliverySchema);

export default Delivery;
