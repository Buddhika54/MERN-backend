const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Supplier = require('../models/Supplier');
// You'll need to create a User model for admins
const User = require('../models/User'); 

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Create token
    const token = jwt.sign(
      { userId: user._id, role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );
    
    res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Supplier login
router.post('/supplier/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find supplier
    const supplier = await Supplier.findOne({ email });
    if (!supplier) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check if supplier is active
    if (supplier.status !== 'active') {
      return res.status(403).json({ message: 'Your account is not active. Please contact support.' });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, supplier.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Create token
    const token = jwt.sign(
      { supplierId: supplier._id, role: 'supplier' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );
    
    res.json({
      supplierId: supplier.supplierId,
      name: supplier.name,
      email: supplier.email,
      token
    });
    
  } catch (error) {
    console.error('Supplier login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register new admin user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'admin' } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new user
    const newUser = new User({
      name,
      email,
      password, // will be hashed by pre-save hook
      role: role.toLowerCase()
    });
    
    await newUser.save();
    
    // Create token
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );
    
    res.status(201).json({
      userId: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Register new supplier
router.post('/supplier/register', async (req, res) => {
  try {
    const { name, contactPerson, email, phone, password, address } = req.body;
    
    // Check if supplier already exists
    const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier) {
      return res.status(400).json({ message: 'Supplier with this email already exists' });
    }
    
    // Generate supplier ID
    const supplierId = `SUP-${require('uuid').v4().substring(0, 8).toUpperCase()}`;
    
    // Create new supplier
    const newSupplier = new Supplier({
      supplierId,
      name,
      contactPerson,
      email,
      phone,
      password, // Make sure to add a password field to your Supplier model
      address: address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      },
      status: 'pending', // New suppliers start as pending until approved
      leadTime: 14, // Default lead time
      paymentTerms: 'Net 30', // Default payment terms
      suppliedItems: []
    });
    
    await newSupplier.save();
    
    // Create token
    const token = jwt.sign(
      { supplierId: newSupplier._id, role: 'supplier' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );
    
    res.status(201).json({
      supplierId: newSupplier.supplierId,
      name: newSupplier.name,
      email: newSupplier.email,
      status: newSupplier.status,
      token
    });
    
  } catch (error) {
    console.error('Supplier registration error:', error);
    res.status(500).json({ message: 'Server error during supplier registration' });
  }
});

module.exports = router;