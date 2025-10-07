const mongoose = require('mongoose');
const Warehouse = require('../models/Warehouse');

const sampleWarehouses = [
  {
    name: 'Main Distribution Center',
    code: 'MDC-001',
    location: {
      address: '1234 Industrial Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    capacity: 10000,
    manager: 'John Smith',
    phone: '+1-555-0101',
    email: 'john.smith@teafactory.com',
    description: 'Primary distribution center for the West Coast operations',
    status: 'active'
  },
  {
    name: 'Cold Storage Facility',
    code: 'CSF-002',
    location: {
      address: '5678 Refrigeration Way',
      city: 'Denver',
      state: 'CO',
      zipCode: '80202',
      country: 'USA'
    },
    capacity: 5000,
    manager: 'Sarah Johnson',
    phone: '+1-555-0102',
    email: 'sarah.johnson@teafactory.com',
    description: 'Temperature-controlled storage for premium teas',
    status: 'active'
  },
  {
    name: 'East Coast Hub',
    code: 'ECH-003',
    location: {
      address: '9101 Harbor Drive',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    capacity: 8000,
    manager: 'Mike Davis',
    phone: '+1-555-0103',
    email: 'mike.davis@teafactory.com',
    description: 'Primary distribution center for East Coast and international shipping',
    status: 'active'
  },
  {
    name: 'Processing Center',
    code: 'PC-004',
    location: {
      address: '2345 Manufacturing St',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301',
      country: 'USA'
    },
    capacity: 3000,
    manager: 'Emily Chen',
    phone: '+1-555-0104',
    email: 'emily.chen@teafactory.com',
    description: 'Tea processing and packaging facility',
    status: 'maintenance'
  },
  {
    name: 'Regional Warehouse Florida',
    code: 'RWF-005',
    location: {
      address: '6789 Commerce Pkwy',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA'
    },
    capacity: 4500,
    manager: 'Carlos Rodriguez',
    phone: '+1-555-0105',
    email: 'carlos.rodriguez@teafactory.com',
    description: 'Regional distribution for Southeast operations',
    status: 'active'
  }
];

const seedWarehouses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teafactory');
    console.log('✅ Connected to MongoDB');
    
    // Clear existing warehouses
    await Warehouse.deleteMany({});
    console.log('🗑️ Cleared existing warehouses');
    
    // Insert sample warehouses
    const createdWarehouses = await Warehouse.insertMany(sampleWarehouses);
    console.log(`✅ Created ${createdWarehouses.length} sample warehouses`);
    
    console.log('🎉 Warehouse seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding warehouses:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Run the seeder if this file is executed directly
if (require.main === module) {
  require('dotenv').config();
  seedWarehouses();
}

module.exports = { seedWarehouses, sampleWarehouses };