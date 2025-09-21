const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  contactPerson: String,
  email: {
    type: String,
    required: true
  },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  leadTime: {
    type: Number,
    default: 7 // days
  },
  paymentTerms: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  suppliedItems: [{
    itemId: String,
    itemName: String,
    unitPrice: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Supplier', supplierSchema);