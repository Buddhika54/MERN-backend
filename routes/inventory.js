const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');
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

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const { category, location, status, search } = req.query;
    let filter = {};
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (location && location !== 'all') {
      filter['location.warehouse'] = location;
    }
    if (search) {
      filter.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const inventory = await Inventory.find(filter)
      .populate('supplier', 'name email')
      .sort({ itemName: 1 });
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single inventory item
router.get('/:id', async (req, res) => {
  try {
    const item = await Inventory.findOne({ itemId: req.params.id })
      .populate('supplier', 'name email phone');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new inventory item
router.post('/', async (req, res) => {
  try {
    const inventoryItem = new Inventory({
      ...req.body,
      itemId: req.body.itemId || `ITM-${uuidv4().substring(0, 8).toUpperCase()}`
    });
    
    const savedItem = await inventoryItem.save();
    
    // Create initial stock transaction if there's stock
    if (savedItem.currentStock > 0) {
      const stockTransaction = new StockTransaction({
        itemId: savedItem.itemId,
        transactionType: 'initial_stock',
        quantity: savedItem.currentStock,
        previousStock: 0,
        newStock: savedItem.currentStock,
        performedBy: 'admin',
        notes: 'Initial stock entry'
      });
      
      await stockTransaction.save();
    }
    
    // Populate supplier info before returning
    const populatedItem = await Inventory.findById(savedItem._id)
      .populate('supplier', 'name email');
    
    res.status(201).json(populatedItem);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update inventory item
router.put('/:id', async (req, res) => {
  try {
    const oldItem = await Inventory.findOne({ itemId: req.params.id });
    if (!oldItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const oldStock = oldItem.currentStock;
    
    const updatedItem = await Inventory.findOneAndUpdate(
      { itemId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    // Create stock transaction if stock changed
    if (oldStock !== updatedItem.currentStock) {
      const stockTransaction = new StockTransaction({
        itemId: updatedItem.itemId,
        transactionType: updatedItem.currentStock > oldStock ? 'adjustment_in' : 'adjustment_out',
        quantity: Math.abs(updatedItem.currentStock - oldStock),
        previousStock: oldStock,
        newStock: updatedItem.currentStock,
        performedBy: 'admin',
        notes: 'Stock adjustment via inventory update'
      });
      
      await stockTransaction.save();
    }
    
    // Populate supplier info
    const populatedItem = await Inventory.findById(updatedItem._id)
      .populate('supplier', 'name email');
    
    res.json(populatedItem);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findOne({ itemId: req.params.id });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    await Inventory.deleteOne({ itemId: req.params.id });
    
    // Optional: Keep transaction history but mark item as deleted
    await StockTransaction.create({
      itemId: req.params.id,
      transactionType: 'adjustment_out',
      quantity: item.currentStock,
      previousStock: item.currentStock,
      newStock: 0,
      performedBy: 'admin',
      notes: 'Item deleted from inventory'
    });

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update stock levels (for receiving goods, sales, etc.)
router.post('/:id/update-stock', async (req, res) => {
  try {
    const { type, quantity, notes, performedBy } = req.body;
    
    const item = await Inventory.findOne({ itemId: req.params.id });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const oldStock = item.currentStock;
    let newStock;

    // Calculate new stock based on transaction type
    switch (type) {
      case 'receive':
        newStock = oldStock + quantity;
        break;
      case 'issue':
        newStock = Math.max(0, oldStock - quantity);
        break;
      case 'adjustment':
        newStock = quantity; // Direct adjustment to specific quantity
        break;
      default:
        return res.status(400).json({ message: 'Invalid transaction type' });
    }

    // Update inventory
    item.currentStock = newStock;
    await item.save();

    // Create stock transaction
    const transaction = new StockTransaction({
      itemId: item.itemId,
      transactionType: type === 'receive' ? 'inbound' : (type === 'issue' ? 'outbound' : 'adjustment'),
      quantity: type === 'adjustment' ? Math.abs(newStock - oldStock) : quantity,
      previousStock: oldStock,
      newStock: newStock,
      performedBy: performedBy || 'admin',
      notes: notes || `Stock ${type} operation`
    });

    await transaction.save();

    // Return updated item
    const updatedItem = await Inventory.findById(item._id)
      .populate('supplier', 'name email');

    res.json({
      message: 'Stock updated successfully',
      item: updatedItem,
      transaction: transaction
    });

  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ message: error.message });
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