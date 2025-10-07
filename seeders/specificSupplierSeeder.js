const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const Inventory = require('../models/Inventory');
const PurchaseOrder = require('../models/PurchaseOrder');
const { ObjectId } = mongoose.Types;
require('dotenv').config();

// The specific supplier ID to populate data for
const TARGET_SUPPLIER_ID = "68d24cc7779cb98756413dc8";

async function generatePastDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

async function seedSpecificSupplierData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the supplier
    const supplier = await Supplier.findById(TARGET_SUPPLIER_ID);
    if (!supplier) {
      console.error(`Supplier with ID ${TARGET_SUPPLIER_ID} not found`);
      return;
    }

    console.log(`Found supplier: ${supplier.name}`);

    // Get warehouses for product location
    const warehouses = await mongoose.connection.db.collection('warehouses').find().toArray();
    if (!warehouses || warehouses.length === 0) {
      console.error('No warehouses found in the database');
      return;
    }

    // 1. Create inventory items for this supplier
    const teaProducts = [
      {
        itemName: "Ceylon Black Tea",
        itemId: `TEA-9848`,
        category: "Black Tea",
        description: "Premium Ceylon black tea from Sri Lanka highlands",
        currentStock: 450,
        minimumStock: 100,
        maximumStock: 800,
        unit: "kg",
        unitCost: 12.50,
        sellingPrice: 24.99,
        location: {
          warehouse: warehouses[0]._id,
          section: "A",
          shelf: "3"
        },
        supplier: supplier._id,
        status: "in_stock",
        batchNumber: "BT-2025-09-001",
        expiryDate: new Date("2025-09-30"),
        lastRestocked: await generatePastDate(15)
      },
      {
        itemName: "Green Sencha Tea",
        itemId: `TEA-6656`,
        category: "Green Tea",
        description: "Japanese-style green tea with fresh, grassy notes",
        currentStock: 280,
        minimumStock: 80,
        maximumStock: 600,
        unit: "kg",
        unitCost: 18.75,
        sellingPrice: 35.50,
        location: {
          warehouse: warehouses[0]._id,
          section: "B",
          shelf: "2"
        },
        supplier: supplier._id,
        status: "in_stock",
        batchNumber: "BT-2025-10-002",
        expiryDate: new Date("2025-10-15"),
        lastRestocked: await generatePastDate(7)
      },
      {
        itemName: "Earl Grey Supreme",
        itemId: `TEA-5415`,
        category: "Flavored Tea",
        description: "Fine black tea infused with bergamot oil and cornflower petals",
        currentStock: 75,
        minimumStock: 100,
        maximumStock: 500,
        unit: "kg",
        unitCost: 15.25,
        sellingPrice: 29.99,
        location: {
          warehouse: warehouses[1]._id,
          section: "C",
          shelf: "1"
        },
        supplier: supplier._id,
        status: "low_stock",
        batchNumber: "BT-2025-09-005",
        expiryDate: new Date("2025-09-20"),
        lastRestocked: await generatePastDate(22)
      },
      {
        itemName: "White Silver Needle",
        itemId: `TEA-9951`,
        category: "White Tea",
        description: "Delicate white tea with sweet, mild flavor",
        currentStock: 120,
        minimumStock: 50,
        maximumStock: 300,
        unit: "kg",
        unitCost: 42.00,
        sellingPrice: 79.99,
        location: {
          warehouse: warehouses[0]._id,
          section: "D",
          shelf: "4"
        },
        supplier: supplier._id,
        status: "in_stock",
        batchNumber: "BT-2025-08-003",
        expiryDate: new Date("2025-08-15"),
        lastRestocked: await generatePastDate(30)
      },
      {
        itemName: "Masala Chai Blend",
        itemId: `TEA-${Math.floor(1000 + Math.random() * 9000)}`,
        category: "Blended Tea",
        description: "Traditional Indian spiced tea with cardamom, cinnamon and ginger",
        currentStock: 185,
        minimumStock: 100,
        maximumStock: 400,
        unit: "kg",
        unitCost: 14.50,
        sellingPrice: 27.99,
        location: {
          warehouse: warehouses[1]._id,
          section: "A",
          shelf: "5"
        },
        supplier: supplier._id,
        status: "in_stock",
        batchNumber: "BT-2025-11-008",
        expiryDate: new Date("2025-11-30"),
        lastRestocked: await generatePastDate(5)
      }
    ];

    // Clear existing inventory items for this supplier
    await Inventory.deleteMany({ supplier: supplier._id });
    console.log('Cleared existing inventory items for this supplier');

    // Insert new inventory items
    const inventoryItems = await Inventory.insertMany(teaProducts);
    console.log(`Created ${inventoryItems.length} inventory items for supplier ${supplier.name}`);

    // 2. Create purchase orders for this supplier
    // Correct status values based on PurchaseOrder schema
    // From examining your routes and model, correct values appear to be:
    const orderStatuses = ['draft', 'pending', 'approved', 'completed', 'received', 'sent', 'cancelled'];
    const purchaseOrders = [];

    // Generate orders with different statuses
    for (let i = 0; i < 20; i++) {
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const createdAt = await generatePastDate(Math.floor(Math.random() * 120)); // Random date within last 120 days
      
      // Create random items from the inventory
      const orderItems = [];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
      
      for (let j = 0; j < numItems; j++) {
        const randomItem = inventoryItems[Math.floor(Math.random() * inventoryItems.length)];
        const quantity = Math.floor(Math.random() * 50) + 10; // 10-60 units
        
        orderItems.push({
          item: randomItem._id,
          itemId: randomItem.itemId,
          itemName: randomItem.itemName,
          quantity: quantity,
          unitPrice: randomItem.unitCost,
          totalPrice: quantity * randomItem.unitCost
        });
      }
      
      // Calculate total amount
      const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      // Expected delivery date (between 10-30 days from creation)
      const expectedDeliveryDate = new Date(createdAt);
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + Math.floor(Math.random() * 20) + 10);
      
      // Actual delivery date (for completed/received orders)
      let actualDeliveryDate = null;
      if (status === 'completed' || status === 'received') {
        // 80% chance of on-time delivery
        const onTime = Math.random() < 0.8;
        actualDeliveryDate = new Date(expectedDeliveryDate);
        
        if (onTime) {
          // Deliver 0-2 days early
          actualDeliveryDate.setDate(actualDeliveryDate.getDate() - Math.floor(Math.random() * 3));
        } else {
          // Deliver 1-5 days late
          actualDeliveryDate.setDate(actualDeliveryDate.getDate() + Math.floor(Math.random() * 5) + 1);
        }
      }
      
      purchaseOrders.push({
        poNumber: `PO-${supplier.supplierId}-${10000 + i}`,
        supplier: supplier._id,
        items: orderItems,
        totalAmount,
        status,
        createdAt,
        expectedDeliveryDate,
        actualDeliveryDate,
        notes: `Order for ${supplier.name}`,
        priority: ['normal', 'high', 'urgent'][Math.floor(Math.random() * 3)]
      });
    }

    // Clear existing purchase orders for this supplier
    await PurchaseOrder.deleteMany({ supplier: supplier._id });
    console.log('Cleared existing purchase orders for this supplier');

    // Insert new purchase orders
    const insertedOrders = await PurchaseOrder.insertMany(purchaseOrders);
    console.log(`Created ${insertedOrders.length} purchase orders for supplier ${supplier.name}`);

    // Update supplier with performance metrics
    supplier.leadTime = 14; // Average lead time in days
    supplier.paymentTerms = "Net 30";
    supplier.performanceMetrics = {
      onTimeDeliveryRate: 87,
      qualityRating: 4.7,
      responseTime: 24 // hours
    };
    
    await supplier.save();
    console.log(`Updated supplier ${supplier.name} with performance metrics`);

    console.log('✅ Successfully populated data for supplier', supplier.name);
  } catch (error) {
    console.error('Error seeding supplier data:', error);
  } finally {
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the seeder
seedSpecificSupplierData();