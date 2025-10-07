const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const warehouseService = require('../services/warehouseService');

// Get all warehouses with inventory counts
router.get('/', async (req, res) => {
  try {
    const warehouses = await Warehouse.aggregate([
      {
        $lookup: {
          from: 'inventories',
          localField: '_id', // Use _id instead of code
          foreignField: 'location.warehouse',
          as: 'inventory'
        }
      },
      {
        $addFields: {
          inventoryCount: { $size: '$inventory' },
          totalValue: {
            $sum: {
              $map: {
                input: '$inventory',
                as: 'item',
                in: { $multiply: [{ $ifNull: ['$$item.currentStock', 0] }, { $ifNull: ['$$item.unitCost', 0] }] }
              }
            }
          }
        }
      },
      {
        $project: {
          inventory: 0
        }
      }
    ]);

    res.json(warehouses);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ message: 'Error fetching warehouses', error: error.message });
  }
});

// Get warehouse statistics
router.get('/stats', async (req, res) => {
  try {
    const totalWarehouses = await Warehouse.countDocuments();
    const activeWarehouses = await Warehouse.countDocuments({ status: 'active' });
    
    const capacityStats = await Warehouse.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: { $ifNull: ['$capacity', 0] } },
          averageCapacity: { $avg: { $ifNull: ['$capacity', 0] } }
        }
      }
    ]);

    // Calculate average utilization
    const warehouses = await Warehouse.aggregate([
      {
        $lookup: {
          from: 'inventories',
          localField: 'code',
          foreignField: 'location.warehouse',
          as: 'inventory'
        }
      },
      {
        $addFields: {
          inventoryCount: { $size: '$inventory' },
          utilization: {
            $cond: {
              if: { $gt: [{ $ifNull: ['$capacity', 0] }, 0] },
              then: { $multiply: [{ $divide: [{ $size: '$inventory' }, { $ifNull: ['$capacity', 1] }] }, 100] },
              else: 0
            }
          }
        }
      }
    ]);

    const averageUtilization = warehouses.length > 0 
      ? warehouses.reduce((sum, w) => sum + (w.utilization || 0), 0) / warehouses.length 
      : 0;

    res.json({
      total: totalWarehouses,
      active: activeWarehouses,
      inactive: totalWarehouses - activeWarehouses,
      totalCapacity: capacityStats.length > 0 ? capacityStats[0].totalCapacity : 0,
      averageCapacity: capacityStats.length > 0 ? capacityStats[0].averageCapacity : 0,
      averageUtilization: Math.round(averageUtilization * 10) / 10
    });
  } catch (error) {
    console.error('Error fetching warehouse stats:', error);
    res.status(500).json({ message: 'Error fetching warehouse stats', error: error.message });
  }
});

// Get inventory distribution by warehouse
router.get('/inventory-distribution', async (req, res) => {
  try {
    const distribution = await Warehouse.aggregate([
      {
        $lookup: {
          from: 'inventories',
          localField: '_id', // Use _id instead of code
          foreignField: 'location.warehouse',
          as: 'inventory'
        }
      },
      {
        $project: {
          warehouseName: { $ifNull: ['$name', 'Unknown Warehouse'] },
          warehouseCode: { $ifNull: ['$code', 'N/A'] },
          itemCount: { $size: '$inventory' },
          totalValue: {
            $sum: {
              $map: {
                input: '$inventory',
                as: 'item',
                in: { $multiply: [{ $ifNull: ['$$item.currentStock', 0] }, { $ifNull: ['$$item.unitCost', 0] }] }
              }
            }
          }
        }
      }
    ]);

    res.json(distribution);
  } catch (error) {
    console.error('Error fetching inventory distribution:', error);
    res.status(500).json({ message: 'Error fetching inventory distribution', error: error.message });
  }
});

// Get single warehouse
router.get('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Get inventory for this warehouse
    const inventory = await Inventory.find({ 'location.warehouse': warehouse.code });
    
    const warehouseWithInventory = {
      ...warehouse.toObject(),
      inventoryCount: inventory.length,
      totalValue: inventory.reduce((sum, item) => sum + ((item.currentStock || 0) * (item.unitPrice || 0)), 0)
    };

    res.json(warehouseWithInventory);
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(500).json({ message: 'Error fetching warehouse', error: error.message });
  }
});

// Create new warehouse
router.post('/', async (req, res) => {
  try {
    const warehouseData = {
      ...req.body,
      status: req.body.status || 'active',
      location: req.body.location || { address: '', city: '', state: '', zipCode: '', country: 'USA' },
      manager: req.body.manager || '',
      phone: req.body.phone || '',
      email: req.body.email || '',
      description: req.body.description || ''
    };

    const warehouse = new Warehouse(warehouseData);
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    console.error('Error creating warehouse:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Warehouse code already exists' });
    }
    res.status(400).json({ message: 'Error creating warehouse', error: error.message });
  }
});

// Update warehouse
router.put('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    
    res.json(warehouse);
  } catch (error) {
    console.error('Error updating warehouse:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Warehouse code already exists' });
    }
    res.status(400).json({ message: 'Error updating warehouse', error: error.message });
  }
});

// Delete warehouse
router.delete('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Check for existing inventory using ObjectId
    const inventoryCount = await Inventory.countDocuments({ 'location.warehouse': warehouse._id });
    if (inventoryCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete warehouse with existing inventory',
        inventoryCount 
      });
    }

    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ message: 'Warehouse deleted successfully' });
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    res.status(500).json({ message: 'Error deleting warehouse', error: error.message });
  }
});

// Transfer inventory between warehouses
router.post('/transfer', async (req, res) => {
  try {
    const { fromWarehouse, toWarehouse, itemId, quantity, performedBy, notes } = req.body;
    
    if (!fromWarehouse || !toWarehouse || !itemId || !quantity) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide fromWarehouse, toWarehouse, itemId and quantity.' 
      });
    }
    
    const result = await warehouseService.transferInventory(
      fromWarehouse, 
      toWarehouse, 
      itemId, 
      parseInt(quantity), 
      performedBy || 'admin', 
      notes
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error transferring inventory:', error);
    res.status(400).json({ message: error.message || 'Error transferring inventory' });
  }
});

module.exports = router;