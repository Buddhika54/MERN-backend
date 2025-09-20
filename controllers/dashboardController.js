const Item = require("../models/item");
const Stock = require("../models/Stock");
const PurchaseRequest = require("../models/PurchaseRequest");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalItems = await Item.countDocuments();
    const lowStockItems = await Stock.countDocuments({ quantity: { $lt: 50 } });
    const pendingReorders = await PurchaseRequest.countDocuments({ status: "pending" });
    const totalSales = 1200; // Placeholder, integrate later with Sales module
    res.json({ totalItems, lowStockItems, pendingReorders, totalSales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
