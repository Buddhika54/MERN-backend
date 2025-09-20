const InventoryFlow = require("../models/InventoryFlow");

exports.getInventoryFlow = async (req, res) => {
  try {
    const flows = await InventoryFlow.find()
      .populate("item", "name category")
      .populate("warehouse", "name")
      .populate("relatedWarehouseTo", "name")
      .sort({ createdAt: -1 }); // newest first

    res.json(flows);
  } catch (err) {
    console.error("Error fetching inventory flow:", err);
    res.status(500).json({ message: "Server error" });
  }
};
