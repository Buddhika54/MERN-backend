const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// Original confirmation email
router.post('/send-confirmation', emailController.sendConfirmationEmail);

// Tea Factory specific email routes
router.post('/low-stock-alert', emailController.sendLowStockAlert);
router.post('/purchase-order', emailController.sendPurchaseOrderNotification);
router.post('/order-status', emailController.sendOrderStatusNotification);
router.post('/stock-availability', emailController.sendStockAvailabilityNotification);
router.post('/send-reorder-notifications', emailController.sendReorderNotifications); // New route for reorder notifications

// Test route
router.post('/test', emailController.sendTestEmail);

module.exports = router;

// Send confirmation email (keeping your original function)
exports.sendConfirmationEmail = async (req, res) => {
  const { to, appointment } = req.body;
  if (!to || !appointment) return res.status(400).json({ message: 'Missing email or appointment data' });

  // Configure your SMTP transporter (use environment variables in production)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Appointment Confirmation',
    html: `<h2>Appointment Confirmed</h2>
      <p>Dear ${appointment.patientName || 'Patient'},</p>
      <p>Your appointment with Dr. ${appointment.doctorName || appointment.doctorId} is confirmed for <b>${appointment.date}</b> at <b>${appointment.startTime}</b>.</p>
      <p>Reference No: <b>${appointment.referenceNo}</b></p>
      <p>Thank you for choosing our hospital.</p>
      <hr />
      <small>This is an automated message. Please do not reply.</small>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Confirmation email sent' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
};

// Send stock availability notification
exports.sendStockAvailabilityEmail = async (req, res) => {
  const { orderId, customerEmail, items, availability } = req.body;
  
  if (!orderId || !customerEmail || !items || !availability) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  try {
    const result = await emailService.sendStockAvailabilityNotification(orderId, customerEmail, items, availability);
    res.json({ message: 'Stock availability email sent', result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send stock availability email', error: error.message });
  }
};

// Send order approval notification
exports.sendOrderApprovalEmail = async (req, res) => {
  const { orderId, customerEmail, orderDetails, status, reason } = req.body;
  if (!orderId || !customerEmail || !orderDetails || !status) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  try {
    const result = await emailService.sendOrderStatusNotification(orderId, customerEmail, orderDetails, status, reason);
    res.json({ message: `Order ${status} email sent`, result });
  } catch (error) {
    res.status(500).json({ message: `Failed to send order ${status} email`, error: error.message });
  }
};

// Send purchase order to supplier
exports.sendPurchaseOrderToSupplier = async (req, res) => {
  const { purchaseOrder } = req.body;
  if (!purchaseOrder) {
    return res.status(400).json({ message: 'Missing purchase order data' });
  }

  try {
    const result = await emailService.sendReorderNotification(purchaseOrder);
    res.json({ message: 'Purchase order sent to supplier', result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send purchase order', error: error.message });
  }
};

// Send low stock alert
exports.sendLowStockAlert = async (req, res) => {
  const { item } = req.body;
  if (!item) {
    return res.status(400).json({ message: 'Missing item data' });
  }

  try {
    const result = await emailService.sendLowStockAlert(item);
    res.json({ message: 'Low stock alert sent', result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send low stock alert', error: error.message });
  }
};

// Test email connection
exports.testEmailConnection = async (req, res) => {
  try {
    const result = await emailService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send test email
exports.sendTestEmail = async (req, res) => {
  try {
    const { testEmail } = req.body;
    const result = await emailService.sendTestEmail(testEmail || process.env.INVENTORY_ALERT_EMAIL);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};