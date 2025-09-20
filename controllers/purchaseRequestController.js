const PurchaseRequest = require("../models/PurchaseRequest");
const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");
const Notification = require("../models/Notification");

// GET all Purchase Requests
exports.getPRs = async (req, res) => {
  try {
    const prs = await PurchaseRequest.find().populate("item");
    res.json(prs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create a new Purchase Request
exports.createPR = async (req, res) => {
  try {
    const { itemId, quantity } = req.body;
    const pr = new PurchaseRequest({
      item: itemId,
      quantity,
      status: "pending",
    });
    await pr.save();
    res.json({ message: "Purchase Request created", pr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST approve a PR → create PO → notification
exports.approvePR = async (req, res) => {
  try {
    const { prId, supplierId } = req.body;

    const pr = await PurchaseRequest.findById(prId).populate("item");
    if (!pr) return res.status(404).json({ message: "Purchase Request not found" });

    pr.status = "approved";
    await pr.save();

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });

    const po = new PurchaseOrder({
      pr: pr._id,
      supplier: supplier._id,
      quantity: pr.quantity,
      status: "pending",
    });
    await po.save();

    const notif = new Notification({
      message: `Purchase Request for ${pr.item.name} approved. PO created.`,
      type: "PR_approved",
      relatedItem: pr.item._id,
    });
    await notif.save();

    res.json({ message: "PR approved, PO created, notification sent.", pr, po, notification: notif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
