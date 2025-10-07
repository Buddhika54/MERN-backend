const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');

// Get dashboard analytics (main endpoint)
router.get('/analytics', async (req, res) => {
  try {
    // Basic inventory counts
    const totalItems = await Inventory.countDocuments();
    
    const lowStockItems = await Inventory.countDocuments({
      $expr: { $lte: ['$currentStock', '$minimumStock'] }
    });
    
    const outOfStockItems = await Inventory.countDocuments({ 
      currentStock: { $lte: 0 } 
    });

    // Calculate total inventory value
    const totalValueResult = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { 
            $sum: { 
              $multiply: [
                '$currentStock', 
                { $ifNull: ['$unitCost', { $ifNull: ['$costPerUnit', 0] }] }
              ] 
            } 
          }
        }
      }
    ]);
    
    const totalValue = totalValueResult.length > 0 ? totalValueResult[0].totalValue : 0;

    // Recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTransactions = await StockTransaction.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Stock by category with enhanced data
    const stockByCategory = await Inventory.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { 
            $sum: { 
              $multiply: [
                '$currentStock', 
                { $ifNull: ['$unitCost', { $ifNull: ['$costPerUnit', 0] }] }
              ] 
            } 
          },
          lowStockCount: {
            $sum: {
              $cond: [
                { $lte: ['$currentStock', '$minimumStock'] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { totalStock: -1 } }
    ]);

    // Top 10 items by value - FIXED: Use aggregation instead of find + sort
    const topItemsByValue = await Inventory.aggregate([
      {
        $addFields: {
          itemValue: {
            $multiply: [
              '$currentStock', 
              { $ifNull: ['$unitCost', { $ifNull: ['$costPerUnit', 0] }] }
            ]
          }
        }
      },
      {
        $sort: { itemValue: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          itemId: 1,
          itemName: 1,
          currentStock: 1,
          unitCost: 1,
          costPerUnit: 1,
          unit: 1,
          category: 1,
          itemValue: 1
        }
      }
    ]);

    // Stock status distribution
    const stockStatusDistribution = await Inventory.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Pending purchase orders
    const pendingPurchaseOrders = await PurchaseOrder.countDocuments({
      status: { $in: ['draft', 'pending', 'approved'] }
    });

    // Total purchase order value (this month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyPOValue = await PurchaseOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Critical items (stock below 50% of minimum)
    const criticalItems = await Inventory.find({
      $expr: { 
        $lte: ['$currentStock', { $multiply: ['$minimumStock', 0.5] }] 
      }
    }).select('itemId itemName currentStock minimumStock category supplier').populate('supplier', 'name');

    res.json({
      summary: {
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalValue: Math.round(totalValue),
        recentTransactions,
        pendingPurchaseOrders,
        monthlyPOValue: monthlyPOValue.length > 0 ? monthlyPOValue[0].total : 0,
        criticalItemsCount: criticalItems.length
      },
      stockByCategory,
      topItemsByValue,
      stockStatusDistribution,
      criticalItems: criticalItems.slice(0, 5), // Top 5 critical items
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard data',
      error: error.message 
    });
  }
});

// Get real-time stock alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = [];

    // Critical stock alerts
    const criticalItems = await Inventory.find({
      currentStock: { $lte: 0 }
    }).select('itemId itemName currentStock category');

    criticalItems.forEach(item => {
      alerts.push({
        id: `critical-${item.itemId}`,
        type: 'critical',
        title: `Out of Stock: ${item.itemName}`,
        message: `${item.itemName} is completely out of stock`,
        timestamp: new Date(),
        actionRequired: true
      });
    });

    // Low stock alerts
    const lowStockItems = await Inventory.find({
      $expr: { 
        $and: [
          { $lte: ['$currentStock', '$minimumStock'] },
          { $gt: ['$currentStock', 0] }
        ]
      }
    }).select('itemId itemName currentStock minimumStock category').limit(5);

    lowStockItems.forEach(item => {
      alerts.push({
        id: `low-${item.itemId}`,
        type: 'warning',
        title: `Low Stock: ${item.itemName}`,
        message: `Current: ${item.currentStock}, Minimum: ${item.minimumStock}`,
        timestamp: new Date(),
        actionRequired: true
      });
    });

    res.json(alerts);
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ message: 'Failed to fetch alerts' });
  }
});

// Get low stock items for dashboard
router.get('/low-stock', async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$minimumStock'] }
    })
    .populate('supplier', 'name email')
    .sort({ currentStock: 1 })
    .limit(10)
    .select('itemId itemName currentStock minimumStock unit category supplier status');
    
    res.json(lowStockItems);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get stock movements (last 30 days)
router.get('/stock-movements', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const movements = await StockTransaction.find({
      createdAt: { $gte: thirtyDaysAgo }
    })
    .populate('itemId', 'itemName')
    .sort({ createdAt: -1 })
    .limit(50)
    .select('itemId transactionType quantity newStock createdAt performedBy notes');

    res.json(movements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get inventory trends (for charts)
router.get('/trends', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Daily stock movements
    const dailyMovements = await StockTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          inbound: {
            $sum: {
              $cond: [
                { $in: ['$transactionType', ['inbound', 'receive', 'initial_stock']] },
                '$quantity',
                0
              ]
            }
          },
          outbound: {
            $sum: {
              $cond: [
                { $in: ['$transactionType', ['outbound', 'issue']] },
                '$quantity',
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(dailyMovements);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get dashboard summary for quick overview
router.get('/summary', async (req, res) => {
  try {
    const summary = await Promise.all([
      Inventory.countDocuments(),
      Inventory.countDocuments({ $expr: { $lte: ['$currentStock', '$minimumStock'] } }),
      Inventory.countDocuments({ currentStock: { $lte: 0 } }),
      PurchaseOrder.countDocuments({ status: { $in: ['draft', 'pending', 'approved'] } }),
      StockTransaction.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
    ]);

    res.json({
      totalItems: summary[0],
      lowStockItems: summary[1],
      outOfStockItems: summary[2],
      pendingPurchaseOrders: summary[3],
      recentTransactions: summary[4],
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ message: error.message });
  }
});

// Test endpoint for debugging
router.get('/test', async (req, res) => {
  try {
    const inventoryCount = await Inventory.countDocuments();
    const transactionCount = await StockTransaction.countDocuments();
    const purchaseOrderCount = await PurchaseOrder.countDocuments();
    
    res.json({
      message: 'Dashboard API is working',
      counts: {
        inventory: inventoryCount,
        transactions: transactionCount,
        purchaseOrders: purchaseOrderCount
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Dashboard test error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;