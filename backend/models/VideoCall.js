const mongoose = require("mongoose");

const videoCallSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    callStatus: {
      type: String,
      enum: ["scheduled", "active", "ended", "missed"],
      default: "scheduled",
    },
    startedAt: Date,
    endedAt: Date,
    duration: Number,
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("VideoCall", videoCallSchema);
