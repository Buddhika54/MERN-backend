const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Sample users with different roles
const sampleUsers = [
  {
    name: 'Admin User',
    email: 'admin@teafactory.com',
    password: 'Admin@123',
    role: 'admin'
  },
  {
    name: 'Warehouse Manager',
    email: 'manager@teafactory.com',
    password: 'Manager@123',
    role: 'manager'
  },
  {
    name: 'Inventory Viewer',
    email: 'viewer@teafactory.com',
    password: 'Viewer@123',
    role: 'viewer'
  }
];

// Function to seed users
async function seedUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teafactory');
    console.log('Connected to MongoDB');

    // Check if users already exist
    const count = await User.countDocuments();
    if (count > 0) {
      console.log(`Found ${count} existing users. Skipping user seeding.`);
      console.log('To force re-seeding, run: node seeders/userSeeder.js --force');
      
      if (process.argv.includes('--force')) {
        console.log('Force flag detected. Clearing existing users...');
        await User.deleteMany({});
      } else {
        mongoose.connection.close();
        return;
      }
    }

    // Hash passwords
    const hashedUsers = await Promise.all(
      sampleUsers.map(async (user) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(user.password, salt);
        return {
          ...user,
          password: hashedPassword
        };
      })
    );

    // Insert users
    const insertedUsers = await User.insertMany(hashedUsers);
    console.log(`Successfully inserted ${insertedUsers.length} users:`);
    insertedUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) [${user.role}]`);
    });

    console.log('✅ User seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seeder
if (require.main === module) {
  seedUsers();
}

module.exports = { seedUsers, sampleUsers };