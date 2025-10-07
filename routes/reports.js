const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const Notification = require('../models/Notification');

// Get monthly report data
router.get('/monthly', async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    
    // Inventory Summary
    const totalItems = await Inventory.countDocuments();
    const lowStockItems = await Inventory.countDocuments({
      $expr: { $lte: ['$currentStock', '$minimumStock'] } // Fixed: proper field comparison
    });
    const outOfStockItems = await Inventory.countDocuments({ currentStock: 0 });
    const totalInventoryValue = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: {
              $multiply: ['$currentStock', { $ifNull: ['$unitCost', '$costPerUnit', 0] }]
            }
          }
        }
      }
    ]);
    
    // Transaction Analysis
    const monthlyTransactions = await StockTransaction.find({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    const transactionStats = {
      totalTransactions: monthlyTransactions.length,
      inbound: monthlyTransactions.filter(t => ['inbound', 'receive', 'initial_stock'].includes(t.transactionType)).length,
      outbound: monthlyTransactions.filter(t => ['outbound', 'issue'].includes(t.transactionType)).length,
      adjustments: monthlyTransactions.filter(t => t.transactionType.includes('adjustment')).length
    };
    
    // Daily transaction trends
    const dailyTransactions = {};
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      dailyTransactions[dateKey] = { inbound: 0, outbound: 0 };
    }
    
    monthlyTransactions.forEach(transaction => {
      const dateKey = transaction.createdAt.toISOString().split('T')[0];
      if (dailyTransactions[dateKey]) {
        if (['inbound', 'receive', 'initial_stock'].includes(transaction.transactionType)) {
          dailyTransactions[dateKey].inbound += transaction.quantity;
        } else if (['outbound', 'issue'].includes(transaction.transactionType)) {
          dailyTransactions[dateKey].outbound += transaction.quantity;
        }
      }
    });
    
    // Category-wise analysis
    const categoryAnalysis = await Inventory.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalStock: { $sum: '$currentStock' },
          totalValue: {
            $sum: {
              $multiply: ['$currentStock', { $ifNull: ['$unitCost', '$costPerUnit', 0] }]
            }
          },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$currentStock', '$minimumStock'] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$currentStock', 0] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);
    
    // Purchase Orders Analysis
    const purchaseOrders = await PurchaseOrder.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('supplier', 'name');
    
    const purchaseOrderStats = {
      totalOrders: purchaseOrders.length,
      totalValue: purchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0),
      pending: purchaseOrders.filter(po => po.status === 'pending').length,
      approved: purchaseOrders.filter(po => po.status === 'approved').length,
      completed: purchaseOrders.filter(po => po.status === 'completed').length,
      cancelled: purchaseOrders.filter(po => po.status === 'cancelled').length
    };
    
    // Supplier Performance
    const supplierPerformance = await PurchaseOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['completed', 'approved'] }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      {
        $unwind: '$supplierInfo'
      },
      {
        $group: {
          _id: '$supplier',
          supplierName: { $first: '$supplierInfo.name' },
          totalOrders: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          onTimeDeliveries: {
            $sum: {
              $cond: [
                { $lte: ['$actualDeliveryDate', '$expectedDeliveryDate'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          onTimePercentage: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              { $multiply: [{ $divide: ['$onTimeDeliveries', '$totalOrders'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);
    
    // Most Active Items
    const mostActiveItems = await StockTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$itemId',
          totalTransactions: { $sum: 1 },
          totalQuantityMoved: { $sum: { $abs: '$quantity' } },
          inboundTransactions: {
            $sum: {
              $cond: [
                { $in: ['$transactionType', ['inbound', 'receive', 'initial_stock']] },
                1,
                0
              ]
            }
          },
          outboundTransactions: {
            $sum: {
              $cond: [
                { $in: ['$transactionType', ['outbound', 'issue']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'inventories',
          localField: '_id',
          foreignField: 'itemId',
          as: 'itemInfo'
        }
      },
      {
        $unwind: '$itemInfo'
      },
      {
        $project: {
          itemId: '$_id',
          itemName: '$itemInfo.itemName',
          category: '$itemInfo.category',
          totalTransactions: 1,
          totalQuantityMoved: 1,
          inboundTransactions: 1,
          outboundTransactions: 1,
          currentStock: '$itemInfo.currentStock'
        }
      },
      { $sort: { totalQuantityMoved: -1 } },
      { $limit: 10 }
    ]);
    
    // Notifications Summary
    const notificationStats = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          critical: {
            $sum: {
              $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0]
            }
          },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    res.json({
      period: {
        month: targetMonth,
        year: targetYear,
        monthName: startDate.toLocaleString('default', { month: 'long' }),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: {
        inventory: {
          totalItems,
          lowStockItems,
          outOfStockItems,
          totalValue: totalInventoryValue[0]?.totalValue || 0,
          stockTurnover: transactionStats.outbound / Math.max(totalItems, 1)
        },
        transactions: transactionStats,
        purchaseOrders: purchaseOrderStats,
        notifications: {
          total: notificationStats.reduce((sum, stat) => sum + stat.count, 0),
          byType: notificationStats
        }
      },
      analytics: {
        dailyTransactionTrend: dailyTransactions,
        categoryAnalysis,
        supplierPerformance,
        mostActiveItems
      },
      recommendations: generateRecommendations({
        lowStockItems,
        outOfStockItems,
        categoryAnalysis,
        supplierPerformance,
        mostActiveItems
      })
    });
    
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ message: 'Failed to generate monthly report' });
  }
});

// Generate recommendations based on data analysis
function generateRecommendations(data) {
  const recommendations = [];
  
  if (data.outOfStockItems > 0) {
    recommendations.push({
      type: 'critical',
      title: 'Immediate Stock Replenishment Required',
      message: `${data.outOfStockItems} items are currently out of stock and need immediate attention.`,
      action: 'Create emergency purchase orders for out-of-stock items'
    });
  }
  
  if (data.lowStockItems > data.outOfStockItems) {
    const lowButNotOut = data.lowStockItems - data.outOfStockItems;
    recommendations.push({
      type: 'warning',
      title: 'Stock Replenishment Needed',
      message: `${lowButNotOut} items are running low and should be reordered soon.`,
      action: 'Review and create purchase orders for low-stock items'
    });
  }
  
  // Find underperforming suppliers
  const underPerformingSuppliers = data.supplierPerformance?.filter(s => s.onTimePercentage < 80);
  if (underPerformingSuppliers?.length > 0) {
    recommendations.push({
      type: 'info',
      title: 'Supplier Performance Review',
      message: `${underPerformingSuppliers.length} suppliers have on-time delivery rates below 80%.`,
      action: 'Schedule performance reviews with underperforming suppliers'
    });
  }
  
  // Check for slow-moving items
  const slowMovingCategories = data.categoryAnalysis?.filter(cat => 
    cat.totalItems > 0 && (cat.totalStock / cat.totalItems) > 100
  );
  if (slowMovingCategories?.length > 0) {
    recommendations.push({
      type: 'info',
      title: 'Optimize Inventory Levels',
      message: `Some categories have high average stock levels which may indicate slow movement.`,
      action: 'Review and adjust minimum/maximum stock levels for slow-moving categories'
    });
  }
  
  return recommendations;
}

// Get year-over-year comparison
router.get('/yearly-comparison', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    const getYearlyStats = async (year) => {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      
      const transactions = await StockTransaction.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      });
      
      const purchaseOrders = await PurchaseOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalValue: { $sum: '$totalAmount' }
          }
        }
      ]);
      
      return {
        year,
        transactions,
        purchaseOrders: purchaseOrders[0]?.count || 0,
        purchaseValue: purchaseOrders[0]?.totalValue || 0
      };
    };
    
    const [currentYearStats, previousYearStats] = await Promise.all([
      getYearlyStats(currentYear),
      getYearlyStats(previousYear)
    ]);
    
    const comparison = {
      current: currentYearStats,
      previous: previousYearStats,
      growth: {
        transactions: calculateGrowth(currentYearStats.transactions, previousYearStats.transactions),
        purchaseOrders: calculateGrowth(currentYearStats.purchaseOrders, previousYearStats.purchaseOrders),
        purchaseValue: calculateGrowth(currentYearStats.purchaseValue, previousYearStats.purchaseValue)
      }
    };
    
    res.json(comparison);
    
  } catch (error) {
    console.error('Error generating yearly comparison:', error);
    res.status(500).json({ message: error.message });
  }
});

function calculateGrowth(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

module.exports = router;