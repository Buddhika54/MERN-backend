const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const Inventory = require('../models/Inventory');
const PurchaseOrder = require('../models/PurchaseOrder');
const { v4: uuidv4 } = require('uuid');

// Get supplier dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    // Get summary data
    const totalSuppliers = await Supplier.countDocuments();
    const activeSuppliers = await Supplier.countDocuments({ status: 'active' });
    const pendingOrders = await PurchaseOrder.countDocuments({ status: 'pending' });
    
    // Get total order value
    const totalOrderValueAgg = await PurchaseOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalOrderValue = totalOrderValueAgg.length > 0 ? totalOrderValueAgg[0].total : 0;

    // Get recent purchase orders (last 10)
    const recentOrders = await PurchaseOrder.find()
      .populate('supplier', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get supplier performance data
    const supplierPerformance = await PurchaseOrder.aggregate([
      {
        $match: { status: { $in: ['delivered', 'approved'] } }
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
          ordersDelivered: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      {
        $addFields: {
          onTimePercentage: {
            $multiply: [
              { $divide: ['$ordersDelivered', '$totalOrders'] },
              100
            ]
          }
        }
      },
      { $limit: 5 }
    ]);

    // Get orders by status
    const ordersByStatusAgg = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const ordersByStatus = {};
    ordersByStatusAgg.forEach(item => {
      ordersByStatus[item._id] = item.count;
    });

    const dashboardData = {
      summary: {
        totalSuppliers,
        activeSuppliers,
        pendingOrders,
        totalOrderValue
      },
      recentOrders,
      supplierPerformance,
      ordersByStatus
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching supplier dashboard data:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all suppliers
router.get('/', async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single supplier
router.get('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ supplierId: req.params.id });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new supplier
router.post('/', async (req, res) => {
  try {
    const supplier = new Supplier({
      ...req.body,
      supplierId: req.body.supplierId || `SUP-${uuidv4().substring(0, 8).toUpperCase()}`
    });
    
    const savedSupplier = await supplier.save();
    res.status(201).json(savedSupplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update supplier
router.put('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { supplierId: req.params.id },
      req.body,
      { new: true }
    );
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete supplier
router.delete('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ supplierId: req.params.id });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Check if supplier has associated inventory items
    const inventoryCount = await Inventory.countDocuments({ 'supplier': supplier._id });
    if (inventoryCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete supplier. It has ${inventoryCount} associated inventory items. Please reassign these items to another supplier first.`,
        hasAssociatedItems: true,
        itemCount: inventoryCount
      });
    }

    // Check if supplier has active purchase orders
    const activePurchaseOrders = await PurchaseOrder.countDocuments({ 
      supplier: supplier._id, 
      status: { $in: ['pending', 'approved', 'sent'] } 
    });
    
    if (activePurchaseOrders > 0) {
      return res.status(400).json({ 
        message: `Cannot delete supplier. It has ${activePurchaseOrders} active purchase orders. Please complete or cancel these orders first.`,
        hasActivePurchaseOrders: true,
        orderCount: activePurchaseOrders
      });
    }

    // If no associated items or active orders, proceed with deletion
    await Supplier.deleteOne({ supplierId: req.params.id });
    
    res.json({ 
      message: 'Supplier deleted successfully',
      deletedSupplierId: req.params.id
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get supplier statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ supplierId: req.params.id });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Get inventory items count
    const inventoryCount = await Inventory.countDocuments({ 'supplier': supplier._id });
    
    // Get purchase orders statistics
    const totalOrders = await PurchaseOrder.countDocuments({ supplier: supplier._id });
    const pendingOrders = await PurchaseOrder.countDocuments({ 
      supplier: supplier._id, 
      status: 'pending' 
    });
    const completedOrders = await PurchaseOrder.countDocuments({ 
      supplier: supplier._id, 
      status: 'delivered' 
    });

    // Calculate total order value
    const orderValueAgg = await PurchaseOrder.aggregate([
      { $match: { supplier: supplier._id } },
      { $group: { _id: null, totalValue: { $sum: '$totalAmount' } } }
    ]);

    const totalOrderValue = orderValueAgg.length > 0 ? orderValueAgg[0].totalValue : 0;

    res.json({
      supplierId: supplier.supplierId,
      name: supplier.name,
      stats: {
        inventoryItems: inventoryCount,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalOrderValue,
        status: supplier.status,
        leadTime: supplier.leadTime
      }
    });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Deactivate supplier (soft delete alternative)
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { supplierId: req.params.id },
      { status: 'inactive' },
      { new: true }
    );
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json({ 
      message: 'Supplier deactivated successfully',
      supplier
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reactivate supplier
router.patch('/:id/reactivate', async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { supplierId: req.params.id },
      { status: 'active' },
      { new: true }
    );
    
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    
    res.json({ 
      message: 'Supplier reactivated successfully',
      supplier
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;