const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');
const Warehouse = require('../models/Warehouse');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// IMPORTANT: This route must come BEFORE the /:id route to avoid conflicts
// Get all stock transactions
router.get('/transactions', async (req, res) => {
  try {
    const { limit = 100, page = 1, itemId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let filter = {};
    if (itemId && itemId !== 'undefined' && itemId !== 'all') {
      filter.itemId = itemId;
    }
    
    console.log('Fetching transactions with filter:', filter); // Debug log
    
    const transactions = await StockTransaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    console.log(`Found ${transactions.length} transactions`); // Debug log
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get transactions for specific item
router.get('/transactions/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { limit = 50 } = req.query;
    
    const transactions = await StockTransaction.find({ itemId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    console.log(`Found ${transactions.length} transactions for item ${itemId}`);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching item transactions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Inventory routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Get all inventory items with warehouse info
router.get('/', async (req, res) => {
  try {
    const items = await Inventory.find()
      .populate('location.warehouse', 'name code location')
      .populate('supplier', 'name');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory', error: error.message });
  }
});

// Get inventory by warehouse
router.get('/by-warehouse/:warehouseId', async (req, res) => {
  try {
    const items = await Inventory.find({ 'location.warehouse': req.params.warehouseId })
      .populate('location.warehouse', 'name code')
      .populate('supplier', 'name');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching warehouse inventory', error: error.message });
  }
});

// Create inventory item
router.post('/', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Ensure warehouse is a valid ObjectId
    if (req.body.location && req.body.location.warehouse === "") {
      req.body.location.warehouse = null;
    }
    
    // Check warehouse capacity
    if (req.body.location?.warehouse) {
      const warehouse = await Warehouse.findById(req.body.location.warehouse).session(session);
      if (!warehouse) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Selected warehouse not found' });
      }
      
      // Calculate capacity
      const stockToAdd = req.body.currentStock || 0;
      const remainingCapacity = warehouse.capacity - warehouse.usedCapacity;
      
      if (stockToAdd > remainingCapacity) {
        // Just warn, don't block - frontend should already have warned
        console.warn(`Adding inventory exceeds warehouse capacity: ${stockToAdd} > ${remainingCapacity}`);
      }
      
      // Update warehouse used capacity
      warehouse.usedCapacity += stockToAdd;
      await warehouse.save({ session });
    }
    
    const item = new Inventory(req.body);
    await item.save({ session });
    
    // Populate warehouse info before sending response
    await item.populate('location.warehouse', 'name code remainingCapacity');
    await item.populate('supplier', 'name');
    
    await session.commitTransaction();
    res.status(201).json(item);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: 'Error creating inventory item', error: error.message });
  } finally {
    session.endSession();
  }
});

// Update inventory item
router.put('/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find existing item
    const oldItem = await Inventory.findById(req.params.id).session(session);
    if (!oldItem) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Item not found' });
    }

    const oldStock = oldItem.currentStock;
    const oldWarehouseId = oldItem.location?.warehouse?.toString();
    const newWarehouseId = req.body.location?.warehouse?.toString();
    const newStock = req.body.currentStock || 0;
    
    // If warehouse changed or stock changed, update warehouse capacity
    if (oldWarehouseId) {
      // Get old warehouse to decrease its used capacity
      const oldWarehouse = await Warehouse.findById(oldWarehouseId).session(session);
      if (oldWarehouse) {
        oldWarehouse.usedCapacity = Math.max(0, oldWarehouse.usedCapacity - oldStock);
        await oldWarehouse.save({ session });
      }
    }
    
    // Add to new warehouse's used capacity
    if (newWarehouseId) {
      // Get new warehouse to increase its used capacity
      const newWarehouse = await Warehouse.findById(newWarehouseId).session(session);
      if (newWarehouse) {
        // Check if we have capacity
        if (newStock > (newWarehouse.capacity - newWarehouse.usedCapacity)) {
          console.warn(`Updating inventory exceeds warehouse capacity`);
        }
        
        newWarehouse.usedCapacity += newStock;
        await newWarehouse.save({ session });
      }
    }
    
    // Update the item
    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true, session }
    ).populate('location.warehouse', 'name code remainingCapacity')
     .populate('supplier', 'name');
    
    await session.commitTransaction();
    res.json(updatedItem);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: 'Error updating inventory item', error: error.message });
  } finally {
    session.endSession();
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find item to get its stock and warehouse
    const item = await Inventory.findById(req.params.id).session(session);
    if (!item) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Update warehouse capacity
    if (item.location?.warehouse) {
      const warehouse = await Warehouse.findById(item.location.warehouse).session(session);
      if (warehouse) {
        warehouse.usedCapacity = Math.max(0, warehouse.usedCapacity - item.currentStock);
        await warehouse.save({ session });
      }
    }
    
    // Delete the item
    await Inventory.findByIdAndDelete(req.params.id).session(session);
    
    await session.commitTransaction();
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  } finally {
    session.endSession();
  }
});

