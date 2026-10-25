// backend/models/KnoviaConversation.js
// Per-user Q&A thread over study documents, with the sources that grounded each answer.
const mongoose = require("mongoose");

const SourceSchema = new mongoose.Schema(
  {
    ref: String,
    documentId: { type: mongoose.Schema.Types.ObjectId },
    documentName: String,
    pageNumber: Number,
    excerpt: String,
    similarity: Number, // raw cosine similarity; NOT a probability
    cited: Boolean,
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "model"], required: true },
    content: { type: String, required: true, maxlength: 12000 },
    grounded: { type: Boolean, default: false },
    sources: { type: [SourceSchema], default: [] },
    retrievalMethod: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const KnoviaConversationSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "New conversation", trim: true, maxlength: 120 },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: "StudyDocument" }],
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

KnoviaConversationSchema.index({ owner: 1, updatedAt: -1 });

module.exports = mongoose.model("KnoviaConversation", KnoviaConversationSchema);
