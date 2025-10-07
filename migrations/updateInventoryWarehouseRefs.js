const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');

const migrateInventoryWarehouseRefs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teafactory');
    
    // Get all warehouses to create a mapping
    const warehouses = await Warehouse.find();
    
    if (warehouses.length === 0) {
      console.error('❌ No warehouses found in database. Please seed warehouses first.');
      return;
    }
    
    // Default warehouse to use if none is found
    const defaultWarehouse = warehouses[0];
    console.log(`Using default warehouse: ${defaultWarehouse.name} (${defaultWarehouse._id})`);
    
    const warehouseMap = {};
    warehouses.forEach(w => {
      warehouseMap[w.code] = w._id;
      warehouseMap[w.name] = w._id;
    });

    // Update all inventory items
    const inventoryItems = await Inventory.find();
    let updated = 0, skipped = 0, fixed = 0;
    
    for (const item of inventoryItems) {
      // Ensure location object exists
      if (!item.location) {
        item.location = { warehouse: defaultWarehouse._id };
        await item.save();
        console.log(`✅ Created location for ${item.itemName} (${item.itemId}) with default warehouse`);
        fixed++;
        continue;
      }
      
      // Handle missing or empty warehouse reference
      if (!item.location.warehouse || item.location.warehouse === "") {
        item.location.warehouse = defaultWarehouse._id;
        await item.save();
        console.log(`✅ Assigned default warehouse to ${item.itemName} (${item.itemId})`);
        fixed++;
        continue;
      }
      
      const warehouseRef = item.location.warehouse;
      
      // If it's already a valid ObjectId, skip
      if (mongoose.Types.ObjectId.isValid(warehouseRef) && 
          String(warehouseRef).length === 24) {
        skipped++;
        continue;
      }
      
      // Try to find warehouse by code or name
      const warehouseId = warehouseMap[warehouseRef];
      if (warehouseId) {
        item.location.warehouse = warehouseId;
        await item.save();
        console.log(`✅ Updated ${item.itemName} (${item.itemId}) warehouse reference`);
        updated++;
      } else {
        console.warn(`⚠️ Could not find matching warehouse for "${warehouseRef}" - using default`);
        item.location.warehouse = defaultWarehouse._id;
        await item.save();
        fixed++;
      }
    }
    
    console.log('📊 Migration summary:');
    console.log(`- Total items processed: ${inventoryItems.length}`);
    console.log(`- Items updated with correct warehouse: ${updated}`);
    console.log(`- Items fixed with default warehouse: ${fixed}`);
    console.log(`- Items skipped (already correct): ${skipped}`);
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
  }
};

if (require.main === module) {
  require('dotenv').config();
  migrateInventoryWarehouseRefs();
}

module.exports = { migrateInventoryWarehouseRefs };