const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Invoice = require("../models/invoiceModel");

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ----------------------- ORDERS CRUD -----------------------------

// @desc    Create new order
// @route   POST /api/orders
router.post("/", async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      product,
      quantity,
      productSpecs,
      deliveryInstructions,
    } = req.body;

    const newOrder = new Order({
      customerName,
      customerEmail,
      product,
      quantity,
      productSpecs,
      deliveryInstructions,
    });

    await newOrder.save();
    return res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ success: false, error: "Server error while creating order" });
  }
});

// @desc    Get all orders
// @route   GET /api/orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ success: false, error: "Server error while fetching orders" });
  }
});

// @desc    Get single order by ID
// @route   GET /api/orders/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid Order ID" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ success: false, error: "Server error while fetching order" });
  }
});

// @desc    Update order and optionally generate invoice
// @route   PUT /api/orders/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid Order ID" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const prevStatus = order.status;

    Object.keys(req.body).forEach((key) => {
      order[key] = req.body[key];
    });
    await order.save();

    // ✅ Generate invoice only if status changed to "Confirmed"
    if (req.body.status === "Confirmed" && prevStatus !== "Confirmed") {
      const taxRate = 0.1;
      const pricePerUnit = 50;
      const totalAmount = order.quantity * pricePerUnit * (1 + taxRate);

      const newInvoice = new Invoice({
        orderId: order._id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        product: order.product,
        quantity: order.quantity,
        productSpecs: order.productSpecs,
        deliveryInstructions: order.deliveryInstructions,
        status: order.status,
        tax: order.quantity * pricePerUnit * taxRate,
        totalAmount,
      });

      await newInvoice.save();
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ success: false, error: "Server error while updating order" });
  }
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid Order ID" });
    }

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    return res.status(200).json({ success: true, message: "Order deleted" });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ success: false, error: "Server error while deleting order" });
  }
});

// ----------------------- PDF INVOICE GENERATION -----------------------------

// @desc    Generate PDF invoice for order
// @route   GET /api/orders/:id/invoice
router.get("/:id/invoice", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid Order ID" });
    }

    const invoice = await Invoice.findOne({ orderId: id }).populate("orderId");
    if (!invoice) {
      return res.status(404).json({ success: false, error: "Invoice not found for this order" });
    }

    const doc = new PDFDocument();
    const filePath = path.join(__dirname, `../invoices/invoice_${invoice._id}.pdf`);

    if (!fs.existsSync(path.join(__dirname, "../invoices"))) {
      fs.mkdirSync(path.join(__dirname, "../invoices"));
    }

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(18).text("Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Customer: ${invoice.customerName}`);
    doc.text(`Email: ${invoice.customerEmail}`);
    doc.moveDown();

    doc.text(`Product: ${invoice.product}`);
    doc.text(`Quantity: ${invoice.quantity}`);
    if (invoice.productSpecs) doc.text(`Specs: ${invoice.productSpecs}`);
    if (invoice.deliveryInstructions) doc.text(`Delivery: ${invoice.deliveryInstructions}`);
    doc.moveDown();

    doc.text(`Status: ${invoice.status}`);
    doc.text(`Tax: $${invoice.tax.toFixed(2)}`);
    doc.text(`Total: $${invoice.totalAmount.toFixed(2)}`);
    doc.text(`Created At: ${invoice.createdAt.toDateString()}`);
    doc.end();

    doc.on("finish", () => {
      res.download(filePath, `Invoice_${invoice._id}.pdf`);
    });

  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ success: false, error: "Server error while generating invoice PDF" });
  }
});

// ----------------------- ORDER DETAILS PDF -----------------------------

// @desc    Generate PDF with full order details
// @route   GET /api/orders/:id/details-pdf
router.get("/:id/details-pdf", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid Order ID" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const doc = new PDFDocument();
    const filePath = path.join(__dirname, `../invoices/order_${order._id}_details.pdf`);

    if (!fs.existsSync(path.join(__dirname, "../invoices"))) {
      fs.mkdirSync(path.join(__dirname, "../invoices"));
    }

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(18).text("Order Details", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Customer: ${order.customerName}`);
    doc.text(`Email: ${order.customerEmail}`);
    doc.text(`Contact: ${order.contactNumber}`);
    doc.moveDown();

    doc.text(`Product: ${order.product}`);
    doc.text(`Quantity: ${order.quantity}`);
    if (order.productSpecs) doc.text(`Specs: ${order.productSpecs}`);
    if (order.deliveryInstructions) doc.text(`Delivery: ${order.deliveryInstructions}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Created At: ${order.createdAt.toDateString()}`);
    doc.end();

    doc.on("finish", () => {
      res.download(filePath, `Order_${order._id}_Details.pdf`);
    });

  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ success: false, error: "Server error while generating order details PDF" });
  }
});

module.exports = router;
