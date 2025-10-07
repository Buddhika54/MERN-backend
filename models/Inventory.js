const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    unique: true
  },
  itemName: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    required: true
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0
  },
  minimumStock: {
    type: Number,
    required: true,
    min: 0
  },
  maximumStock: {
    type: Number,
    required: true
  },
  reorderQuantity: {
    type: Number,
    default: function() {
      // Auto-calculate reorder quantity as the difference between max and min
      return this.maximumStock - this.minimumStock;
    }
  },
  unit: {
    type: String,
    required: true
  },
  location: {
    warehouse: String,
    shelf: String,
    row: String,
    bin: String
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  batchNumber: String,
  expiryDate: Date,
  lastRestocked: {
    type: Date,
    default: Date.now
  },
  unitCost: {
    type: Number,
    required: true
  },
  sellingPrice: {
    type: Number
  },
  // Keep both for compatibility
  costPerUnit: {
    type: Number,
    default: function() {
      return this.unitCost;
    }
  },
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'reorder_pending'],
    default: 'in_stock'
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate derived fields
inventorySchema.pre('save', function(next) {
  // Ensure costPerUnit matches unitCost
  if (this.unitCost && !this.costPerUnit) {
    this.costPerUnit = this.unitCost;
  }
  
  // Calculate reorderQuantity if not provided
  if (!this.reorderQuantity) {
    this.reorderQuantity = Math.max(this.maximumStock - this.minimumStock, this.minimumStock);
  }
  
  // Update status based on current stock
  this.updateStatus();
  
  next();
});

// Update status based on current stock
inventorySchema.methods.updateStatus = function() {
  if (this.currentStock <= 0) {
    this.status = 'out_of_stock';
  } else if (this.currentStock <= this.minimumStock) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
};

module.exports = mongoose.model('Inventory', inventorySchema);