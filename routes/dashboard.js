const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');
const stockService = require('../services/stockService');

// Get dashboard data
router.get('/', async (req, res) => {
  try {
    // Basic counts
    const totalItems = await Inventory.countDocuments();
    const lowStockItems = await Inventory.countDocuments({
      $expr: { $lte: ['$currentStock', '$minimumStock'] } // Fixed: proper field comparison
    });
    const outOfStockItems = await Inventory.countDocuments({ currentStock: { $lte: 0 } });
    const totalValue = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$currentStock', '$costPerUnit'] } }
        }
      }
    ]);

    // Recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTransactions = await StockTransaction.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Stock by category
    const stockByCategory = await Inventory.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: { $sum: { $multiply: ['$currentStock', '$costPerUnit'] } }
        }
      }
    ]);

    // Top 10 items by value
    const topItemsByValue = await Inventory.find()
      .sort({ currentStock: -1 })
      .limit(10)
      .select('itemName currentStock costPerUnit unit');

    res.json({
      summary: {
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalValue: totalValue[0]?.totalValue || 0,
        recentTransactions
      },
      stockByCategory,
      topItemsByValue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get low stock items for dashboard - FIXED
router.get('/low-stock', async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$minimumStock'] } // Fixed: proper field comparison
    })
    .populate('supplier', 'name email')
    .sort({ currentStock: 1 })
    .limit(10);
    
    res.json(lowStockItems);
  } catch (error) {
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
    .sort({ createdAt: -1 })
    .limit(50);

    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;