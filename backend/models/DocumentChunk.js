// backend/models/DocumentChunk.js
// One embedded, page-numbered chunk of a StudyDocument.
// `owner` is denormalised onto every chunk so that vector retrieval can be
// filtered by owner inside the index query itself (never post-filtered).
const mongoose = require("mongoose");
const { EMBEDDING_DIMENSIONS } = require("../config/aiConstants");

const DocumentChunkSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    document: { type: mongoose.Schema.Types.ObjectId, ref: "StudyDocument", required: true },
    pageNumber: { type: Number, required: true, min: 1 },
    chunkIndex: { type: Number, required: true, min: 0 },
    content: { type: String, required: true },
    // Excluded from queries by default: 3072 floats per chunk is heavy and must
    // never be sent to a client. Select with "+embedding" where needed.
    embedding: {
      type: [Number],
      required: true,
      select: false,
      validate: {
        validator: (v) =>
          Array.isArray(v) && v.length === EMBEDDING_DIMENSIONS && v.every((n) => Number.isFinite(n)),
        message: `embedding must contain exactly ${EMBEDDING_DIMENSIONS} finite numbers`,
      },
    },
    embeddingModel: { type: String, default: "" },
  },
  { timestamps: true }
);

DocumentChunkSchema.index({ owner: 1, document: 1, chunkIndex: 1 });

module.exports = mongoose.model("DocumentChunk", DocumentChunkSchema);
