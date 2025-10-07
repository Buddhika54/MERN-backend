const express = require('express');
const router = express.Router();
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const emailService = require('../services/emailService');

// Get all purchase orders
router.get('/', async (req, res) => {
  try {
    const { status, priority, supplier, limit = 50, page = 1 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (supplier) filter.supplier = supplier;

    const orders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalOrders = await PurchaseOrder.countDocuments(filter);

    res.json({
      orders,
      pagination: {
        current: page,
        pages: Math.ceil(totalOrders / limit),
        total: totalOrders
      }
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ message: 'Failed to fetch purchase orders' });
  }
});

// Get purchase order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id).populate('supplier');
    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ message: 'Failed to fetch purchase order' });
  }
});

// Create new purchase order
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Validate supplier exists
    const supplier = await Supplier.findById(orderData.supplier);
    if (!supplier) {
      return res.status(400).json({ message: 'Invalid supplier' });
    }

    const order = new PurchaseOrder(orderData);
    await order.save();
    
    // Populate supplier info for response
    await order.populate('supplier');

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ message: 'Failed to create purchase order' });
  }
});

// Update purchase order
router.put('/:id', async (req, res) => {
  try {
    const order = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('supplier');

    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ message: 'Failed to update purchase order' });
  }
});

// Update purchase order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, updatedBy = 'user' } = req.body;
    
    const order = await PurchaseOrder.findById(req.params.id).populate('supplier');
    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    order.updateStatus(status, updatedBy);
    await order.save();

    // Send email notification if order is sent
    if (status === 'sent' && order.supplier?.email) {
      try {
        await emailService.sendReorderNotification({
          poNumber: order.poNumber,
          supplier: order.supplier,
          items: order.items,
          totalAmount: order.totalAmount,
          expectedDeliveryDate: order.expectedDeliveryDate,
          notes: order.notes
        });
      } catch (emailError) {
        console.error('Failed to send PO email:', emailError);
        // Don't fail the status update if email fails
      }
    }

    res.json(order);
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    res.status(500).json({ message: 'Failed to update purchase order status' });
  }
});

// Delete purchase order
router.delete('/:id', async (req, res) => {
  try {
    const order = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ message: 'Failed to delete purchase order' });
  }
});

// Get overdue orders
router.get('/reports/overdue', async (req, res) => {
  try {
    const overdueOrders = await PurchaseOrder.findOverdueOrders();
    res.json(overdueOrders);
  } catch (error) {
    console.error('Error fetching overdue orders:', error);
    res.status(500).json({ message: 'Failed to fetch overdue orders' });
  }
});

// Get urgent orders
router.get('/reports/urgent', async (req, res) => {
  try {
    const urgentOrders = await PurchaseOrder.findUrgentOrders();
    res.json(urgentOrders);
  } catch (error) {
    console.error('Error fetching urgent orders:', error);
    res.status(500).json({ message: 'Failed to fetch urgent orders' });
  }
});

module.exports = router;