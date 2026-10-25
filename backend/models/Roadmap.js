// backend/models/Roadmap.js
const mongoose = require("mongoose");

const PhaseSchema = new mongoose.Schema(
  {
    phaseNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    learningObjectives: {
      type: [String],
      default: [],
    },
    topics: {
      type: [String],
      default: [],
    },
    practicalExercises: {
      type: [String],
      default: [],
    },
    codingQuestions: {
      type: [String],
      default: [],
    },
    suggestedProjects: {
      type: [String],
      default: [],
    },
    checkpointCriteria: {
      type: [String],
      default: [],
    },
    recommendedResources: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const CapstoneProjectSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    deliverables: { type: [String], default: [] },
  },
  { _id: false }
);

const RoadmapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetSkill: {
      type: String,
      required: true,
      trim: true,
    },
    currentLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      default: "beginner",
    },
    studyTime: {
      type: String,
      required: true,
      trim: true,
    },
    learningGoal: {
      type: String,
      default: "",
      trim: true,
    },
    existingKnowledge: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      default: "",
      trim: true,
    },
    phases: {
      type: [PhaseSchema],
      default: [],
      validate: [
        (val) => val.length > 0,
        "Roadmap must contain at least one learning phase",
      ],
    },
    capstoneProject: {
      type: CapstoneProjectSchema,
      default: () => ({}),
    },
    revisionPlan: {
      type: [String],
      default: [],
    },
    selfAssessmentChecklist: {
      type: [String],
      default: [],
    },
    nextRecommendedStep: {
      type: String,
      default: "",
      trim: true,
    },
    finalMilestone: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly fetch user roadmaps sorted by creation date
RoadmapSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Roadmap", RoadmapSchema);

