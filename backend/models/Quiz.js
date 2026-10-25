// backend/models/Quiz.js
const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: [(v) => v.length === 4, "Each question needs exactly 4 options"],
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
    topic: { type: String, default: "General" },
    sourceDocument: { type: String, default: "" },
    sourcePage: { type: Number, default: null },
  },
  { _id: false }
);

const QuizSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    documents: [{ _id: false, documentId: mongoose.Schema.Types.ObjectId, name: String }],
    questions: {
      type: [QuestionSchema],
      validate: [(v) => v.length > 0, "A quiz needs at least one question"],
    },
  },
  { timestamps: true }
);

QuizSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Quiz", QuizSchema);
