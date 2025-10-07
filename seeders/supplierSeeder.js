const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
require('dotenv').config();

const sampleSuppliers = [
  {
    supplierId: 'SUP-TEA001',
    name: 'Ceylon Tea Estates Ltd',
    contactPerson: 'John Silva',
    email: 'john.silva@ceylontea.lk',
    phone: '+94-11-2345678',
    address: {
      street: '123 Tea Garden Road',
      city: 'Kandy',
      state: 'Central Province',
      zipCode: '20000',
      country: 'Sri Lanka'
    },
    leadTime: 14,
    paymentTerms: 'Net 30',
    status: 'active',
    suppliedItems: [
      { itemId: 'TEA-001', itemName: 'Ceylon Black Tea', unitPrice: 25.50 },
      { itemId: 'TEA-002', itemName: 'Ceylon Green Tea', unitPrice: 28.00 }
    ]
  },
  {
    supplierId: 'SUP-TEA002',
    name: 'Assam Tea Company',
    contactPerson: 'Rajesh Kumar',
    email: 'rajesh@assamtea.in',
    phone: '+91-361-2345678',
    address: {
      street: '456 Plantation Avenue',
      city: 'Guwahati',
      state: 'Assam',
      zipCode: '781001',
      country: 'India'
    },
    leadTime: 21,
    paymentTerms: 'Net 45',
    status: 'active',
    suppliedItems: [
      { itemId: 'TEA-003', itemName: 'Assam Black Tea', unitPrice: 22.00 },
      { itemId: 'TEA-004', itemName: 'Earl Grey Tea', unitPrice: 32.50 }
    ]
  },
  {
    supplierId: 'SUP-TEA003',
    name: 'Darjeeling Premium Teas',
    contactPerson: 'Priya Sharma',
    email: 'priya@darjeelingtea.in',
    phone: '+91-354-2345678',
    address: {
      street: '789 Mountain View Road',
      city: 'Darjeeling',
      state: 'West Bengal',
      zipCode: '734101',
      country: 'India'
    },
    leadTime: 18,
    paymentTerms: 'Net 30',
    status: 'active',
    suppliedItems: [
      { itemId: 'TEA-005', itemName: 'Darjeeling Black Tea', unitPrice: 45.00 },
      { itemId: 'TEA-006', itemName: 'Darjeeling White Tea', unitPrice: 85.00 }
    ]
  },
  {
    supplierId: 'SUP-TEA004',
    name: 'Fujian Tea Exports',
    contactPerson: 'Li Wei',
    email: 'li.wei@fujiantea.cn',
    phone: '+86-591-12345678',
    address: {
      street: '321 Tea Market Street',
      city: 'Fuzhou',
      state: 'Fujian',
      zipCode: '350000',
      country: 'China'
    },
    leadTime: 25,
    paymentTerms: 'Net 60',
    status: 'active',
    suppliedItems: [
      { itemId: 'TEA-007', itemName: 'Oolong Tea', unitPrice: 38.00 },
      { itemId: 'TEA-008', itemName: 'Jasmine Green Tea', unitPrice: 30.00 }
    ]
  },
  {
    supplierId: 'SUP-TEA005',
    name: 'Kenya Tea Cooperative',
    contactPerson: 'Samuel Kipchoge',
    email: 'samuel@kenyatea.co.ke',
    phone: '+254-20-1234567',
    address: {
      street: '555 Highland Road',
      city: 'Kericho',
      state: 'Kericho County',
      zipCode: '20200',
      country: 'Kenya'
    },
    leadTime: 20,
    paymentTerms: 'Net 30',
    status: 'inactive',
    suppliedItems: [
      { itemId: 'TEA-009', itemName: 'Kenya Black Tea', unitPrice: 18.50 },
      { itemId: 'TEA-010', itemName: 'Kenya CTC Tea', unitPrice: 16.00 }
    ]
  }
];

const samplePurchaseOrders = [
  {
    poNumber: 'PO-2024-001',
    supplier: null, // Will be set dynamically
    items: [
      {
        itemId: 'TEA-001',
        itemName: 'Ceylon Black Tea',
        quantity: 500,
        unit: 'kg',
        unitPrice: 25.50,
        totalPrice: 12750
      },
      {
        itemId: 'TEA-002',
        itemName: 'Ceylon Green Tea',
        quantity: 300,
        unit: 'kg',
        unitPrice: 28.00,
        totalPrice: 8400
      }
    ],
    totalAmount: 21150,
    status: 'pending',
    orderDate: new Date('2024-01-15'),
    expectedDeliveryDate: new Date('2024-02-01'),
    notes: 'Rush order for spring season'
  },
  {
    poNumber: 'PO-2024-002',
    supplier: null,
    items: [
      {
        itemId: 'TEA-003',
        itemName: 'Assam Black Tea',
        quantity: 800,
        unit: 'kg',
        unitPrice: 22.00,
        totalPrice: 17600
      }
    ],
    totalAmount: 17600,
    status: 'approved',
    orderDate: new Date('2024-01-10'),
    expectedDeliveryDate: new Date('2024-02-05'),
    notes: 'Standard quality required'
  },
  {
    poNumber: 'PO-2024-003',
    supplier: null,
    items: [
      {
        itemId: 'TEA-005',
        itemName: 'Darjeeling Black Tea',
        quantity: 200,
        unit: 'kg',
        unitPrice: 45.00,
        totalPrice: 9000
      }
    ],
    totalAmount: 9000,
    status: 'delivered',
    orderDate: new Date('2024-01-05'),
    expectedDeliveryDate: new Date('2024-01-25'),
    deliveredDate: new Date('2024-01-24'),
    notes: 'Premium grade tea'
  },
  {
    poNumber: 'PO-2024-004',
    supplier: null,
    items: [
      {
        itemId: 'TEA-007',
        itemName: 'Oolong Tea',
        quantity: 150,
        unit: 'kg',
        unitPrice: 38.00,
        totalPrice: 5700
      }
    ],
    totalAmount: 5700,
    status: 'rejected',
    orderDate: new Date('2024-01-12'),
    notes: 'Quality issues with previous batch'
  }
];

async function seedSuppliers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teafactory');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Supplier.deleteMany({});
    await PurchaseOrder.deleteMany({});
    console.log('Cleared existing suppliers and purchase orders');

    // Insert suppliers
    const insertedSuppliers = await Supplier.insertMany(sampleSuppliers);
    console.log(`Inserted ${insertedSuppliers.length} suppliers`);

    // Create purchase orders with supplier references
    const ordersWithSuppliers = samplePurchaseOrders.map((order, index) => ({
      ...order,
      supplier: insertedSuppliers[index % insertedSuppliers.length]._id
    }));

    const insertedOrders = await PurchaseOrder.insertMany(ordersWithSuppliers);
    console.log(`Inserted ${insertedOrders.length} purchase orders`);

    console.log('✅ Seed data inserted successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seeder
if (require.main === module) {
  seedSuppliers();
}

module.exports = { seedSuppliers, sampleSuppliers, samplePurchaseOrders };