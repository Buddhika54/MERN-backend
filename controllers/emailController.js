const nodemailer = require('nodemailer');

// Original appointment confirmation function (keeping as is)
exports.sendConfirmationEmail = async (req, res) => {
  const { to, appointment } = req.body;
  if (!to || !appointment) return res.status(400).json({ message: 'Missing email or appointment data' });

  // Configure your SMTP transporter (use environment variables in production)
  const transporter = nodemailer.createTransport({  // Fixed: createTransport (not createTransporter)
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
      pass: process.env.EMAIL_PASS || 'byklfvxpgjyvrddf',
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
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

// Send low stock alert
exports.sendLowStockAlert = async (req, res) => {
  const { to, item } = req.body;
  if (!to || !item) return res.status(400).json({ message: 'Missing email or item data' });

  const transporter = nodemailer.createTransport({  // Fixed: createTransport
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
      pass: process.env.EMAIL_PASS || 'byklfvxpgjyvrddf',
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
    to,
    subject: `Low Stock Alert: ${item.itemName}`,
    html: `<h2 style="color: red;">🚨 Low Stock Alert</h2>
      <p>Item <strong>${item.itemName} (${item.itemId})</strong> is running low on stock.</p>
      <p><strong>Current Stock:</strong> ${item.currentStock} ${item.unit}</p>
      <p><strong>Minimum Stock Level:</strong> ${item.minimumStock} ${item.unit}</p>
      <p><strong>Suggested Reorder Quantity:</strong> ${item.reorderQuantity || (item.maximumStock - item.currentStock)} ${item.unit}</p>
      ${item.supplier ? `<p><strong>Supplier:</strong> ${item.supplier.name} (${item.supplier.email})</p>` : ''}
      <p style="color: red;"><strong>Action Required:</strong> Please reorder immediately</p>
      <hr />
      <small>This is an automated message from Tea Factory Inventory System.</small>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Low stock alert sent' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send low stock alert', error: err.message });
  }
};

// Send purchase order to supplier
exports.sendPurchaseOrderNotification = async (req, res) => {
  const { to, purchaseOrder } = req.body;
  if (!to || !purchaseOrder) return res.status(400).json({ message: 'Missing email or purchase order data' });

  const transporter = nodemailer.createTransport({  // Fixed: createTransport
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
      pass: process.env.EMAIL_PASS || 'byklfvxpgjyvrddf',
    },
  });

  const itemsHtml = purchaseOrder.items?.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">$${item.unitPrice}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">$${item.totalPrice}</td>
    </tr>
  `).join('') || '';

  const mailOptions = {
    from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
    to,
    subject: `Purchase Order - ${purchaseOrder.poNumber}`,
    html: `<h2>📋 Purchase Order Request</h2>
      <p><strong>PO Number:</strong> ${purchaseOrder.poNumber}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Expected Delivery:</strong> ${purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString() : 'ASAP'}</p>
      
      <h3>Items Requested:</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #4caf50; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd;">Item</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Quantity</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Unit Price</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      ${purchaseOrder.totalAmount ? `<p><strong>Total Amount: $${purchaseOrder.totalAmount}</strong></p>` : ''}
      ${purchaseOrder.notes ? `<p><strong>Notes:</strong> ${purchaseOrder.notes}</p>` : ''}
      
      <p>Please confirm receipt and provide delivery timeline.</p>
      <hr />
      <small>Best regards,<br>Tea Factory Procurement Team</small>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Purchase order sent to supplier' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send purchase order', error: err.message });
  }
};

// Send order status notification (approval/rejection)
exports.sendOrderStatusNotification = async (req, res) => {
  const { to, order, status, reason } = req.body;
  if (!to || !order || !status) return res.status(400).json({ message: 'Missing email, order, or status data' });

  const transporter = nodemailer.createTransport({  // Fixed: createTransport
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
      pass: process.env.EMAIL_PASS || 'byklfvxpgjyvrddf',
    },
  });

  const isApproved = status === 'approved';
  
  const itemsHtml = order.items?.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">$${item.unitPrice || 0}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">$${(item.quantity * (item.unitPrice || 0)).toFixed(2)}</td>
    </tr>
  `).join('') || '';

  const mailOptions = {
    from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
    to,
    subject: `Order ${isApproved ? 'Approved' : 'Rejected'} - ${order.orderId}`,
    html: `<h2 style="color: ${isApproved ? 'green' : 'red'};">
        ${isApproved ? '✅' : '❌'} Order ${isApproved ? 'Approved' : 'Rejected'}
      </h2>
      <p>Dear Customer,</p>
      <p>Your order <strong>${order.orderId}</strong> has been <strong>${status}</strong>.</p>
      
      <h3>Order Details:</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; border: 1px solid #ddd;">Item</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Quantity</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Unit Price</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      ${order.totalAmount ? `<p><strong>Total Amount: $${order.totalAmount}</strong></p>` : ''}
      
      ${isApproved ? `
        <p style="color: green;"><strong>Next Steps:</strong> Your order is being processed and will be shipped soon.</p>
        <p><strong>Expected Delivery:</strong> ${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'To be confirmed'}</p>
      ` : `
        <p style="color: red;"><strong>Reason for Rejection:</strong> ${reason || 'Not specified'}</p>
        <p>Please contact our customer service team for assistance.</p>
      `}
      
      <hr />
      <small>Best regards,<br>Tea Factory Order Management Team</small>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: `Order ${status} notification sent` });
  } catch (err) {
    res.status(500).json({ message: `Failed to send order ${status} notification`, error: err.message });
  }
};

// Send stock availability notification
exports.sendStockAvailabilityNotification = async (req, res) => {
  const { to, orderId, items, availability } = req.body;
  if (!to || !orderId || !items || !availability) return res.status(400).json({ message: 'Missing required data' });

  const transporter = nodemailer.createTransport({  // Fixed: createTransport
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
      pass: process.env.EMAIL_PASS || 'byklfvxpgjyvrddf',
    },
  });

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.requestedQty}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${item.availableQty}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">
        <span style="color: ${item.availableQty >= item.requestedQty ? 'green' : 'red'};">
          ${item.availableQty >= item.requestedQty ? '✓ Available' : '✗ Insufficient'}
        </span>
      </td>
    </tr>
  `).join('');

  const allAvailable = availability.allAvailable;

  const mailOptions = {
    from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
    to,
    subject: `Stock Availability Update - Order ${orderId}`,
    html: `<h2>📦 Stock Availability Notification</h2>
      <p>Dear Customer,</p>
      <p>We have checked the availability for your order <strong>${orderId}</strong>.</p>
      
      <h3>Stock Status:</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; border: 1px solid #ddd;">Item</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Requested</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Available</th>
            <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      ${allAvailable ? 
        '<p style="color: green;">✅ Your order will be processed immediately.</p>' :
        '<p style="color: orange;">⚠️ Some items have limited availability. We will contact you with alternatives.</p>'
      }
      
      <hr />
      <small>Thank you for choosing Tea Factory!<br>Customer Service Team</small>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Stock availability notification sent' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send stock availability notification', error: err.message });
  }
};

// Send reorder notifications to suppliers
exports.sendReorderNotifications = async (req, res) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Missing items data or items array is empty' });
  }

  const transporter = nodemailer.createTransport({  // Fixed: createTransport
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
      pass: process.env.EMAIL_PASS || 'byklfvxpgjyvrddf',
    },
  });

  try {
    // Group items by supplier
    const supplierGroups = {};
    
    items.forEach(item => {
      const supplierId = item.supplier?._id || 'no-supplier';
      const supplierEmail = item.supplier?.email || process.env.DEFAULT_SUPPLIER_EMAIL || 'procurement@teafactory.com';
      const supplierName = item.supplier?.name || 'Default Supplier';
      
      if (!supplierGroups[supplierId]) {
        supplierGroups[supplierId] = {
          email: supplierEmail,
          name: supplierName,
          items: []
        };
      }
      
      supplierGroups[supplierId].items.push(item);
    });

    const emailPromises = [];
    const results = [];

    // Send email to each supplier
    for (const [supplierId, group] of Object.entries(supplierGroups)) {
      const itemsHtml = group.items.map(item => {
        const reorderQty = item.reorderQuantity || (item.maximumStock - item.currentStock);
        const estimatedCost = (item.unitCost || item.costPerUnit || 0) * reorderQty;
        
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.itemId}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.currentStock} ${item.unit}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.minimumStock} ${item.unit}</td>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #d32f2f;">${reorderQty} ${item.unit}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">$${estimatedCost.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const totalValue = group.items.reduce((sum, item) => {
        const reorderQty = item.reorderQuantity || (item.maximumStock - item.currentStock);
        const estimatedCost = (item.unitCost || item.costPerUnit || 0) * reorderQty;
        return sum + estimatedCost;
      }, 0);

      const mailOptions = {
        from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
        to: group.email,
        cc: process.env.PROCUREMENT_EMAIL || 'procurement@teafactory.com',
        subject: `🚨 Urgent Reorder Request - ${group.items.length} Items`,
        html: `
          <h2 style="color: #d32f2f;">🚨 Urgent Reorder Request</h2>
          <p>Dear <strong>${group.name}</strong>,</p>
          <p>We have <strong>${group.items.length} items</strong> that urgently need to be reordered due to low stock levels.</p>
          
          <h3>Items Requiring Immediate Reorder:</h3>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <thead>
              <tr style="background-color: #d32f2f; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">Item Name</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Item ID</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Current Stock</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Min. Stock</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Reorder Qty</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <p style="margin: 0;"><strong>Total Estimated Value: $${totalValue.toFixed(2)}</strong></p>
          </div>
          
          <div style="background-color: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #d32f2f;">⚠️ URGENT ACTION REQUIRED</h4>
            <p style="margin: 0;">These items are critically low in stock. Please prioritize this order to avoid stockouts.</p>
          </div>
          
          <h3>Next Steps:</h3>
          <ol>
            <li>Review the reorder quantities and adjust if necessary</li>
            <li>Confirm availability and delivery timeline</li>
            <li>Send quotation and delivery schedule</li>
            <li>Process the order immediately upon approval</li>
          </ol>
          
          <p><strong>Expected Delivery:</strong> ASAP (within 3-5 business days preferred)</p>
          <p><strong>Contact:</strong> ${process.env.PROCUREMENT_PHONE || '+1-555-0123'} | ${process.env.PROCUREMENT_EMAIL || 'procurement@teafactory.com'}</p>
          
          <hr />
          <p style="font-size: 12px; color: #666;">
            Best regards,<br>
            <strong>Tea Factory Procurement Team</strong><br>
            Generated on: ${new Date().toLocaleString()}
          </p>
        `
      };

      const emailPromise = transporter.sendMail(mailOptions)
        .then(() => {
          results.push({
            supplier: group.name,
            email: group.email,
            items: group.items.length,
            status: 'sent',
            value: totalValue
          });
        })
        .catch((error) => {
          results.push({
            supplier: group.name,
            email: group.email,
            items: group.items.length,
            status: 'failed',
            error: error.message,
            value: totalValue
          });
        });

      emailPromises.push(emailPromise);
    }

    // Wait for all emails to be processed
    await Promise.allSettled(emailPromises);

    const successCount = results.filter(r => r.status === 'sent').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    res.json({
      message: `Reorder notifications processed: ${successCount} sent, ${failCount} failed`,
      details: results,
      totalSuppliers: Object.keys(supplierGroups).length,
      totalItems: items.length,
      sent: successCount,
      failed: failCount
    });

  } catch (err) {
    console.error('Error sending reorder notifications:', err);
    res.status(500).json({ 
      message: 'Failed to send reorder notifications', 
      error: err.message 
    });
  }
};

// Send test email
exports.sendTestEmail = async (req, res) => {
  const { to } = req.body;
  const testEmail = to || process.env.INVENTORY_ALERT_EMAIL || 'imaloffice19@gmail.com';

  const transporter = nodemailer.createTransport({  // Fixed: createTransport
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
      pass: process.env.EMAIL_PASS || 'byklfvxpgjyvrddf',
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
    to: testEmail,
    subject: 'Tea Factory - Test Email',
    html: `
      <h2>🍃 Tea Factory System Test</h2>
      <p>This is a test email from the Tea Factory Inventory Management System.</p>
      <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>System Status:</strong> ✅ Email service is working correctly</p>
      <hr />
      <small>Tea Factory Inventory Management System</small>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ 
      message: 'Test email sent successfully',
      sentTo: testEmail,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to send test email', 
      error: err.message,
      sentTo: testEmail 
    });
  }
};