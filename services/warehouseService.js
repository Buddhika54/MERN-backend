const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const StockTransaction = require('../models/StockTransaction');
const stockService = require('./stockService');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

class WarehouseService {
  // Update warehouse capacity utilization
  async updateWarehouseCapacity(warehouseId, utilized) {
    try {
      const warehouse = await Warehouse.findOne({ warehouseId });
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      warehouse.capacity.utilized = utilized;
      warehouse.updateStatus();
      
      await warehouse.save();

      return {
        success: true,
        warehouseId,
        utilization: warehouse.calculateUtilization(),
        status: warehouse.status,
        availableCapacity: warehouse.getAvailableCapacity()
      };
    } catch (error) {
      throw error;
    }
  }

  // Transfer inventory between warehouses
  async transferInventory(fromWarehouseId, toWarehouseId, itemId, quantity, performedBy, notes) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate warehouses
      const fromWarehouse = await Warehouse.findOne({ warehouseId: fromWarehouseId }).session(session);
      const toWarehouse = await Warehouse.findOne({ warehouseId: toWarehouseId }).session(session);
      
      if (!fromWarehouse || !toWarehouse) {
        throw new Error('Source or destination warehouse not found');
      }

      // Find inventory item in source warehouse
      const inventoryItem = await Inventory.findOne({ 
        itemId, 
        'location.warehouse': fromWarehouse.name 
      }).session(session);

      if (!inventoryItem) {
        throw new Error('Item not found in source warehouse');
      }

      if (inventoryItem.currentStock < quantity) {
        throw new Error('Insufficient stock for transfer');
      }

      // Check if item exists in destination warehouse
      let destinationItem = await Inventory.findOne({
        itemId,
        'location.warehouse': toWarehouse.name
      }).session(session);

      if (destinationItem) {
        // Update existing item in destination
        destinationItem.currentStock += quantity;
        destinationItem.updateStatus();
        await destinationItem.save({ session });
      } else {
        // Create new item in destination warehouse
        destinationItem = new Inventory({
          ...inventoryItem.toJSON(),
          _id: new mongoose.Types.ObjectId(),
          currentStock: quantity,
          location: {
            warehouse: toWarehouse.name,
            shelf: 'TBD',
            bin: 'TBD'
          }
        });
        delete destinationItem.__v;
        await destinationItem.save({ session });
      }

      // Reduce stock in source warehouse
      const previousStock = inventoryItem.currentStock;
      inventoryItem.currentStock -= quantity;
      inventoryItem.updateStatus();
      await inventoryItem.save({ session });

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

