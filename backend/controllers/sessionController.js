// src/controllers/sessionController.js
const Session = require("../models/Session");
const Message = require("../models/Message"); // Import Message model
const User = require("../models/User"); // Import User model
const multer = require("multer");
const path = require("path");
const {
  sendNewMeetingScheduledNotification,
  sendNotification,
  createNotification,
  sendNotificationForFeedbackRequest,
  sendNotificationForSessionCancellation,
} = require("./notificationController");
const mongoose = require("mongoose");

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/message-uploads"); // Save files to the 'uploads/message-uploads' folder
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // Get the file extension
    cb(null, `${Date.now()}${ext}`); // Use timestamp to prevent filename collisions
  },
});

// Apply multer middleware to handle file upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max file size is 10MB
}).single("file"); // Handle single file uploads (make sure 'file' matches the input field name)

// Pass io to the controller to enable real-time messaging
let sessionSocket; // Declare io at the top

const setSocketIO = (socketIO) => {
  sessionSocket = socketIO; // Set io from server.js
};

// Create a new session request
const sendSessionRequest = async (req, res) => {
  const { userId2, sessionDate, sessionTime, skill } = req.body;

  if (!userId2 || !sessionDate || !sessionTime || !skill) {
    return res.status(400).json({
      msg: "Please provide all required fields (userId2, sessionDate, sessionTime)",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(userId2) || Number.isNaN(new Date(sessionDate).getTime())) {
    return res.status(400).json({ msg: "Invalid user id or session date." });
  }
  if (String(userId2) === String(req.user.id)) {
    return res.status(400).json({ msg: "You cannot request a session with yourself." });
  }
  if (typeof skill !== "string" || !skill.trim() || skill.length > 100) {
    return res.status(400).json({ msg: "Skill must be 1-100 characters." });
  }

  try {
    if (!(await User.exists({ _id: userId2 }))) {
      return res.status(404).json({ msg: "The other user was not found." });
    }
    const userId1 = req.user.id;

    const newSession = new Session({
      userId1,
      userId2,
      sessionDate,
      sessionTime,
      skill, // Store the skill in the session
      status: "pending",
    });

    await newSession.save();

    res.json({ msg: "Session request sent successfully", session: newSession });
  } catch (err) {
    console.error("Error creating session:", err.message);
    res.status(500).send("Server error");
  }
};

// Accept session request
const acceptSessionRequest = async (req, res) => {
  const { sessionId } = req.body;

  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: "Session request not found" });
    }

    if (session.userId2.toString() !== req.user.id) {
      return res
        .status(400)
        .json({ msg: "You are not authorized to accept this session" });
    }

    session.status = "accepted"; // Change status to accepted
    await session.save();

    try {
      await createNotification(
        session.userId1,
        "Your exchange request was accepted. You can now start a video call at the scheduled session time.",
        "video_call_request",
      );
    } catch (notificationError) {
      console.error(
        "Error sending video call notification:",
        notificationError.message,
      );
    }

    res.json({ msg: "Session request accepted", session });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Get pending session requests for the logged-in user
const getPendingSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await Session.find({
      userId2: userId,
      status: "pending",
    }).populate("userId1"); // Populate requestor details

    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

const getAcceptedSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await Session.find({
      $or: [
        { userId1: userId, status: "accepted" },
        { userId2: userId, status: "accepted" },
        { userId1: userId, status: "completed" },
        { userId2: userId, status: "completed" },
        { userId1: userId, status: "canceled" },
        { userId2: userId, status: "canceled" },
      ],
    })
      .populate("userId1", "name email profilePicture") // Populate userId1 with specific fields
      .populate("userId2", "name email profilePicture"); // Populate userId2 with specific fields

    console.log("Populated sessions:", sessions); // Debugging: Log to verify populated data

    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Get only accepted sessions for the logged-in user
const getOnlyAcceptedSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await Session.find({
      $or: [
        { userId1: userId, status: "accepted" },
        { userId2: userId, status: "accepted" },
      ],
    })
      .populate("userId1")
      .populate("userId2"); // Populate user details

    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Get completed sessions for the logged-in user
const getCompletedSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await Session.find({
      $or: [
        { userId1: userId, status: "completed" },
        { userId2: userId, status: "completed" },
      ],
    })
      .populate("userId1")
      .populate("userId2"); // Populate user details

    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Get canceled sessions for the logged-in user
const getCanceledSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await Session.find({
      $or: [
        { userId1: userId, status: "canceled" },
        { userId2: userId, status: "canceled" },
      ],
    })
      .populate("userId1")
      .populate("userId2"); // Populate user details

    res.json(sessions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Send a new message in a session
const sendMessage = async (req, res) => {
  console.log("Received sessionId:", req.body.sessionId); // Log received sessionId
  console.log("Received content:", req.body.content); // Log received content
  console.log("Received file:", req.file); // Log received file

  const { sessionId, content } = req.body;

  if (!sessionId) {
    return res.status(400).json({ msg: "Session ID is required" });
  }

  // Check if sessionId exists
  const session = await Session.findById(sessionId);
  if (!session) {
    console.error("Session not found:", sessionId);
    return res.status(400).json({ msg: "Session ID unknown" });
  }

  let mediaUrl = null;
  let mediaType = null;

  if (req.file) {
    // If there's a file uploaded, build a production-safe URL for the file
    const hostUrl =
      process.env.BACKEND_URL || `${req.protocol}://${req.get("host")}`;
    mediaUrl = `${hostUrl}/uploads/message-uploads/${req.file.filename}`;
    mediaType = req.file.mimetype.startsWith("image")
      ? "image"
      : req.file.mimetype.startsWith("video")
        ? "video"
        : req.file.mimetype.startsWith("audio")
          ? "audio"
          : null;
  }

  // Determine the other user in the session
  const receiverId =
    session.userId1.toString() === req.user.id
      ? session.userId2
      : session.userId1;

  const sender = await User.findById(req.user.id); // Get sender user details
  const receiver = await User.findById(receiverId); // Get receiver user details

  console.log("sender.name:", sender.name);
  console.log("receiver.name:", receiver.name);

  // Create a new message
  const newMessage = new Message({
    sessionId,
    senderId: req.user.id,
    receiverId: receiverId,
    content,
    mediaUrl, // Store the media URL
    mediaType, // Store the media type (image/video/audio)
  });

  await newMessage.save(); // Save the message in the database

  // Emit message with media details to the frontend, scoped to the specific session room
  sessionSocket.to(sessionId).emit("receive_message", {
    _id: newMessage._id,
    content,
    sender: { name: sender.name, id: sender._id }, // Include sender's name and ID
    receiver: { name: receiver.name, id: receiver._id }, // Include receiver's name and ID
    senderId: { _id: sender._id, name: sender.name },
    receiverId: { _id: receiver._id, name: receiver.name },
    sessionId,
    mediaUrl, // Emit media URL
    mediaType, // Emit media type
    createdAt: newMessage.createdAt,
  });

  res.json({ msg: "Message sent successfully", message: newMessage });
};

// Get all messages for a specific session
const getMessages = async (req, res) => {
  const { sessionId } = req.params; // Get sessionId from the request parameters

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ msg: "Invalid session id." });
  }

  try {
    // Only the two people in the session (or an admin) may read its chat
    const ownSession = await Session.findById(sessionId).select("userId1 userId2");
    if (!ownSession) return res.status(404).json({ msg: "Session not found" });
    const inSession = [ownSession.userId1, ownSession.userId2].some((id) => String(id) === String(req.user.id));
    if (!inSession && req.user.role !== "admin") {
      return res.status(403).json({ msg: "You are not part of this session." });
    }

    // Fetch messages for this session and populate senderId and receiverId
    const messages = await Message.find({ sessionId })
      .populate("senderId", "name") // Populate the sender's name
      .populate("receiverId", "name"); // Populate the receiver's name

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err.message);
    res.status(500).send("Server error");
  }
};

// Schedule a new session
const scheduleSession = async (req, res) => {
  const { sessionId, newMeetingDate, newMeetingTime } = req.body;

  if (!sessionId || !newMeetingDate || !newMeetingTime) {
    return res.status(400).json({
      msg: "SessionId, newMeetingDate, and newMeetingTime are required",
    });
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId) || Number.isNaN(new Date(newMeetingDate).getTime())) {
    return res.status(400).json({ msg: "Invalid session id or meeting date." });
  }

  try {
    // Ensure the sessionId is properly converted to ObjectId
    const session = await Session.findById(
      new mongoose.Types.ObjectId(sessionId),
    ); // Fixed here
    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }
    if (![session.userId1, session.userId2].some((id) => String(id) === String(req.user.id))) {
      return res.status(403).json({ msg: "You are not part of this session." });
    }

    // Update the session with the new scheduled date and time
    session.newMeetingDate = new Date(newMeetingDate); // Update new meeting date
    session.newMeetingTime = newMeetingTime; // Update new meeting time
    await session.save();

    // Extract the skill from the session
    const skill = session.skill;

    // Send the scheduled session notification via WebSockets
    const message = `You have a new meeting scheduled for ${newMeetingDate} at ${newMeetingTime} regarding the skill: ${skill}.`;
    sendNewMeetingScheduledNotification(session, message); // Emit notification for both users

    res.json({ msg: "Session scheduled successfully", session });
  } catch (err) {
    console.error("Error scheduling session:", err.message);
    res.status(500).send("Server error");
  }
};

