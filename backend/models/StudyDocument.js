// backend/models/StudyDocument.js
// Metadata for a user's private PDF. The PDF bytes live on disk (see
// middlewares/pdfUpload.js), never inside the database document.
const mongoose = require("mongoose");

const StudyDocumentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true, trim: true, maxlength: 200 },
    // Random server-generated file name inside the owner's private directory.
    storedName: { type: String, required: true, select: false },
    sizeBytes: { type: Number, required: true, min: 1 },
    sha256: { type: String, required: true },
    pageCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    status: { type: String, enum: ["processing", "ready", "failed"], default: "processing", index: true },
    errorCode: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    embeddingModel: { type: String, default: "" },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One copy of the same file per user.
StudyDocumentSchema.index({ owner: 1, sha256: 1 }, { unique: true });
StudyDocumentSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("StudyDocument", StudyDocumentSchema);
