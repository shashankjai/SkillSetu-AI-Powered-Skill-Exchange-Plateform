// backend/models/SkillEmbedding.js
// Caches AI-generated embeddings for skill strings so we don't re-embed
// the same text on every match request.

const mongoose = require("mongoose");
const crypto = require("crypto");

const skillEmbeddingSchema = new mongoose.Schema(
  {
    // The original skill text (lowercased, trimmed)
    skillText: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // SHA-256 hash of skillText — used for fast lookup & change detection
    textHash: {
      type: String,
      required: true,
      index: true,
    },

    // The embedding vector (3072 floats for gemini-embedding-001)
    embedding: {
      type: [Number],
      required: true,
    },

    // Dimensions of the embedding (for validation)
    dimensions: {
      type: Number,
      default: 3072,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Auto-expire embeddings after 30 days to pick up model improvements
skillEmbeddingSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

/**
 * Compute a stable hash for a skill string.
 * @param {string} text
 * @returns {string} hex digest
 */
skillEmbeddingSchema.statics.hashText = function (text) {
  return crypto
    .createHash("sha256")
    .update(text.trim().toLowerCase())
    .digest("hex");
};

module.exports = mongoose.model("SkillEmbedding", skillEmbeddingSchema);

