// backend/models/StudyPlan.js
// Document-grounded, time-boxed study plan with trackable tasks.
// (Distinct from Roadmap, which is a skill-acquisition curriculum.)
const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["read", "practice", "quiz", "review"], default: "read" },
    estimatedMinutes: { type: Number, default: 30 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const MilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    weekNumber: { type: Number, default: 1 },
    tasks: { type: [TaskSchema], default: [] },
  },
  { _id: false }
);

const StudyPlanSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    goal: { type: String, required: true, trim: true, maxlength: 600 },
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    hoursPerWeek: { type: Number, required: true, min: 1, max: 60 },
    weeks: { type: Number, required: true, min: 1, max: 26 },
    summary: { type: String, default: "" },
    documents: [{ _id: false, documentId: mongoose.Schema.Types.ObjectId, name: String }],
    milestones: { type: [MilestoneSchema], default: [] },
  },
  { timestamps: true }
);

StudyPlanSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("StudyPlan", StudyPlanSchema);
