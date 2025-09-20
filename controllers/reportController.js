
const Stock = require("../models/Stock");
const StockMovement = require("../models/StockMovement");
const Item = require("../models/item");

exports.lowStockReport = async (req, res) => {
  const stocks = await Stock.find({ quantity: { $lt: 50 } }).populate("item warehouse");
  res.json(stocks);
};

exports.inventoryFlowReport = async (req, res) => {
  const movements = await StockMovement.find().populate("item warehouse relatedWarehouseTo relatedSupplier").sort({ createdAt: -1 });
  res.json(movements);
};
