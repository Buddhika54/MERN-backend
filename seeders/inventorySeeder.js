const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const Supplier = require('../models/Supplier');
const StockTransaction = require('../models/StockTransaction');
require('dotenv').config();

const sampleInventoryItems = [
  {
    itemId: 'TEA-001',
    itemName: 'Ceylon Black Tea Premium',
    description: 'High quality Ceylon black tea from Sri Lankan highlands',
    category: 'Black Tea',
    unit: 'kg',
    currentStock: 150,
    minimumStock: 50,
    maximumStock: 500,
    reorderQuantity: 300,
    unitCost: 25.50,
    costPerUnit: 25.50,
    sellingPrice: 35.00,
    location: {
      warehouse: 'Main Warehouse',
      shelf: 'A-01',
      row: '1'
    }
  },
  {
    itemId: 'TEA-002',
    itemName: 'Ceylon Green Tea',
    description: 'Fresh Ceylon green tea with natural antioxidants',
    category: 'Green Tea',
    unit: 'kg',
    currentStock: 89,
    minimumStock: 40,
    maximumStock: 300,
    reorderQuantity: 200,
    unitCost: 28.00,
    costPerUnit: 28.00,
    sellingPrice: 38.00,
    location: {
      warehouse: 'Main Warehouse',
      shelf: 'A-02',
      row: '1'
    }
  },
  {
    itemId: 'TEA-003',
    itemName: 'Assam Black Tea',
    description: 'Bold and malty Assam black tea from India',
    category: 'Black Tea',
    unit: 'kg',
    currentStock: 25,
    minimumStock: 30,
    maximumStock: 200,
    reorderQuantity: 150,
    unitCost: 22.00,
    costPerUnit: 22.00,
    sellingPrice: 30.00,
    location: {
      warehouse: 'Main Warehouse',
      shelf: 'B-01',
      row: '2'
    }
  },
  {
    itemId: 'TEA-004',
    itemName: 'Earl Grey Tea',
    description: 'Classic Earl Grey blend with bergamot oil',
    category: 'Flavored Tea',
    unit: 'kg',
    currentStock: 75,
    minimumStock: 25,
    maximumStock: 150,
    reorderQuantity: 100,
    unitCost: 32.50,
    costPerUnit: 32.50,
    sellingPrice: 45.00,
    location: {
      warehouse: 'Main Warehouse',
      shelf: 'C-01',
      row: '3'
    }
  },
  {
    itemId: 'TEA-005',
    itemName: 'Darjeeling Black Tea',
    description: 'Premium Darjeeling black tea with muscatel flavor',
    category: 'Black Tea',
    unit: 'kg',
    currentStock: 45,
    minimumStock: 20,
    maximumStock: 100,
    reorderQuantity: 60,
    unitCost: 45.00,
    costPerUnit: 45.00,
    sellingPrice: 65.00,
    location: {
      warehouse: 'Main Warehouse',
      shelf: 'A-03',
      row: '1'
    }
  },
  {
    itemId: 'TEA-006',
    itemName: 'Darjeeling White Tea',
    description: 'Rare white tea from Darjeeling gardens',
    category: 'White Tea',
    unit: 'kg',
    currentStock: 12,
    minimumStock: 15,
    maximumStock: 50,
    reorderQuantity: 30,
    unitCost: 85.00,
    costPerUnit: 85.00,
    sellingPrice: 120.00,
    location: {
      warehouse: 'Premium Warehouse',
      shelf: 'P-01',
      row: '1'
    }
  },
  {
    itemId: 'TEA-007',
    itemName: 'Oolong Tea',
    description: 'Traditional Chinese oolong tea with floral notes',
    category: 'Oolong Tea',
    unit: 'kg',
    currentStock: 58,
    minimumStock: 25,
    maximumStock: 120,
    reorderQuantity: 80,
    unitCost: 38.00,
    costPerUnit: 38.00,
    sellingPrice: 55.00,
    location: {
      warehouse: 'Main Warehouse',
      shelf: 'B-02',
      row: '2'
    }
  },
  {
    itemId: 'TEA-008',
    itemName: 'Jasmine Green Tea',
    description: 'Fragrant green tea scented with jasmine flowers',
    category: 'Flavored Tea',
    unit: 'kg',
    currentStock: 0,
    minimumStock: 20,
    maximumStock: 100,
    reorderQuantity: 60,
    unitCost: 30.00,
    costPerUnit: 30.00,
    sellingPrice: 42.00,
    location: {
      warehouse: 'Main Warehouse',
      shelf: 'C-02',
      row: '3'
    }
  },
  {
    itemId: 'TEA-009',
    itemName: 'Kenya Black Tea',
    description: 'Strong Kenya black tea with bright coppery color',
    category: 'Black Tea',
    unit: 'kg',
    currentStock: 95,
    minimumStock: 40,
    maximumStock: 250,
    reorderQuantity: 150,
    unitCost: 18.50,
    costPerUnit: 18.50,
    sellingPrice: 26.00,
    location: {
      warehouse: 'Main Warehouse',
      shelf: 'B-03',
      row: '2'
    }
  },
  {
    itemId: 'TEA-010',
    itemName: 'Kenya CTC Tea',
    description: 'Crush, Tear, Curl processed Kenya tea',
    category: 'Black Tea',
    unit: 'kg',
    currentStock: 180,
    minimumStock: 50,
    maximumStock: 400,
    reorderQuantity: 250,
    unitCost: 16.00,
    costPerUnit: 16.00,
    sellingPrice: 22.00,
    location: {
      warehouse: 'Main Warehouse',
      shelf: 'B-04',
      row: '2'
    }
  },
  {
    itemId: 'PKG-001',
    itemName: 'Tea Bags (Empty)',
    description: 'Food grade tea bags for packaging',
    category: 'Packaging',
    unit: 'pcs',
    currentStock: 25000,
    minimumStock: 10000,
    maximumStock: 100000,
    reorderQuantity: 50000,
    unitCost: 0.05,
    costPerUnit: 0.05,
    sellingPrice: 0.08,
    location: {
      warehouse: 'Packaging Warehouse',
      shelf: 'P-01',
      row: '1'
    }
  },
  {
    itemId: 'PKG-002',
    itemName: 'Tea Tins (100g)',
    description: 'Metal tins for premium tea packaging',
    category: 'Packaging',
    unit: 'pcs',
    currentStock: 8500,
    minimumStock: 5000,
    maximumStock: 20000,
    reorderQuantity: 10000,
    unitCost: 2.50,
    costPerUnit: 2.50,
    sellingPrice: 4.00,
    location: {
      warehouse: 'Packaging Warehouse',
      shelf: 'P-02',
      row: '1'
    }
  }
];