  // Get warehouse analytics
  async getWarehouseAnalytics(warehouseId) {
    try {
      const warehouse = await Warehouse.findOne({ warehouseId });
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      // Get inventory statistics
      const inventoryItems = await Inventory.find({ 'location.warehouse': warehouse.name });
      
      const totalItems = inventoryItems.length;
      const totalValue = inventoryItems.reduce((sum, item) => 
        sum + (item.currentStock * item.costPerUnit), 0);
      
      const lowStockItems = inventoryItems.filter(item => 
        item.status === 'low_stock' || item.status === 'out_of_stock');

      // Category breakdown
      const categoryBreakdown = inventoryItems.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {});

      // Recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentTransactions = await StockTransaction.find({
        $or: [
          { 'location.from.warehouse': warehouse.name },
          { 'location.to.warehouse': warehouse.name }
        ],
        createdAt: { $gte: thirtyDaysAgo }
      }).sort({ createdAt: -1 });

      const inboundTransactions = recentTransactions.filter(t => 
        t.transactionType === 'inbound' || 
        (t.transactionType === 'transfer' && t.location.to?.warehouse === warehouse.name));
      
      const outboundTransactions = recentTransactions.filter(t => 
        t.transactionType === 'outbound' || 
        (t.transactionType === 'transfer' && t.location.from?.warehouse === warehouse.name));

      return {
        warehouse: {
          warehouseId: warehouse.warehouseId,
          name: warehouse.name,
          type: warehouse.type,
          status: warehouse.status,
          utilizationPercentage: warehouse.calculateUtilization(),
          availableCapacity: warehouse.getAvailableCapacity(),
          totalCapacity: warehouse.capacity.total
        },
        inventory: {
          totalItems,
          totalValue,
          lowStockItems: lowStockItems.length,
          categoryBreakdown
        },
        transactions: {
          total: recentTransactions.length,
          inbound: inboundTransactions.length,
          outbound: outboundTransactions.length,
          recent: recentTransactions.slice(0, 10)
        },
        zones: warehouse.zones.map(zone => ({
          zoneId: zone.zoneId,
          zoneName: zone.zoneName,
          utilization: zone.capacity ? Math.round((zone.utilized / zone.capacity) * 100) : 0,
          temperature: zone.temperature?.current,
          humidity: zone.humidity?.current
        }))
      };
    } catch (error) {
      throw error;
    }
  }

  // Get available storage locations
  async getAvailableLocations(warehouseId, requiredCapacity = 0) {
    try {
      const warehouse = await Warehouse.findOne({ warehouseId });
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      const availableLocations = [];

      warehouse.shelves.forEach(shelf => {
        const shelfAvailable = shelf.capacity - shelf.utilized;
        if (shelfAvailable >= requiredCapacity) {
          shelf.bins.forEach(bin => {
            if (bin.status === 'available') {
              const binAvailable = bin.capacity - bin.utilized;
              if (binAvailable >= requiredCapacity) {
                availableLocations.push({
                  warehouse: warehouse.name,
                  shelf: shelf.shelfName,
                  bin: bin.binName,
                  availableCapacity: binAvailable,
                  zone: shelf.zone
                });
              }
            }
          });
        }
      });

      return availableLocations;
    } catch (error) {
      throw error;
    }
  }

  // Optimize warehouse layout
  async optimizeWarehouseLayout(warehouseId) {
    try {
      const warehouse = await Warehouse.findOne({ warehouseId });
      if (!warehouse) {
        throw new Error('Warehouse not found');
      }

      const inventoryItems = await Inventory.find({ 'location.warehouse': warehouse.name });
      
      // Group items by category for optimization
      const categoryGroups = inventoryItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});

      const optimizationSuggestions = [];

      // Suggest moving fast-moving items closer to loading dock
      const fastMovingItems = inventoryItems.filter(item => 
        item.currentStock < item.maximumStock * 0.3); // Items with high turnover

      if (fastMovingItems.length > 0) {
        optimizationSuggestions.push({
          type: 'fast_moving',
          suggestion: 'Move fast-moving items closer to loading dock',
          items: fastMovingItems.map(item => ({
            itemId: item.itemId,
            itemName: item.itemName,
            currentLocation: item.location
          }))
        });
      }

      // Suggest temperature-controlled zones for perishables
      const perishableItems = inventoryItems.filter(item => item.expiryDate);
      if (perishableItems.length > 0 && warehouse.facilities.temperature_controlled) {
        optimizationSuggestions.push({
          type: 'temperature_control',
          suggestion: 'Move perishable items to temperature-controlled zones',
          items: perishableItems.map(item => ({
            itemId: item.itemId,
            itemName: item.itemName,
            expiryDate: item.expiryDate,
            currentLocation: item.location
          }))
        });
      }

      return {
        warehouseId,
        currentUtilization: warehouse.calculateUtilization(),
        optimizationSuggestions,
        categoryDistribution: Object.keys(categoryGroups).map(category => ({
          category,
          count: categoryGroups[category].length,
          totalValue: categoryGroups[category].reduce((sum, item) => 
            sum + (item.currentStock * item.costPerUnit), 0)
        }))
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new WarehouseService();