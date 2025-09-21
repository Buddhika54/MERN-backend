const express = require('express');
const router = express.Router();
const stockService = require('../services/stockService');
const emailService = require('../services/emailService');

// Mock order data for testing
const mockOrders = [
  {
    orderId: 'ORD-001',
    customerName: 'ABC Tea Shop',
    customerEmail: 'customer@abcteashop.com',
    items: [
      { itemId: 'ITM-001', itemName: 'Earl Grey Tea', quantity: 100 },
      { itemId: 'ITM-002', itemName: 'Green Tea', quantity: 50 }
    ],
    status: 'pending',
    createdAt: new Date()
  }
];

// Simulate receiving an order/invoice and checking stock
router.post('/check-and-approve', async (req, res) => {
  try {
    const { orderId, items, customerName, customerEmail } = req.body;
    
    // Check stock availability
    const availability = await stockService.checkStockAvailability(items);
    
    // Send stock availability notification
    if (customerEmail) {
      await emailService.sendStockAvailabilityNotification(orderId, customerEmail, items, availability);
    }
    
    if (availability.allAvailable) {
      // Reserve stock if available
      const reservation = await stockService.reserveStock(
        orderId, 
        items, 
        'system_auto'
      );
      
      // Send approval notification
      if (customerEmail) {
        await emailService.sendOrderStatusNotification(orderId, customerEmail, { items }, 'approved');
      }
      
      res.json({
        success: true,
        message: 'Order approved and stock reserved',
        orderId,
        reservation,
        availability
      });
    } else {
      // Send rejection notification with reason
      const reason = 'Insufficient stock for some items';
      if (customerEmail) {
        await emailService.sendOrderStatusNotification(orderId, customerEmail, { items }, 'rejected', reason);
      }
      
      res.json({
        success: false,
        message: 'Order rejected due to insufficient stock',
        orderId,
        availability,
        reason
      });
    }
  } catch (error) {
    console.error('Error processing order:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing order',
      error: error.message
    });
  }
});

// Approve order manually
router.post('/:orderId/approve', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerEmail, orderDetails, approvedBy } = req.body;
    
    // Send approval notification
    if (customerEmail) {
      await emailService.sendOrderStatusNotification(orderId, customerEmail, orderDetails, 'approved');
    }
    
    res.json({
      success: true,
      message: 'Order approved successfully',
      orderId,
      approvedBy,
      approvedAt: new Date()
    });
  } catch (error) {
    console.error('Error approving order:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving order',
      error: error.message
    });
  }
});

// Reject order manually
router.post('/:orderId/reject', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerEmail, orderDetails, reason, rejectedBy } = req.body;
    
    // Send rejection notification
    if (customerEmail) {
      await emailService.sendOrderStatusNotification(orderId, customerEmail, orderDetails, 'rejected', reason);
    }
    
    res.json({
      success: true,
      message: 'Order rejected successfully',
      orderId,
      reason,
      rejectedBy,
      rejectedAt: new Date()
    });
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting order',
      error: error.message
    });
  }
});

// Get mock orders
router.get('/', (req, res) => {
  res.json(mockOrders);
});

module.exports = router;