// Update stock levels
router.post('/:itemId/update-stock', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { itemId } = req.params;
    const { type, quantity, notes, performedBy } = req.body;
    
    const item = await Inventory.findOne({ itemId }).session(session);
    if (!item) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const previousStock = item.currentStock;
    
    // Calculate new stock
    if (type === 'receive') {
      // Check warehouse capacity for receiving stock
      if (item.location?.warehouse) {
        const warehouse = await Warehouse.findById(item.location.warehouse).session(session);
        if (warehouse) {
          const remainingCapacity = warehouse.capacity - warehouse.usedCapacity;
          if (quantity > remainingCapacity) {
            console.warn(`Receiving stock exceeds warehouse capacity: ${quantity} > ${remainingCapacity}`);
          }
          
          // Update warehouse capacity
          warehouse.usedCapacity += quantity;
          await warehouse.save({ session });
        }
      }
      
      item.currentStock += quantity;
    } else if (type === 'issue' || type === 'adjust') {
      if (item.currentStock < quantity && type === 'issue') {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Insufficient stock' });
      }
      
      // Update warehouse capacity
      if (item.location?.warehouse) {
        const warehouse = await Warehouse.findById(item.location.warehouse).session(session);
        if (warehouse) {
          warehouse.usedCapacity = Math.max(0, warehouse.usedCapacity - quantity);
          await warehouse.save({ session });
        }
      }
      
      item.currentStock = type === 'issue' 
        ? item.currentStock - quantity 
        : quantity; // For adjust, directly set to the new quantity
    }
    
    // Update item status
    item.updateStatus();
    await item.save({ session });
    
    // Create transaction record
    const transaction = new StockTransaction({
      transactionId: `TXN-${Date.now().toString().substring(9)}-${Math.floor(Math.random() * 10000)}`,
      itemId: item.itemId,
      transactionType: type,
      quantity: type === 'issue' ? -quantity : quantity,
      previousStock,
      newStock: item.currentStock,
      notes,
      performedBy,
      approved: true,
      approvedBy: performedBy,
      approvedAt: new Date()
    });
    
    await transaction.save({ session });
    await session.commitTransaction();
    
    res.json({
      message: 'Stock updated successfully',
      transaction,
      newStock: item.currentStock,
      status: item.status
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  } finally {
    session.endSession();
  }
});

// Get low stock items - FIXED
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$currentStock', '$minimumStock'] } // Fixed: proper field comparison
    }).populate('supplier', 'name email');
    
    res.json(lowStockItems);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ message: error.message });
  }
});

// Check stock availability for order
router.post('/check-availability', async (req, res) => {
  try {
    const { items } = req.body;
    
    const availability = await Promise.all(
      items.map(async (orderItem) => {
        const inventoryItem = await Inventory.findOne({ itemId: orderItem.itemId });
        return {
          itemId: orderItem.itemId,
          itemName: orderItem.itemName,
          requestedQty: orderItem.quantity,
          availableQty: inventoryItem ? inventoryItem.currentStock : 0,
          available: inventoryItem ? inventoryItem.currentStock >= orderItem.quantity : false
        };
      })
    );

    const allAvailable = availability.every(item => item.available);
    
    res.json({
      availability,
      allAvailable,
      message: allAvailable ? 'All items available' : 'Some items have insufficient stock'
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ message: error.message });
  }
});

// Reserve stock for order
router.post('/reserve', async (req, res) => {
  try {
    const { orderId, items } = req.body;
    
    const results = await Promise.all(
      items.map(async (orderItem) => {
        const inventoryItem = await Inventory.findOne({ itemId: orderItem.itemId });
        
        if (!inventoryItem || inventoryItem.currentStock < orderItem.quantity) {
          return {
            itemId: orderItem.itemId,
            success: false,
            message: 'Insufficient stock'
          };
        }

        // Create reservation transaction
        await StockTransaction.create({
          itemId: orderItem.itemId,
          transactionType: 'outbound',
          quantity: orderItem.quantity,
          previousStock: inventoryItem.currentStock,
          newStock: inventoryItem.currentStock - orderItem.quantity,
          reference: { orderId },
          performedBy: 'system',
          notes: `Stock reserved for order ${orderId}`
        });

        // Update inventory
        inventoryItem.currentStock -= orderItem.quantity;
        await inventoryItem.save();

        return {
          itemId: orderItem.itemId,
          success: true,
          message: 'Stock reserved'
        };
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Error reserving stock:', error);
    res.status(500).json({ message: error.message });
  }
});

// Release reserved stock
router.post('/release-reservation', async (req, res) => {
  try {
    const { orderId, items } = req.body;
    
    const results = await Promise.all(
      items.map(async (orderItem) => {
        const inventoryItem = await Inventory.findOne({ itemId: orderItem.itemId });
        
        if (!inventoryItem) {
          return {
            itemId: orderItem.itemId,
            success: false,
            message: 'Item not found'
          };
        }

        // Create release transaction
        await StockTransaction.create({
          itemId: orderItem.itemId,
          transactionType: 'inbound',
          quantity: orderItem.quantity,
          previousStock: inventoryItem.currentStock,
          newStock: inventoryItem.currentStock + orderItem.quantity,
          reference: { orderId },
          performedBy: 'system',
          notes: `Stock reservation released for order ${orderId}`
        });

        // Update inventory
        inventoryItem.currentStock += orderItem.quantity;
        await inventoryItem.save();

        return {
          itemId: orderItem.itemId,
          success: true,
          message: 'Reservation released'
        };
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Error releasing reservations:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;