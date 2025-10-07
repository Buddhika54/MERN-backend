const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');
const Supplier = require('../models/Supplier');

const seedInventory = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teafactory');
    
    // Get existing warehouses and suppliers
    const warehouses = await Warehouse.find();
    const suppliers = await Supplier.find();
    
    if (warehouses.length === 0) {
      console.log('No warehouses found. Please seed warehouses first.');
      return;
    }

    // Create inventory items with warehouse ObjectIds
    const sampleInventory = [
      {
        itemId: 'TEA-001',
        itemName: 'Earl Grey Tea',
        description: 'Premium Earl Grey black tea with bergamot',
        category: 'Black Tea',
        currentStock: 250,
        minimumStock: 50,
        maximumStock: 500,
        unit: 'kg',
        location: {
          warehouse: warehouses[0]._id, // Use ObjectId
          shelf: 'A1',
          row: '2',
          bin: 'B3'
        },
        supplier: suppliers.length > 0 ? suppliers[0]._id : null,
        unitCost: 25.50,
        sellingPrice: 45.00,
        status: 'in_stock'
      },
      {
        itemId: 'TEA-002',
        itemName: 'Green Dragon Well',
        description: 'Traditional Chinese green tea',
        category: 'Green Tea',
        currentStock: 15,
        minimumStock: 30,
        maximumStock: 300,
        unit: 'kg',
        location: {
          warehouse: warehouses[1] ? warehouses[1]._id : warehouses[0]._id,
          shelf: 'B2',
          row: '1',
          bin: 'A1'
        },
        supplier: suppliers.length > 1 ? suppliers[1]._id : suppliers[0]._id,
        unitCost: 35.00,
        sellingPrice: 60.00,
        status: 'low_stock'
      }
      // Add more items as needed
    ];

    await Inventory.deleteMany({});
    await Inventory.insertMany(sampleInventory);
    
    console.log('✅ Inventory seeded successfully with warehouse references!');
    
  } catch (error) {
    console.error('❌ Error seeding inventory:', error);
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  require('dotenv').config();
  seedInventory();
}

module.exports = { seedInventory };