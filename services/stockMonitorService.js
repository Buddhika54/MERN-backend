const Inventory = require('../models/Inventory');
const PurchaseOrder = require('../models/PurchaseOrder');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

class StockMonitorService {
  constructor() {
    this.monitoring = false;
    this.monitoringInterval = null;
  }

  // Start monitoring stock levels
  startMonitoring() {
    if (this.monitoring) {
      console.log('📊 Stock monitoring is already running');
      return;
    }

    console.log('🚀 Starting stock monitoring service...');
    this.monitoring = true;

    // Run immediately on start
    this.checkStockLevels();

    // Schedule to run every hour
    this.monitoringInterval = cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running scheduled stock level check...');
      await this.checkStockLevels();
    });

    // Also run every 6 hours for more frequent monitoring
    cron.schedule('0 */6 * * *', async () => {
      console.log('🔍 Running detailed stock analysis...');
      await this.performDetailedStockAnalysis();
    });

    console.log('✅ Stock monitoring service started successfully');
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      this.monitoringInterval.destroy();
      this.monitoringInterval = null;
    }
    this.monitoring = false;
    console.log('⏹️ Stock monitoring service stopped');
  }

  // Check all stock levels and send alerts - FIXED QUERY
  async checkStockLevels() {
    try {
      console.log('🔍 Checking stock levels...');
      
      // Fixed: Use $expr with proper field references for comparison
      const lowStockItems = await Inventory.find({
        $or: [
          { $expr: { $lte: ['$currentStock', '$minimumStock'] } }, // Fixed: proper field comparison
          { status: 'low_stock' },
          { status: 'out_of_stock' }
        ]
      }).populate('supplier');

      console.log(`📋 Found ${lowStockItems.length} items with low stock`);

      if (lowStockItems.length === 0) {
        console.log('✅ All items are properly stocked');
        return [];
      }

      for (const item of lowStockItems) {
        try {
          // Update item status based on current stock
          item.updateStatus();
          await item.save();

          // Send email alert
          const alertResult = await emailService.sendLowStockAlert(item);
          if (alertResult.success) {
            console.log(`📧 Alert sent for ${item.itemName}`);
          } else {
            console.log(`⚠️ Failed to send alert for ${item.itemName}: ${alertResult.message}`);
          }
          
          // Auto-create purchase order if supplier exists and not already pending
          if (item.supplier && item.status !== 'reorder_pending') {
            await this.createAutoPurchaseOrder(item);
          }
        } catch (error) {
          console.error(`❌ Error processing item ${item.itemName}:`, error.message);
        }
      }

      return lowStockItems;
    } catch (error) {
      console.error('❌ Error checking stock levels:', error);
      return [];
    }
  }

  // Perform detailed stock analysis
  async performDetailedStockAnalysis() {
    try {
      console.log('📊 Performing detailed stock analysis...');

      // Get all inventory items
      const allItems = await Inventory.find({}).populate('supplier');
      
      const analysis = {
        totalItems: allItems.length,
        lowStock: 0,
        outOfStock: 0,
        criticalStock: 0,
        normalStock: 0,
        totalValue: 0
      };

      allItems.forEach(item => {
        const stockValue = item.currentStock * (item.unitCost || item.costPerUnit || 0);
        analysis.totalValue += stockValue;

        if (item.currentStock <= 0) {
          analysis.outOfStock++;
        } else if (item.currentStock <= item.minimumStock * 0.5) {
          analysis.criticalStock++;
        } else if (item.currentStock <= item.minimumStock) {
          analysis.lowStock++;
        } else {
          analysis.normalStock++;
        }
      });

      console.log('📈 Stock Analysis Summary:', {
        ...analysis,
        totalValue: `$${analysis.totalValue.toFixed(2)}`
      });

      return analysis;
    } catch (error) {
      console.error('❌ Error performing stock analysis:', error);
      return null;
    }
  }

  // Create automatic purchase order for low stock items
  async createAutoPurchaseOrder(item) {
    try {
      // Check if there's already a pending PO for this item
      const existingPO = await PurchaseOrder.findOne({
        'items.itemId': item.itemId,
        status: { $in: ['draft', 'pending', 'approved', 'sent'] }
      });

      if (existingPO) {
        console.log(`📋 Purchase order already exists for ${item.itemName}`);
        return null;
      }

      // Find supplier information for this item
      if (!item.supplier) {
        console.log(`⚠️ No supplier found for ${item.itemName}`);
        return null;
      }

      const reorderQty = item.reorderQuantity || (item.maximumStock - item.currentStock);
      const unitPrice = item.unitCost || item.costPerUnit || 0;
      const totalPrice = reorderQty * unitPrice;

      const purchaseOrder = new PurchaseOrder({
        poNumber: `PO-${Date.now().toString().slice(-8).toUpperCase()}`,
        supplier: item.supplier._id,
        items: [{
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: reorderQty,
          unitPrice: unitPrice,
          totalPrice: totalPrice
        }],
        totalAmount: totalPrice,
        status: 'draft',
        priority: item.currentStock <= 0 ? 'urgent' : 'normal',
        expectedDeliveryDate: this.calculateExpectedDelivery(item.supplier.leadTime || 7),
        notes: `Auto-generated PO for low stock item: ${item.itemName}. Current stock: ${item.currentStock}, Minimum: ${item.minimumStock}`,
        createdBy: 'system',
        createdAt: new Date()
      });

      await purchaseOrder.save();
      console.log(`✅ Auto PO created: ${purchaseOrder.poNumber} for ${item.itemName} (Qty: ${reorderQty}, Value: $${totalPrice.toFixed(2)})`);

      // Update item status to indicate reorder is pending
      item.status = 'reorder_pending';
      await item.save();

      return purchaseOrder;

    } catch (error) {
      console.error(`❌ Error creating auto PO for ${item.itemName}:`, error.message);
      return null;
    }
  }

  // Calculate expected delivery date based on lead time
  calculateExpectedDelivery(leadTimeDays = 7) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + leadTimeDays);
    return expectedDate;
  }

  // Get monitoring status
  getMonitoringStatus() {
    return {
      isMonitoring: this.monitoring,
      startedAt: this.startedAt,
      lastCheck: this.lastCheck
    };
  }

  // Manual trigger for stock check (for testing or immediate needs)
  async triggerStockCheck() {
    console.log('🔄 Manual stock check triggered...');
    return await this.checkStockLevels();
  }

  // Get stock alerts summary
  async getStockAlertsSummary() {
    try {
      const lowStockCount = await Inventory.countDocuments({
        status: { $in: ['low_stock', 'out_of_stock'] }
      });

      const outOfStockCount = await Inventory.countDocuments({
        status: 'out_of_stock'
      });

      const criticalStockCount = await Inventory.countDocuments({
        $expr: { $lte: ['$currentStock', 5] } // Fixed: proper field comparison
      });

      const pendingReorders = await PurchaseOrder.countDocuments({
        status: { $in: ['draft', 'pending', 'approved'] }
      });

      return {
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        criticalStock: criticalStockCount,
        pendingReorders,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error getting stock alerts summary:', error);
      return null;
    }
  }

  // Get all low stock items for immediate action
  async getLowStockItems() {
    try {
      return await Inventory.find({
        $expr: { $lte: ['$currentStock', '$minimumStock'] } // Fixed: proper field comparison
      }).populate('supplier', 'name email phone');
    } catch (error) {
      console.error('❌ Error getting low stock items:', error);
      return [];
    }
  }

  // Get out of stock items
  async getOutOfStockItems() {
    try {
      return await Inventory.find({
        currentStock: { $lte: 0 }
      }).populate('supplier', 'name email phone');
    } catch (error) {
      console.error('❌ Error getting out of stock items:', error);
      return [];
    }
  }

  // Send bulk reorder notifications for low stock items
  async sendBulkReorderNotifications() {
    try {
      const lowStockItems = await this.getLowStockItems();
      
      if (lowStockItems.length === 0) {
        console.log('✅ No low stock items found for reorder notifications');
        return { success: true, message: 'No items requiring reorder', items: 0 };
      }

      console.log(`📧 Sending bulk reorder notifications for ${lowStockItems.length} items...`);
      
      const result = await emailService.sendBulkReorderNotifications(lowStockItems);
      
      if (result.success) {
        console.log(`✅ Bulk reorder notifications sent: ${result.sent} successful, ${result.failed} failed`);
      } else {
        console.log(`❌ Failed to send bulk reorder notifications: ${result.message}`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending bulk reorder notifications:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new StockMonitorService();