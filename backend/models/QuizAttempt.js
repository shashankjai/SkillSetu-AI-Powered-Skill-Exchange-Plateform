// backend/models/QuizAttempt.js
// Self-contained record: stores a snapshot of the questions so history and review
// survive deletion of the quiz or its source documents.
const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema(
  {
    questionIndex: Number,
    selectedIndex: { type: Number, default: null },
    correct: Boolean,
    topic: String,
    prompt: String,
    options: [String],
    correctIndex: Number,
    explanation: String,
    sourceDocument: String,
    sourcePage: { type: Number, default: null },
  },
  { _id: false }
);

const QuizAttemptSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    quizTitle: { type: String, required: true },
    score: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1 },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    results: { type: [ResultSchema], default: [] },
  },
  { timestamps: true }
);

QuizAttemptSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("QuizAttempt", QuizAttemptSchema);
