const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');

const updateWarehouseCapacity = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teafactory');
    
    // Get all warehouses
    const warehouses = await Warehouse.find();
    console.log(`Found ${warehouses.length} warehouses to update`);
    
    // Process each warehouse
    for (const warehouse of warehouses) {
      // Find all inventory items in this warehouse
      const items = await Inventory.find({ 'location.warehouse': warehouse._id });
      
      // Calculate used capacity
      const usedCapacity = items.reduce((total, item) => total + (item.currentStock || 0), 0);
      
      // Update warehouse
      warehouse.usedCapacity = usedCapacity;
      await warehouse.save();
      
      console.log(`Updated warehouse ${warehouse.name} (${warehouse.code}): ${usedCapacity}/${warehouse.capacity} units used`);
    }
    
    console.log('✅ Warehouse capacity migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating warehouse capacity:', error);
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  require('dotenv').config();
  updateWarehouseCapacity();
}

module.exports = { updateWarehouseCapacity };