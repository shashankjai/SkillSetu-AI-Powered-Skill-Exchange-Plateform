// src/routes/notificationRoutes.js

const express = require("express");
const {
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");
const { verifyToken } = require("../middlewares/auth");
const router = express.Router();

// Send a new notification
router.post("/send", verifyToken, sendNotification);

// Get all notifications for a user
router.get("/:userId", verifyToken, getNotifications);

// Mark a notification as read
router.patch("/:notificationId/read", verifyToken, markAsRead);

// Mark all notifications as read
router.patch("/:userId/read-all", verifyToken, markAllAsRead);

// NOTE: the meeting/reminder helpers are internal functions (session, message) used by the session
// controller and the reminder cron job. They were wrongly mounted here as Express handlers
// (req, res) and could never work, so the routes were removed.

module.exports = router;
