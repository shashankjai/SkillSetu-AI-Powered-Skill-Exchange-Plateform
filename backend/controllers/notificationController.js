// src/controllers/notificationController.js
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const Session = require("../models/Session"); // <-- Add this line
const User = require("../models/User"); // Ensure we have the User model to validate userId

let notificationSocket; // Declare a separate socket for notifications

// Set socket.io instance for notifications
const setSocket = (socketIO) => {
  notificationSocket = socketIO; // Set the notification socket
};

// src/controllers/notificationController.js
const cron = require("node-cron");

cron.schedule("* * * * *", async () => {
  // This runs every minute
  const now = new Date();

  const upcomingSessions = await Session.find({
    $or: [
      {
        newMeetingDate: { $exists: true, $ne: null },
        sessionTime: { $exists: true },
      },
      { sessionTime: { $exists: true } },
    ],
  });

  for (const session of upcomingSessions) {
    const scheduledDate = session.newMeetingDate || session.sessionDate;
    const scheduledTime = session.newMeetingTime || session.sessionTime;

    if (!scheduledDate || !scheduledTime) continue;

    const sessionDateTime = new Date(
      `${scheduledDate.toISOString().split("T")[0]}T${scheduledTime}`,
    );

    if (sessionDateTime > now && sessionDateTime - now <= 60 * 60 * 1000) {
      const message = `Reminder: You have a scheduled session with ${session.userId1?.name || "your partner"} at ${scheduledTime}.`;
      await sendReminderNotification(session._id, message, sessionDateTime);
    }
  }
});

// Internal helper to create and emit a notification (can be called internally)
const createNotification = async (userId, message, type) => {
  if (!userId || !message || !type) {
    throw new Error("Missing required fields: userId, message, or type");
  }

  const validUserId = new mongoose.Types.ObjectId(userId);

  const newNotification = new Notification({
    userId: validUserId,
    message,
    type,
  });

  await newNotification.save();

  if (notificationSocket) {
    notificationSocket.emit("new_notification", {
      _id: newNotification._id,
      userId: validUserId,
      message,
      type,
      isRead: newNotification.isRead,
      createdAt: newNotification.createdAt,
    });
  }

  return newNotification;
};

// Express handler wrapper that uses the internal helper
// Users may only send the notification types the app itself triggers, with a short plain-text message,
// to an existing user, and not in bursts. (Admins skip the rate limit.)
const USER_SENDABLE_TYPES = ["session_request", "video_call_request"];
const sendWindow = new Map(); // userId -> { count, resetAt }
const MAX_SENDS_PER_MINUTE = 20;

const sendNotification = async (req, res) => {
  try {
    const { userId, message, type } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "A valid userId is required." });
    }
    if (typeof message !== "string" || !message.trim() || message.length > 300) {
      return res.status(400).json({ msg: "Message must be 1-300 characters." });
    }
    if (req.user.role !== "admin") {
      if (!USER_SENDABLE_TYPES.includes(type)) {
        return res.status(403).json({ msg: "You cannot send this type of notification." });
      }
      const now = Date.now();
      const rec = sendWindow.get(req.user.id);
      if (!rec || rec.resetAt < now) sendWindow.set(req.user.id, { count: 1, resetAt: now + 60000 });
      else if (++rec.count > MAX_SENDS_PER_MINUTE) {
        return res.status(429).json({ msg: "Too many notifications. Please slow down." });
      }
    }
    if (!(await User.exists({ _id: userId }))) {
      return res.status(404).json({ msg: "Recipient not found." });
    }

    const notification = await createNotification(userId, message, type);
    res.json({ msg: "Notification created successfully", notification });
  } catch (err) {
    console.error("Error creating notification:", err.message);
    res.status(500).send("Server error");
  }
};

// Get all notifications for a specific user
const getNotifications = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  if (userId !== currentUserId && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ msg: "You can only view your own notifications." });
  }

  try {
    const notifications = await Notification.find({ userId }).sort({
      createdAt: -1,
    }); // Latest notifications first
    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err.message);
    res.status(500).send("Server error");
  }
};

// Mark a specific notification as read
const markAsRead = async (req, res) => {
  const { notificationId } = req.params;

  try {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ msg: "Notification not found." });
    }

    if (
      notification.userId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ msg: "You can only update your own notifications." });
    }

    const updatedNotification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true },
    );
    res.json(updatedNotification);
  } catch (err) {
    console.error("Error marking notification as read:", err.message);
    res.status(500).send("Server error");
  }
};

// Mark all notifications for a user as read
const markAllAsRead = async (req, res) => {
  const { userId } = req.params;

  if (userId !== req.user.id && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ msg: "You can only update your own notifications." });
  }

  try {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    res.json({ msg: "All notifications marked as read" });
  } catch (err) {
    console.error("Error marking all notifications as read:", err.message);
    res.status(500).send("Server error");
  }
};

// Function to send notification for a new scheduled session
const sendNewMeetingScheduledNotification = async (session, message) => {
  try {
    // Retrieve session and populate the user data
    if (!session) {
      console.log("Session not found!");
      return;
    }

    console.log("Retrieved session:", session); // Log the session to check its contents

    // Ensure both userId1 and userId2 are properly converted to ObjectIds
    const userId1 = new mongoose.Types.ObjectId(session.userId1._id); // Use new to properly create ObjectId
    const userId2 = new mongoose.Types.ObjectId(session.userId2._id); // Use new to properly create ObjectId

    await createNotification(userId1, message, "new_meeting_scheduled");
    await createNotification(userId2, message, "new_meeting_scheduled");

    console.log(`Notifications saved for users ${userId1} and ${userId2}`);
  } catch (err) {
    console.error(
      "Error sending new meeting scheduled notification:",
      err.message,
    );
  }
};

// Send reminder notification (e.g., 1 hour before the session)
const sendReminderNotification = async (sessionId, message, reminderTime) => {
  try {
    const session =
      await Session.findById(sessionId).populate("userId1 userId2");
    if (!session) {
      console.log("Session not found for reminder:", sessionId);
      return;
    }

    const sender = session.userId1;
    const receiver = session.userId2;

    // The cron job runs every minute. Keep one reminder per user/session message.
    const reminderExists = async (userId) =>
      Notification.exists({ userId, type: "reminder", message });

    if (!(await reminderExists(sender._id))) {
      await createNotification(sender._id, message, "reminder");
    }
    if (!(await reminderExists(receiver._id))) {
      await createNotification(receiver._id, message, "reminder");
    }
  } catch (err) {
    console.error("Error sending reminder notification:", err.message);
  }
};

// New notification function for feedback request
const sendNotificationForFeedbackRequest = async (userId) => {
  try {
    const message =
      "Please provide feedback for the completed/canceled session";
    await createNotification(userId, message, "feedback_request");
    console.log(`Feedback request sent to user ${userId}`);
  } catch (err) {
    console.error("Error sending feedback notification:", err.message);
  }
};

// New notification function for session cancellation
const sendNotificationForSessionCancellation = async (userId) => {
  try {
    const message = "Your session has been canceled";
    await createNotification(userId, message, "session_canceled");
    console.log(`Session cancellation notification sent to user ${userId}`);
  } catch (err) {
    console.error("Error sending session canceled notification:", err.message);
  }
};

module.exports = {
  createNotification,
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  setSocket,
  sendReminderNotification,
  sendNewMeetingScheduledNotification,
  sendNotificationForFeedbackRequest,
  sendNotificationForSessionCancellation,
}; // Export setSocket