// Add this function to create sample transactions
const createSampleTransactions = async (items) => {
  const transactions = [];
  
  items.forEach((item, index) => {
    // Initial stock transaction
    transactions.push({
      transactionId: `TXN-INIT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      itemId: item.itemId,
      transactionType: 'initial_stock',
      quantity: item.currentStock,
      previousStock: 0,
      newStock: item.currentStock,
      balanceAfter: item.currentStock,
      performedBy: 'system',
      notes: 'Initial stock entry via seeder',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
    });

    // Add random transactions for the last 7 days
    for (let i = 0; i < Math.floor(Math.random() * 5) + 3; i++) {
      const isInbound = Math.random() > 0.4; // 60% inbound, 40% outbound
      const quantity = Math.floor(Math.random() * 50) + 10;
      const daysAgo = Math.floor(Math.random() * 7);
      const previousStock = Math.floor(Math.random() * 100) + 50;
      const newStock = isInbound ? previousStock + quantity : Math.max(0, previousStock - quantity);
      
      transactions.push({
        transactionId: `TXN-${isInbound ? 'IN' : 'OUT'}-${Date.now()}-${i}-${index}`,
        itemId: item.itemId,
        transactionType: isInbound ? 'receive' : 'issue',
        quantity: quantity,
        previousStock: previousStock,
        newStock: newStock,
        balanceAfter: newStock,
        performedBy: ['admin', 'warehouse_staff', 'manager'][Math.floor(Math.random() * 3)],
        notes: isInbound ? 
          `Received shipment from supplier - Batch ${Math.random().toString(36).substr(2, 5).toUpperCase()}` : 
          `Issued for ${['production', 'sale', 'quality control'][Math.floor(Math.random() * 3)]}`,
        createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 24 * 60 * 60 * 1000)
      });
    }
  });

  return transactions;
};

// Update the main seedInventory function
async function seedInventory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teafactory');
    console.log('Connected to MongoDB');

    // Get suppliers for reference
    const suppliers = await Supplier.find();
    if (suppliers.length === 0) {
      console.log('No suppliers found. Please run supplier seeder first.');
      process.exit(1);
    }

    // Clear existing inventory data
    await Inventory.deleteMany({});
    await StockTransaction.deleteMany({});
    console.log('Cleared existing inventory and transactions');

    // Assign suppliers to items
    const itemsWithSuppliers = sampleInventoryItems.map((item, index) => ({
      ...item,
      supplier: suppliers[index % suppliers.length]._id
    }));

    // Insert inventory items
    const insertedItems = await Inventory.insertMany(itemsWithSuppliers);
    console.log(`Inserted ${insertedItems.length} inventory items`);

    // Create sample transactions
    const sampleTransactions = await createSampleTransactions(insertedItems);
    console.log(`Generated ${sampleTransactions.length} sample transactions`);
    
    // Insert transactions in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < sampleTransactions.length; i += batchSize) {
      const batch = sampleTransactions.slice(i, i + batchSize);
      await StockTransaction.insertMany(batch);
    }
    
    console.log(`✅ Created ${sampleTransactions.length} sample transactions`);
    console.log('✅ Inventory seed data inserted successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding inventory data:', error);
    process.exit(1);
  }
}

// Run the seeder
if (require.main === module) {
  seedInventory();
}

module.exports = { seedInventory, sampleInventoryItems };