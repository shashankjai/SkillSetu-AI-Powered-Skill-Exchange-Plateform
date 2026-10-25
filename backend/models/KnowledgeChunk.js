// backend/models/KnowledgeChunk.js
// Stores chunked knowledge documents and corresponding embedding vectors
// for Retrieval-Augmented Generation (RAG) in SkillSetu.

const mongoose = require("mongoose");
const crypto = require("crypto");
const { EMBEDDING_DIMENSIONS } = require("../config/aiConstants");

const KnowledgeChunkSchema = new mongoose.Schema(
  {
    // High-level document metadata
    documentTitle: {
      type: String,
      required: [true, "documentTitle is required"],
      trim: true,
    },
    documentSource: {
      type: String,
      required: [true, "documentSource is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "platform_guide",
        "web_development",
        "dsa",
        "system_design",
        "interview_prep",
      ],
      required: [true, "category is required"],
      index: true,
    },

    // Chunk payload
    chunkIndex: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    content: {
      type: String,
      required: [true, "content is required"],
      trim: true,
    },
    // Deterministic hash combining document identity, index, and content
    contentHash: {
      type: String,
      required: [true, "contentHash is required"],
      unique: true,
      index: true,
    },

    // Configured embedding dimensionality
    dimensions: {
      type: Number,
      required: true,
      default: EMBEDDING_DIMENSIONS,
      validate: {
        validator: function (val) {
          return val === EMBEDDING_DIMENSIONS;
        },
        message: `dimensions must equal configured size (${EMBEDDING_DIMENSIONS})`,
      },
    },

    // Embedding vector
    embedding: {
      type: [Number],
      required: [true, "embedding is required"],
      validate: [
        {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === this.dimensions &&
              val.length === EMBEDDING_DIMENSIONS &&
              val.every((n) => typeof n === "number" && Number.isFinite(n))
            );
          },
          message: function () {
            return `embedding must be an array of exactly ${EMBEDDING_DIMENSIONS} finite numbers matching dimensions (${this.dimensions})`;
          },
        },
      ],
    },

    // Visibility and multi-tenant authorization
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for bounded public/private retrieval queries
KnowledgeChunkSchema.index({ isPublic: 1, category: 1, owner: 1 });

/**
 * Compute stable SHA-256 fingerprint for document chunk identity and deduplication.
 * Includes documentTitle and chunkIndex so identical text across different documents
 * retains distinct document provenance rather than accidentally colliding.
 *
 * @param {string} documentTitle
 * @param {number} chunkIndex
 * @param {string} content
 * @returns {string} hex digest
 */
KnowledgeChunkSchema.statics.hashChunk = function (documentTitle, chunkIndex, content) {
  const normTitle = (documentTitle || "").trim().toLowerCase();
  const normIndex = typeof chunkIndex === "number" ? chunkIndex : 0;
  const normContent = (content || "").trim().toLowerCase();
  return crypto
    .createHash("sha256")
    .update(`${normTitle}::${normIndex}::${normContent}`)
    .digest("hex");
};

// Backward-compatible alias
KnowledgeChunkSchema.statics.hashContent = function (content) {
  return crypto
    .createHash("sha256")
    .update((content || "").trim().toLowerCase())
    .digest("hex");
};

module.exports = mongoose.model("KnowledgeChunk", KnowledgeChunkSchema);
