// controllers/inventoryFlowController.js
const InventoryFlow = require("../models/InventoryFlow");

// GET all flows
exports.getInventoryFlow = async (req, res) => {
  try {
    const flow = await InventoryFlow.find();
    res.json(flow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
