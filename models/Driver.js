const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const driverSchema = new Schema({
    name: { type: String, required: true },  // ✅ add this
    licenseNumber: { type: String, required: true, unique: true },
    phone: { type: String, required: true }, // ✅ add this
    status: {
        type: String,
        enum: ['available', 'on_delivery', 'off_duty'],
        default: 'available'
    },
    rating: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Driver', driverSchema);
