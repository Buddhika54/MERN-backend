const Notification = require("../models/Notification");

// Get all notifications (latest first)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).populate("relatedItem");
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: "Notification not found" });

    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Test route to check API
exports.testRoute = (req, res) => {
  res.send("Notification API is working!");
};
