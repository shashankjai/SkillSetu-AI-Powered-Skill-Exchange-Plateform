const mongoose = require('mongoose'); // Ensure mongoose is imported
const Report = require('../models/Report');
const Session = require('../models/Session'); // Session model to get the session details
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/report-images'); // Path to store uploaded screenshots
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename using timestamp
  },
});

const upload = multer({ storage: storage });

// Create a report
const createReport = async (req, res) => {
  try {
    // The reporter is always the logged-in user. (It used to be read from the request body, so anyone
    // could file a report in somebody else's name.)
    const reporter = req.user.id;
    const { reason, description, targetUser, session } = req.body;

    if (!mongoose.Types.ObjectId.isValid(targetUser)) {
      return res.status(400).json({ message: 'Invalid target user ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(session)) {
      return res.status(400).json({ message: 'Invalid session ID' });
    }
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 100) {
      return res.status(400).json({ message: 'A reason (up to 100 characters) is required' });
    }
    if (description !== undefined && (typeof description !== 'string' || description.length > 1000)) {
      return res.status(400).json({ message: 'Description must be text up to 1000 characters' });
    }
    if (String(targetUser) === String(reporter)) {
      return res.status(400).json({ message: 'You cannot report yourself' });
    }

    // The session must exist, and the report must be between its two participants
    const existingSession = await Session.findById(session);
    if (!existingSession) {
      return res.status(400).json({ message: 'Session not found' });
    }
    const participants = [existingSession.userId1, existingSession.userId2].map(String);
    if (!participants.includes(String(reporter)) || !participants.includes(String(targetUser))) {
      return res.status(403).json({ message: 'You can only report the other person in your own session' });
    }

    // Create a new report instance
    const report = new Report({
      reporter,
      targetUser,
      session,
      reason: reason.trim(),
      description: description ? description.trim() : description,
    });

    // If a screenshot was uploaded, store its file path
    if (req.file) {
      report.screenshot = `/uploads/report-images/${req.file.filename}`;
    }

    // Save the report to the database
    await report.save();
    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    console.error('Error submitting report:', error.message);
    // do not send the raw error object to the browser
    res.status(500).json({ message: 'Error submitting report' });
  }
};

module.exports = { createReport, upload };
