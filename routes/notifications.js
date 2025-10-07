const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Inventory = require('../models/Inventory');
const emailService = require('../services/emailService');

// Get all notifications with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      status = 'all', 
      type = 'all', 
      priority = 'all', 
      limit = 50, 
      page = 1 
    } = req.query;
    
    let filter = {};
    
    if (status !== 'all') {
      filter.status = status;
    }
    if (type !== 'all') {
      filter.type = type;
    }
    if (priority !== 'all') {
      filter.priority = priority;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await Notification.countDocuments(filter);
    
    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: notifications.length,
        totalCount: total
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      Notification.countDocuments({ status: 'unread' }),
      Notification.countDocuments({ priority: 'critical', status: { $ne: 'resolved' } }),
      Notification.countDocuments({ priority: 'high', status: { $ne: 'resolved' } }),
      Notification.countDocuments({ actionRequired: true, status: 'unread' }),
      Notification.countDocuments({ type: 'low_stock', status: { $ne: 'resolved' } }),
      Notification.countDocuments({ type: 'reorder_request', status: 'unread' })
    ]);
    
    res.json({
      unread: stats[0],
      critical: stats[1],
      high: stats[2],
      actionRequired: stats[3],
      lowStock: stats[4],
      reorderRequests: stats[5]
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { userId = 'admin' } = req.body;
    
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        status: 'read',
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as resolved
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { userId = 'admin', notes } = req.body;
    
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolvedBy: userId,
        resolvedAt: new Date(),
        $set: {
          'metadata.resolutionNotes': notes
        }
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error resolving notification:', error);
    res.status(500).json({ message: error.message });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', async (req, res) => {
  try {
    const { userId = 'admin' } = req.body;
    
    const result = await Notification.updateMany(
      { status: 'unread' },
      {
        status: 'read',
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );
    
    res.json({ message: `Marked ${result.modifiedCount} notifications as read` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: error.message });
  }
});

// Send low stock notifications
router.post('/send-low-stock-alerts', async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$minimumStock'] }
    }).populate('supplier', 'name email');
    
    const notifications = [];
    const emailPromises = [];
    
    for (const item of lowStockItems) {
      const priority = item.currentStock <= 0 ? 'critical' : 
                      item.currentStock <= item.minimumStock * 0.5 ? 'high' : 'medium';
      
      const notification = new Notification({
        type: 'low_stock',
        priority,
        title: item.currentStock <= 0 ? `Out of Stock: ${item.itemName}` : `Low Stock Alert: ${item.itemName}`,
        message: `${item.itemName} (${item.itemId}) is ${item.currentStock <= 0 ? 'out of stock' : 'running low'}. Current stock: ${item.currentStock} ${item.unit}, Minimum: ${item.minimumStock} ${item.unit}`,
        relatedEntity: {
          entityType: 'inventory',
          entityId: item.itemId,
          entityName: item.itemName
        },
        actionRequired: true,
        actionUrl: `/reorders?item=${item.itemId}`,
        recipients: ['inventory@teafactory.com', 'procurement@teafactory.com'],
        metadata: {
          itemId: item.itemId,
          currentStock: item.currentStock,
          minimumStock: item.minimumStock,
          supplierId: item.supplier?._id
        }
      });
      
      notifications.push(notification);
      
      // Send email notification
      if (item.supplier && item.supplier.email) {
        emailPromises.push(
          emailService.sendLowStockAlert(item.supplier.email, item)
        );
      }
    }
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      await Promise.all(emailPromises);
      
      res.json({ 
        message: `Created ${notifications.length} low stock notifications and sent emails`,
        notifications: notifications.length
      });
    } else {
      res.json({ message: 'No low stock items found' });
    }
    
  } catch (error) {
    console.error('Error sending low stock alerts:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create reorder request notification
router.post('/create-reorder-request', async (req, res) => {
  try {
    const { itemIds, requestedBy = 'system' } = req.body;
    
    if (!itemIds || itemIds.length === 0) {
      return res.status(400).json({ message: 'Item IDs are required' });
    }
    
    const items = await Inventory.find({ itemId: { $in: itemIds } }).populate('supplier');
    const notifications = [];
    
    for (const item of items) {
      const notification = new Notification({
        type: 'reorder_request',
        priority: 'high',
        title: `Reorder Request: ${item.itemName}`,
        message: `Reorder request created for ${item.itemName} (${item.itemId}). Suggested quantity: ${item.reorderQuantity || (item.maximumStock - item.currentStock)} ${item.unit}`,
        relatedEntity: {
          entityType: 'inventory',
          entityId: item.itemId,
          entityName: item.itemName
        },
        actionRequired: true,
        actionUrl: `/suppliers/orders/create?item=${item.itemId}`,
        recipients: ['procurement@teafactory.com'],
        metadata: {
          itemId: item.itemId,
          suggestedQuantity: item.reorderQuantity || (item.maximumStock - item.currentStock),
          supplierId: item.supplier?._id,
          requestedBy
        }
      });
      
      notifications.push(notification);
    }
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      res.json({ 
        message: `Created ${notifications.length} reorder request notifications`,
        notifications: notifications.length
      });
    } else {
      res.json({ message: 'No items found for reorder requests' });
    }
    
  } catch (error) {
    console.error('Error creating reorder requests:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;