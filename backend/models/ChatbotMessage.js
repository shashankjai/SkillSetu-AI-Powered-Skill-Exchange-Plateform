// backend/models/ChatbotMessage.js
// Stores user-isolated chat interactions and source citation metadata
// with granular message-level TTL for storage hygiene.

const mongoose = require("mongoose");

const CitationSchema = new mongoose.Schema(
  {
    documentTitle: {
      type: String,
      required: true,
      trim: true,
    },
    documentSource: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    similarity: {
      type: Number,
    },
  },
  { _id: false }
);

const ChatbotMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "model"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 4000,
      trim: true,
    },
    // Verified sources supplied to the prompt that grounded this response
    sources: {
      type: [CitationSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // Message-level TTL: auto-expire records after 30 days
      expires: 30 * 24 * 60 * 60,
    },
  },
  {
    timestamps: false, // Using explicit createdAt with TTL
  }
);

// Compound index for fast user-scoped chronological message retrieval
ChatbotMessageSchema.index({ user: 1, createdAt: 1 });

module.exports = mongoose.model("ChatbotMessage", ChatbotMessageSchema);

