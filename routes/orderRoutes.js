const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Invoice = require("../models/invoiceModel");

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Simple helper to draw a key/value table
function drawKeyValueTable(doc, rows, {
  x = 50,
  y = doc.y,
  col1Width = 160,
  col2Width = 360,
  rowHeight = 24,
  header = null,
} = {}) {
  const tableWidth = col1Width + col2Width;

  if (header) {
    doc.fontSize(12).font("Helvetica-Bold").text(header, x, y);
    y += rowHeight;
  }

  // Header row background and labels
  doc.save();
  doc.rect(x, y, col1Width, rowHeight).fill("#f0f0f0").stroke();
  doc.fillColor("#000").font("Helvetica-Bold").text("Field", x + 8, y + 6, { width: col1Width - 16 });
  doc.fillColor("#000");
  doc.rect(x + col1Width, y, col2Width, rowHeight).fill("#f0f0f0").stroke();
  doc.fillColor("#000").font("Helvetica-Bold").text("Value", x + col1Width + 8, y + 6, { width: col2Width - 16 });
  doc.restore();

  y += rowHeight;

  // Rows
  doc.font("Helvetica");
  rows.forEach(([k, v]) => {
    // Box for key
    doc.rect(x, y, col1Width, rowHeight).stroke();
    doc.text(String(k), x + 8, y + 6, { width: col1Width - 16 });

    // Box for value (allow wrap)
    doc.rect(x + col1Width, y, col2Width, rowHeight).stroke();
    doc.text(String(v), x + col1Width + 8, y + 6, { width: col2Width - 16 });

    y += rowHeight;
  });

  // Move document cursor below the table
  doc.moveTo(x, y);
  doc.y = y + 10;
}

// ----------------------- ORDERS CRUD -----------------------------

// @desc    Create new order
// @route   POST /api/orders
router.post("/", async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      contactNumber,
      product,
      quantity,
      items,
      productSpecs,
      deliveryInstructions,
      price,
    } = req.body;

    // Basic email validation (required on create)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || !emailRegex.test(String(customerEmail))) {
      return res.status(400).json({ success: false, error: "A valid email is required" });
    }

    // Delivery instructions required (non-empty)
    if (!deliveryInstructions || !String(deliveryInstructions).trim()) {
      return res.status(400).json({ success: false, error: "Delivery instructions are required" });
    }

    const newOrder = new Order({
      customerName,
      customerEmail,
      contactNumber,
      product,
      quantity,
      items,
      productSpecs,
      deliveryInstructions,
      price,
    });

    await newOrder.save();
    return res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error(error.message);
    // Return validation errors as 400 to avoid generic 500s for client-side fixable issues
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ success: false, error: error.message });
    }
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

    // Validate email if provided
    if (req.body.customerEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(req.body.customerEmail))) {
        return res.status(400).json({ success: false, error: "Invalid email format" });
      }
    }

    // Validate deliveryInstructions if provided
    if (req.body.deliveryInstructions !== undefined) {
      if (!String(req.body.deliveryInstructions).trim()) {
        return res.status(400).json({ success: false, error: "Delivery instructions cannot be empty" });
      }
    }

    Object.keys(req.body).forEach((key) => {
      order[key] = req.body[key];
    });
    await order.save();

    // ✅ Generate invoice only if status changed to "Confirmed"
    if (req.body.status === "Confirmed" && prevStatus !== "Confirmed") {
      // Compute totals based on the price stored with the order so the invoice matches the customer's order
      const taxRate = 0.1; // 10% tax (adjust as needed)
      const baseAmount = Number(order.price || 0);
      const tax = baseAmount * taxRate;
      const totalAmount = baseAmount + tax;

      const newInvoice = new Invoice({
        orderId: order._id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        product: order.product,
        quantity: order.quantity,
        productSpecs: order.productSpecs,
        deliveryInstructions: order.deliveryInstructions,
        status: order.status,
        tax,
        totalAmount,
      });

      await newInvoice.save();
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    console.error(error.message);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ success: false, error: error.message });
    }
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

    let invoice = await Invoice.findOne({ orderId: id }).populate("orderId");

    // If invoice doesn't exist yet, attempt to create it on-demand from the order
    if (!invoice) {
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      const taxRate = 0.1;
      const baseAmount = Number(order.price || 0);
      const tax = baseAmount * taxRate;
      const totalAmount = baseAmount + tax;

      invoice = new Invoice({
        orderId: order._id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        product: order.product,
        quantity: order.quantity,
        productSpecs: order.productSpecs,
        deliveryInstructions: order.deliveryInstructions,
        status: order.status,
        tax,
        totalAmount,
      });
      await invoice.save();
    }

    // Stream PDF directly to client
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice_${invoice._id}.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold").text("Invoice", { align: "center" });
    doc.moveDown(1.5);

    drawKeyValueTable(doc, [
      ["Customer", invoice.customerName],
      ["Email", invoice.customerEmail],
      ["Product", invoice.product],
      ["Quantity", String(invoice.quantity)],
      ["Specs", invoice.productSpecs || "-"],
      ["Delivery", invoice.deliveryInstructions || "-"],
      ["Status", invoice.status],
      ["Base Amount", `LKR ${Math.max(0,(invoice.totalAmount||0)-(invoice.tax||0)).toLocaleString(undefined,{ maximumFractionDigits: 2 })}`],
      ["Tax (10%)", `LKR ${invoice.tax.toLocaleString(undefined,{ maximumFractionDigits: 2 })}`],
      ["Total", `LKR ${invoice.totalAmount.toLocaleString(undefined,{ maximumFractionDigits: 2 })}`],
      ["Created At", invoice.createdAt.toDateString()],
    ], { header: null });

    doc.end();

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

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Order_${order._id}_Details.pdf`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold").text("Order Details", { align: "center" });
    doc.moveDown(1.5);

    const rows = [
      ["Customer", order.customerName],
      ["Email", order.customerEmail],
      ["Contact", order.contactNumber || "-"],
      ["Product", order.product],
      ["Quantity", String(order.quantity)],
      ["Specs", order.productSpecs || "-"],
      ["Delivery", order.deliveryInstructions || "-"],
      ["Status", order.status],
      ["Created At", order.createdAt.toDateString()],
    ];
    if (typeof order.price === 'number') {
      rows.splice(6, 0, ["Price", `LKR ${order.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`]);
    }

    drawKeyValueTable(doc, rows, { header: null });

    doc.end();

  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ success: false, error: "Server error while generating order details PDF" });
  }
});

module.exports = router;
