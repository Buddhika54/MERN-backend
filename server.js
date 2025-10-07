const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import routes
const inventoryRoutes = require('./routes/inventory');
const supplierRoutes = require('./routes/suppliers');
const dashboardRoutes = require('./routes/dashboard');
const emailRoutes = require('./routes/email');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const warehouseRoutes = require('./routes/warehouses');
const purchaseOrderRoutes = require('./routes/purchaseOrders'); // Add this line

// Import services
const stockMonitorService = require('./services/stockMonitorService');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teafactory')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes); // Add this line

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Tea Factory API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Start stock monitoring service
  stockMonitorService.startMonitoring();
});