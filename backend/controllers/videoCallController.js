const VideoCall = require("../models/VideoCall");
const Session = require("../models/Session");
const mongoose = require("mongoose");

const isCallParticipant = (call, userId) =>
  (call.participants || []).some((p) => String(p._id || p) === String(userId));

const getCallDetailsForSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ msg: "Valid sessionId is required." });
    }

    const call = await VideoCall.findOne({ sessionId })
      .populate("participants", "name email profilePicture")
      .populate("initiatedBy", "name email profilePicture");

    if (!call) {
      return res
        .status(404)
        .json({ msg: "No video call record found for this session." });
    }

    if (!isCallParticipant(call, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ msg: "You are not part of this call." });
    }

    return res.json(call);
  } catch (error) {
    console.error("Error fetching call details:", error.message);
    return res
      .status(500)
      .json({ msg: "Server error while fetching call details." });
  }
};

const initiateVideoCall = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ msg: "Valid sessionId is required." });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: "Session not found." });
    }

    const isParticipant = [session.userId1, session.userId2].some(
      (participantId) => participantId.toString() === req.user.id,
    );
    if (!isParticipant) {
      return res.status(403).json({ msg: "You are not part of this session." });
    }

    if (session.status !== "accepted") {
      return res.status(409).json({
        msg: "Video calls are available only after the exchange request is accepted.",
      });
    }

    const participants = [session.userId1, session.userId2];
    const existingCall = await VideoCall.findOne({ sessionId });
    if (existingCall) {
      existingCall.participants = participants;
      existingCall.initiatedBy = req.user.id;
      existingCall.callStatus = "active";
      if (!existingCall.startedAt) existingCall.startedAt = new Date();
      await existingCall.save();
      return res
        .status(200)
        .json({ msg: "Call resumed successfully.", call: existingCall });
    }

    const newCall = new VideoCall({
      sessionId,
      participants,
      callStatus: "active",
      startedAt: new Date(),
      initiatedBy: req.user.id,
    });

    await newCall.save();
    return res
      .status(201)
      .json({ msg: "Call initiated successfully.", call: newCall });
  } catch (error) {
    console.error("Error initiating call:", error.message);
    return res.status(500).json({ msg: "Server error while initiating call." });
  }
};

const endVideoCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { endedAt } = req.body;

    if (!callId || !mongoose.Types.ObjectId.isValid(callId)) {
      return res.status(400).json({ msg: "Valid callId is required." });
    }

    const call = await VideoCall.findById(callId);
    if (!call) {
      return res.status(404).json({ msg: "Call not found." });
    }
    if (!isCallParticipant(call, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ msg: "You are not part of this call." });
    }

    const endTime = endedAt ? new Date(endedAt) : new Date();
    const startedAt = call.startedAt ? new Date(call.startedAt) : endTime;
    const durationSeconds = Math.max(
      0,
      Math.floor((endTime - startedAt) / 1000),
    );

    call.callStatus = "ended";
    call.endedAt = endTime;
    call.duration = durationSeconds;
    await call.save();

    return res.json({ msg: "Call ended successfully.", call });
  } catch (error) {
    console.error("Error ending call:", error.message);
    return res.status(500).json({ msg: "Server error while ending call." });
  }
};

const getUserCallHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ msg: "Valid userId is required." });
    }
    if (String(userId) !== String(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ msg: "You can only view your own call history." });
    }

    const history = await VideoCall.find({ participants: userId })
      .populate(
        "sessionId",
        "skill sessionDate sessionTime newMeetingDate newMeetingTime status",
      )
      .populate("participants", "name profilePicture")
      .sort({ startedAt: -1 });

    return res.json(history);
  } catch (error) {
    console.error("Error fetching call history:", error.message);
    return res
      .status(500)
      .json({ msg: "Server error while fetching call history." });
  }
};

module.exports = {
  getCallDetailsForSession,
  initiateVideoCall,
  endVideoCall,
  getUserCallHistory,
};
