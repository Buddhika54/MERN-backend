const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');
const StockTransaction = require('../models/StockTransaction');
const { v4: uuidv4 } = require('uuid');

// Create an instance of the service (singleton pattern)
class WarehouseService {
  // Transfer inventory between warehouses
  async transferInventory(fromWarehouseId, toWarehouseId, itemId, quantity, performedBy, notes) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find warehouses by ObjectId
      const fromWarehouse = await Warehouse.findById(fromWarehouseId).session(session);
      const toWarehouse = await Warehouse.findById(toWarehouseId).session(session);
      
      if (!fromWarehouse || !toWarehouse) {
        throw new Error('Source or destination warehouse not found');
      }

      // Find inventory item in source warehouse using ObjectId
      const inventoryItem = await Inventory.findOne({ 
        itemId, 
        'location.warehouse': fromWarehouse._id 
      }).session(session);

      if (!inventoryItem) {
        throw new Error('Item not found in source warehouse');
      }

      if (inventoryItem.currentStock < quantity) {
        throw new Error('Insufficient stock for transfer');
      }

      // Check if item exists in destination warehouse using ObjectId
      let destinationItem = await Inventory.findOne({
        itemId,
        'location.warehouse': toWarehouse._id
      }).session(session);

      if (destinationItem) {
        destinationItem.currentStock += quantity;
        if (typeof destinationItem.updateStatus === 'function') {
          destinationItem.updateStatus();
        }
        await destinationItem.save({ session });
      } else {
        // Create new item in destination warehouse with a modified itemId to avoid duplicates
        const newItemId = `${itemId}-${toWarehouse.code || toWarehouse._id.toString().substring(0, 4)}`;
        
        destinationItem = new Inventory({
          ...inventoryItem.toJSON(),
          _id: new mongoose.Types.ObjectId(),
          itemId: newItemId, // Use a unique itemId for the destination
          currentStock: quantity,
          location: {
            warehouse: toWarehouse._id,
            shelf: 'TBD',
            row: 'TBD',
            bin: 'TBD'
          }
        });
        delete destinationItem.__v;
        await destinationItem.save({ session });
      }

      // Update source inventory
      const previousStock = inventoryItem.currentStock;
      inventoryItem.currentStock -= quantity;
      if (typeof inventoryItem.updateStatus === 'function') {
        inventoryItem.updateStatus();
      }
      await inventoryItem.save({ session });

      // Update warehouse capacity values
      fromWarehouse.usedCapacity = Math.max(0, fromWarehouse.usedCapacity - quantity);
      await fromWarehouse.save({ session });

      toWarehouse.usedCapacity += quantity;
      await toWarehouse.save({ session });

      // Create transfer transaction
      const transaction = new StockTransaction({
        transactionId: `TXN-${uuidv4().substring(0, 8).toUpperCase()}`,
        itemId,
        transactionType: 'transfer',
        quantity: -quantity,
        previousStock,
        newStock: inventoryItem.currentStock,
        location: {
          from: {
            warehouse: fromWarehouse.name,
            shelf: inventoryItem.location.shelf,
            bin: inventoryItem.location.bin
          },
          to: {
            warehouse: toWarehouse.name,
            shelf: destinationItem.location.shelf,
            bin: destinationItem.location.bin
          }
        },
        performedBy,
        approved: true,
        approvedBy: performedBy,
        approvedAt: new Date(),
        notes: notes || `Transfer from ${fromWarehouse.name} to ${toWarehouse.name}`
      });

      await transaction.save({ session });
      await session.commitTransaction();

      return {
        success: true,
        transactionId: transaction.transactionId,
        fromWarehouse: fromWarehouse.name,
        toWarehouse: toWarehouse.name,
        itemId,
        transferredQuantity: quantity,
        remainingInSource: inventoryItem.currentStock,
        newTotalInDestination: destinationItem.currentStock
      };

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  // Other methods...
}

// Export a single instance
const warehouseServiceInstance = new WarehouseService();
module.exports = warehouseServiceInstance;