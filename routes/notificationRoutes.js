const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  testRoute
} = require("../controllers/notificationController");

// GET all notifications
router.get("/", getNotifications);

// POST mark as read
router.post("/mark-read/:id", markAsRead);

// GET test route
router.get("/test", testRoute);

module.exports = router;
