const PurchaseOrder = require("../models/PurchaseOrder");
const Notification = require("../models/Notification");

exports.getPOs = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find().populate("pr supplier");
    res.json(pos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { poId, status } = req.body;
    const po = await PurchaseOrder.findByIdAndUpdate(poId, { status }, { new: true });

    if (status === "delivered") {
      const notif = new Notification({
        message: `Purchase Order for ${po.pr} has been delivered.`,
        type: "PO_delivered",
        relatedItem: po.pr
      });
      await notif.save();
    }

    res.json(po);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