// sessionController.js

const markSessionAsCompletedOrCanceled = async (req, res) => {
  const { sessionId, status, rating, feedback } = req.body;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ msg: "Invalid session id." });
  }
  if (!["completed", "canceled"].includes(status)) {
    return res.status(400).json({ msg: 'Status must be "completed" or "canceled".' });
  }
  const hasRating = rating !== undefined && rating !== null && rating !== "";
  const ratingNumber = Number(rating);
  if (hasRating && !(Number.isInteger(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5)) {
    return res.status(400).json({ msg: "Rating must be a whole number from 1 to 5." });
  }
  if (feedback !== undefined && feedback !== null && (typeof feedback !== "string" || feedback.length > 500)) {
    return res.status(400).json({ msg: "Feedback must be text up to 500 characters." });
  }
  try {
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }

    if (
      ![session.userId1.toString(), session.userId2.toString()].includes(userId)
    ) {
      return res
        .status(403)
        .json({ msg: "You are not authorized to mark this session" });
    }

    // Build the update object
    const update = {
      status,
    };
    const isUser1 = session.userId1.toString() === userId;

    if (status === "completed") {
      if (isUser1) {
        update.ratingByUser1 = hasRating ? ratingNumber : null;
        update.feedbackByUser1 = feedback || "";
        update.feedbackGivenByUser1 = true;
      } else {
        update.ratingByUser2 = hasRating ? ratingNumber : null;
        update.feedbackByUser2 = feedback || "";
        update.feedbackGivenByUser2 = true;
      }

      // Close the session once BOTH users have given feedback. (The old check read the stale
      // document before this update and never persisted the flag, so sessions never closed.)
      const user1Done = isUser1 || session.feedbackGivenByUser1;
      const user2Done = !isUser1 || session.feedbackGivenByUser2;
      if (user1Done && user2Done) update.sessionClosed = true;

      await Session.findByIdAndUpdate(sessionId, update, { new: true, runValidators: true });

      const otherUserId =
        session.userId1.toString() === userId
          ? session.userId2
          : session.userId1;
      await sendNotificationForFeedbackRequest(otherUserId);

      return res.json({ msg: "Session updated successfully" });
    } else {
      if (isUser1) {
        update.ratingByUser1 = hasRating ? ratingNumber : null;
        update.feedbackByUser1 = feedback || "";
        update.feedbackGivenByUser1 = true;
      } else {
        update.ratingByUser2 = hasRating ? ratingNumber : null;
        update.feedbackByUser2 = feedback || "";
        update.feedbackGivenByUser2 = true;
      }

      update.sessionClosed = true;

      await Session.findByIdAndUpdate(sessionId, update, { new: true, runValidators: true });

      await sendNotificationForSessionCancellation(session.userId1);
      await sendNotificationForSessionCancellation(session.userId2);

      return res.json({ msg: "Session canceled successfully" });
    }
  } catch (error) {
    console.error("Error marking session as completed or canceled:", error);
    return res.status(500).send("Server error");
  }
};

// Calculate the average rating for a given user
const getUserAverageRating = async (req, res) => {
  const { userId } = req.params; // Get the user ID from the URL

  try {
    // Fetch all sessions where this user is either userId1 or userId2
    const sessions = await Session.find({
      $or: [{ userId1: userId }, { userId2: userId }],
    });

    let totalRating = 0;
    let count = 0;

    // Loop through all sessions and sum up the ratings
    sessions.forEach((session) => {
      // If the user is userId1, we look at the ratingByUser2
      // If the user is userId2, we look at the ratingByUser1
      if (
        session.userId1.toString() === userId &&
        session.ratingByUser2 !== null
      ) {
        totalRating += session.ratingByUser2;
        count++;
      } else if (
        session.userId2.toString() === userId &&
        session.ratingByUser1 !== null
      ) {
        totalRating += session.ratingByUser1;
        count++;
      }
    });

    // Calculate the average rating
    const averageRating = count > 0 ? (totalRating / count).toFixed(2) : "N/A";

    res.json({ averageRating });
  } catch (err) {
    console.error("Error fetching user ratings:", err.message);
    res.status(500).send("Server error");
  }
};

module.exports = {
  upload,
  io: sessionSocket,
  sendSessionRequest,
  acceptSessionRequest,
  getPendingSessions,
  getAcceptedSessions,
  getCompletedSessions,
  getCanceledSessions,
  sendMessage,
  getMessages,
  setSocketIO,
  scheduleSession,
  markSessionAsCompletedOrCanceled,
  getUserAverageRating,
  getOnlyAcceptedSessions,
}; // Export setSocketIO to set io
