const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({  // Note: createTransport (not createTransporter)
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'salemanager516@gmail.com',
        pass: process.env.EMAIL_PASS || 'byklfvxpgjyvrddf',
      },
    });
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified successfully');
      return { success: true, message: 'Email service is working' };
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return { success: false, message: error.message };
    }
  }

  // Send test email
  async sendTestEmail(testEmail = process.env.INVENTORY_ALERT_EMAIL || 'imaloffice19@gmail.com') {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
        to: testEmail,
        subject: 'Tea Factory - Email Service Test',
        html: `
          <h2>🍃 Tea Factory Email Service Test</h2>
          <p>This is a test email from the Tea Factory Inventory Management System.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> ${process.env.EMAIL_USER || 'salemanager516@gmail.com'}</p>
          <hr>
          <p style="color: green;">✅ Email service is working correctly!</p>
          <small>Tea Factory Inventory Management System</small>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully:', result.messageId);
      return { 
        success: true, 
        message: 'Test email sent successfully',
        messageId: result.messageId,
        sentTo: testEmail
      };
    } catch (error) {
      console.error('❌ Failed to send test email:', error.message);
      return { success: false, message: error.message };
    }
  }

  async sendLowStockAlert(item) {
    try {
      const toEmail = process.env.INVENTORY_ALERT_EMAIL || 'imaloffice19@gmail.com';
      const mailOptions = {
        from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
        to: toEmail,
        subject: `Low Stock Alert: ${item.itemName}`,
        html: `
          <h2 style="color: red;">🚨 Low Stock Alert</h2>
          <p>Item <strong>${item.itemName} (${item.itemId})</strong> is running low on stock.</p>
          <p><strong>Current Stock:</strong> ${item.currentStock} ${item.unit}</p>
          <p><strong>Minimum Stock Level:</strong> ${item.minimumStock} ${item.unit}</p>
          <p><strong>Suggested Reorder Quantity:</strong> ${item.reorderQuantity || (item.maximumStock - item.currentStock)} ${item.unit}</p>
          ${item.supplier ? `<p><strong>Supplier:</strong> ${item.supplier.name} (${item.supplier.email})</p>` : ''}
          <p style="color: red;"><strong>Action Required:</strong> Please reorder immediately</p>
          <hr>
          <small>This is an automated message from Tea Factory Inventory System.</small>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Low stock alert sent for ${item.itemName}`);
      return { success: true, message: `Alert sent for ${item.itemName}` };
    } catch (error) {
      console.error('Error sending low stock alert:', error);
      return { success: false, message: error.message };
    }
  }

  async sendReorderNotification(purchaseOrder) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
        to: purchaseOrder.supplier.email,
        cc: process.env.PROCUREMENT_EMAIL || 'procurement@teafactory.com',
        subject: `Purchase Order - ${purchaseOrder.poNumber}`,
        html: `
          <h2>📋 Purchase Order Request</h2>
          <p><strong>PO Number:</strong> ${purchaseOrder.poNumber}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Expected Delivery:</strong> ${purchaseOrder.expectedDeliveryDate?.toLocaleDateString() || 'ASAP'}</p>
          
          <h3>Items Requested:</h3>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <thead>
              <tr style="background-color: #4caf50; color: white;">
                <th style="padding: 10px; border: 1px solid #ddd;">Item</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Quantity</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Unit Price</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${purchaseOrder.items?.map(item => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">$${item.unitPrice}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">$${item.totalPrice}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          
          ${purchaseOrder.totalAmount ? `<p><strong>Total Amount: $${purchaseOrder.totalAmount}</strong></p>` : ''}
          
          <p>Please confirm receipt and provide delivery timeline.</p>
          <hr>
          <p style="font-size: 12px;">Best regards,<br><strong>Tea Factory Procurement Team</strong></p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Purchase order sent to ${purchaseOrder.supplier.name}`);
      return { success: true, message: `Purchase order sent to ${purchaseOrder.supplier.name}` };
    } catch (error) {
      console.error('Error sending purchase order:', error);
      return { success: false, message: error.message };
    }
  }

  // Bulk reorder notifications method
  async sendBulkReorderNotifications(items) {
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

      const results = [];

      // Send email to each supplier
      for (const [supplierId, group] of Object.entries(supplierGroups)) {
        try {
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

          await this.transporter.sendMail(mailOptions);
          results.push({
            supplier: group.name,
            email: group.email,
            items: group.items.length,
            status: 'sent',
            value: totalValue
          });

        } catch (error) {
          results.push({
            supplier: group.name,
            email: group.email,
            items: group.items.length,
            status: 'failed',
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.status === 'sent').length;
      const failCount = results.filter(r => r.status === 'failed').length;

      console.log(`Bulk reorder notifications: ${successCount} sent, ${failCount} failed`);
      return {
        success: true,
        message: `Reorder notifications processed: ${successCount} sent, ${failCount} failed`,
        results,
        sent: successCount,
        failed: failCount
      };

    } catch (error) {
      console.error('Error sending bulk reorder notifications:', error);
      return { success: false, message: error.message };
    }
  }

  async sendStockAvailabilityNotification(orderId, customerEmail, items, availability) {
    try {
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
        to: customerEmail,
        subject: `Stock Availability Update - Order ${orderId}`,
        html: `
          <h2>📦 Stock Availability Notification</h2>
          <p>Dear Customer,</p>
          <p>We have checked the availability for your order <strong>${orderId}</strong>.</p>
          
          <h3>Stock Status:</h3>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
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
          
          <hr>
          <small>Thank you for choosing Tea Factory!<br><strong>Customer Service Team</strong></small>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Stock availability notification sent for order ${orderId}`);
      return { success: true, message: `Stock availability notification sent for order ${orderId}` };
    } catch (error) {
      console.error('Error sending stock availability notification:', error);
      return { success: false, message: error.message };
    }
  }

  // Send order status notification (approval/rejection)
  async sendOrderStatusNotification(orderId, customerEmail, orderDetails, status, reason = '') {
    try {
      const isApproved = status === 'approved';
      const mailOptions = {
        from: process.env.EMAIL_USER || 'salemanager516@gmail.com',
        to: customerEmail,
        subject: `Order ${isApproved ? 'Approved' : 'Rejected'} - ${orderId}`,
        html: `
          <h2 style="color: ${isApproved ? 'green' : 'red'};">
            ${isApproved ? '✅' : '❌'} Order ${isApproved ? 'Approved' : 'Rejected'}
          </h2>
          <p>Dear Customer,</p>
          <p>Your order <strong>${orderId}</strong> has been <strong>${status}</strong>.</p>
          
          <h3>Order Details:</h3>
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 10px; border: 1px solid #ddd;">Item</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Quantity</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Unit Price</th>
                <th style="padding: 10px; border: 1px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderDetails.items?.map(item => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">$${item.unitPrice || 0}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">$${(item.quantity * (item.unitPrice || 0)).toFixed(2)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          
          ${orderDetails.totalAmount ? `<p><strong>Total Amount: $${orderDetails.totalAmount}</strong></p>` : ''}
          
          ${isApproved ? `
            <p style="color: green;"><strong>Next Steps:</strong> Your order is being processed and will be shipped soon.</p>
            <p><strong>Expected Delivery:</strong> ${orderDetails.expectedDeliveryDate ? new Date(orderDetails.expectedDeliveryDate).toLocaleDateString() : 'To be confirmed'}</p>
          ` : `
            <p style="color: red;"><strong>Reason for Rejection:</strong> ${reason || 'Not specified'}</p>
            <p>Please contact our customer service team for assistance.</p>
          `}
          
          <hr>
          <p style="font-size: 12px;">Best regards,<br><strong>Tea Factory Order Management Team</strong></p>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Order ${status} notification sent for order ${orderId}`);
      return { success: true, message: `Order ${status} notification sent for order ${orderId}` };
    } catch (error) {
      console.error(`Error sending order ${status} notification:`, error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailService();