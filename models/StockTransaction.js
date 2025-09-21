const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
  },
  itemId: {
    type: String,
    required: true
  },
  transactionType: {
    type: String,
    enum: ['inbound', 'outbound', 'adjustment', 'transfer', 'initial_stock', 'receive', 'issue', 'adjustment_in', 'adjustment_out'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    default: 0
  },
  newStock: {
    type: Number,
    default: 0
  },
  // Keep for compatibility
  balanceAfter: {
    type: Number,
    default: function() {
      return this.newStock;
    }
  },
  reference: {
    orderId: String,
    invoiceId: String,
    purchaseOrderId: String
  },
  location: {
    from: {
      warehouse: String,
      shelf: String,
      bin: String
    },
    to: {
      warehouse: String,
      shelf: String,
      bin: String
    }
  },
  performedBy: {
    type: String,
    required: true
  },
  notes: String
}, {
  timestamps: true
});

// Pre-save middleware to ensure balanceAfter is set
stockTransactionSchema.pre('save', function(next) {
  if (!this.balanceAfter && this.newStock) {
    this.balanceAfter = this.newStock;
  }
  if (!this.newStock && this.balanceAfter) {
    this.newStock = this.balanceAfter;
  }
  next();
});

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);