const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');

class StockService {
  // Check if items are available in stock
  async checkStockAvailability(items) {
    const results = [];
    
    for (const item of items) {
      const inventoryItem = await Inventory.findOne({ itemId: item.itemId });
      
      if (!inventoryItem) {
        results.push({
          itemId: item.itemId,
          available: false,
          reason: 'Item not found',
          currentStock: 0,
          requestedQuantity: item.quantity
        });
        continue;
      }

      const isAvailable = inventoryItem.currentStock >= item.quantity;
      results.push({
        itemId: item.itemId,
        itemName: inventoryItem.itemName,
        available: isAvailable,
        reason: isAvailable ? 'Available' : 'Insufficient stock',
        currentStock: inventoryItem.currentStock,
        requestedQuantity: item.quantity,
        shortfall: isAvailable ? 0 : item.quantity - inventoryItem.currentStock
      });
    }

    return {
      allAvailable: results.every(r => r.available),
      items: results
    };
  }

  // Reserve stock for an order
  async reserveStock(orderId, items, performedBy) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const results = [];

      for (const item of items) {
        const inventoryItem = await Inventory.findOne({ itemId: item.itemId }).session(session);
        
        if (!inventoryItem || inventoryItem.currentStock < item.quantity) {
          throw new Error(`Insufficient stock for item ${item.itemId}`);
        }

        const previousStock = inventoryItem.currentStock;
        inventoryItem.currentStock -= item.quantity;
        inventoryItem.updateStatus();
        
        await inventoryItem.save({ session });

        // Create transaction record
        const transaction = new StockTransaction({
          transactionId: `TXN-${uuidv4().substring(0, 8).toUpperCase()}`,
          itemId: item.itemId,
          transactionType: 'outbound',
          quantity: -item.quantity,
          previousStock,
          newStock: inventoryItem.currentStock,
          reference: { orderId },
          performedBy,
          approved: true,
          approvedBy: performedBy,
          approvedAt: new Date(),
          notes: `Stock reserved for order ${orderId}`
        });

        await transaction.save({ session });
        
        results.push({
          itemId: item.itemId,
          reservedQuantity: item.quantity,
          remainingStock: inventoryItem.currentStock
        });

        // Check if stock is now low
        if (inventoryItem.status === 'low_stock' || inventoryItem.status === 'out_of_stock') {
          emailService.sendLowStockAlert(inventoryItem);
        }
      }

      await session.commitTransaction();
      return { success: true, items: results };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Add stock (for receiving shipments)
  async addStock(itemId, quantity, reference, performedBy, notes) {
    const inventoryItem = await Inventory.findOne({ itemId });
    
    if (!inventoryItem) {
      throw new Error('Item not found');
    }

    const previousStock = inventoryItem.currentStock;
    inventoryItem.currentStock += quantity;
    inventoryItem.lastRestocked = new Date();
    inventoryItem.updateStatus();
    
    await inventoryItem.save();

    // Create transaction record
    const transaction = new StockTransaction({
      transactionId: `TXN-${uuidv4().substring(0, 8).toUpperCase()}`,
      itemId,
      transactionType: 'inbound',
      quantity,
      previousStock,
      newStock: inventoryItem.currentStock,
      reference,
      performedBy,
      approved: true,
      approvedBy: performedBy,
      approvedAt: new Date(),
      notes: notes || `Stock added - ${quantity} units`
    });

    await transaction.save();
    
    return {
      success: true,
      previousStock,
      newStock: inventoryItem.currentStock,
      transaction: transaction.transactionId
    };
  }

  // Get low stock items
  async getLowStockItems() {
    return await Inventory.find({
      $or: [
        { status: 'low_stock' },
        { status: 'out_of_stock' },
        { currentStock: { $lte: '$minimumStock' } }
      ]
    }).populate('supplier');
  }
}

module.exports = new StockService();