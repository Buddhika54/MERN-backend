const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    }
  },
  type: {
    type: String,
    enum: ['low_stock', 'out_of_stock', 'reorder_request', 'system_alert', 'supplier_alert', 'order_status'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['inventory', 'supplier', 'order', 'system']
    },
    entityId: String,
    entityName: String
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'dismissed', 'resolved'],
    default: 'unread'
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionUrl: String,
  recipients: [{
    type: String // emails or user IDs
  }],
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  readBy: [{
    user: String,
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolvedBy: String,
  resolvedAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for performance
notificationSchema.index({ type: 1, status: 1, priority: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ 'relatedEntity.entityId': 1 });

module.exports = mongoose.model('Notification', notificationSchema);