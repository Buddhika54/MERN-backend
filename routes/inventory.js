const express = require("express");
const router = express.Router();
const Item = require("../models/item");

// Create or update item
router.post("/", async (req, res) => {
  try {
    const { name, quantity, reorderLevel } = req.body;
    let item = await Item.findOne({ name });
    if (item) {
      item.quantity = quantity;
      item.reorderLevel = reorderLevel;
      await item.save();
      return res.json({ message: "Item updated", item });
    }
    item = await Item.create({ name, quantity, reorderLevel });
    res.json({ message: "Item created", item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all items
router.get("/", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
