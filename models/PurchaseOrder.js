const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `PO-${Date.now().toString().slice(-8).toUpperCase()}`;
    }
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  items: [{
    itemId: {
      type: String,
      required: true
    },
    itemName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'sent', 'received', 'partially_received', 'cancelled', 'completed'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  requestedDeliveryDate: {
    type: Date
  },
  expectedDeliveryDate: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  internalNotes: {
    type: String,
    maxlength: 1000
  },
  createdBy: {
    type: String,
    required: true,
    default: 'system'
  },
  approvedBy: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  receivedAt: {
    type: Date
  },
  paymentTerms: {
    type: String,
    default: 'Net 30'
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  tracking: {
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    status: {
      type: String,
      enum: ['not_shipped', 'in_transit', 'out_for_delivery', 'delivered', 'exception'],
      default: 'not_shipped'
    }
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ priority: 1 });
purchaseOrderSchema.index({ createdAt: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });

// Virtual for formatted PO number
purchaseOrderSchema.virtual('formattedPoNumber').get(function() {
  return this.poNumber || `PO-${this._id.toString().slice(-8).toUpperCase()}`;
});

// Method to calculate total amount
purchaseOrderSchema.methods.calculateTotal = function() {
  this.totalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  return this.totalAmount;
};

// Method to update status
purchaseOrderSchema.methods.updateStatus = function(newStatus, updatedBy = 'system') {
  const previousStatus = this.status;
  this.status = newStatus;
  
  // Set appropriate timestamps
  switch (newStatus) {
    case 'approved':
      this.approvedAt = new Date();
      this.approvedBy = updatedBy;
      break;
    case 'sent':
      this.sentAt = new Date();
      break;
    case 'received':
    case 'completed':
      this.receivedAt = new Date();
      this.actualDeliveryDate = new Date();
      break;
  }

  console.log(`PO ${this.poNumber} status changed from ${previousStatus} to ${newStatus}`);
};

// Static method to find overdue orders
purchaseOrderSchema.statics.findOverdueOrders = function() {
  const today = new Date();
  return this.find({
    status: { $in: ['approved', 'sent'] },
    expectedDeliveryDate: { $lt: today }
  }).populate('supplier');
};

// Static method to find urgent orders
purchaseOrderSchema.statics.findUrgentOrders = function() {
  return this.find({
    priority: 'urgent',
    status: { $in: ['draft', 'pending', 'approved', 'sent'] }
  }).populate('supplier');
};

// Pre-save middleware
purchaseOrderSchema.pre('save', function(next) {
  // Recalculate total if items have changed
  if (this.isModified('items')) {
    this.calculateTotal();
  }
  
  // Set default delivery dates
  if (!this.expectedDeliveryDate && this.requestedDeliveryDate) {
    this.expectedDeliveryDate = this.requestedDeliveryDate;
  }
  
  next();
});

// Post-save middleware for logging
purchaseOrderSchema.post('save', function(doc) {
  console.log(`Purchase Order ${doc.poNumber} saved with status: ${doc.status}`);
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);