// backend/controllers/roadmapController.js
// Handles AI personalized learning roadmap generation, persistence, retrieval, and deletion.

const Roadmap = require("../models/Roadmap");
const { generateRoadmap } = require("../services/roadmapService");

// ── In-Memory Rate Limiter for Roadmap Generation ─────────────────
const roadmapRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ROADMAP_PER_MINUTE = 6;       // 6 generations per minute per user

const checkRoadmapRateLimit = (userId) => {
  const now = Date.now();
  const record = roadmapRateLimitMap.get(userId) || {
    count: 0,
    resetTime: now + RATE_LIMIT_WINDOW_MS,
  };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    roadmapRateLimitMap.set(userId, record);
    return true;
  }

  if (record.count >= MAX_ROADMAP_PER_MINUTE) {
    return false;
  }

  record.count += 1;
  roadmapRateLimitMap.set(userId, record);
  return true;
};

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [userId, record] of roadmapRateLimitMap.entries()) {
    if (now > record.resetTime) {
      roadmapRateLimitMap.delete(userId);
    }
  }
}, 5 * 60 * 1000).unref();

// ── Controllers ───────────────────────────────────────────────────

/**
 * @route   POST /api/roadmaps/generate
 * @desc    Generate a personalized learning roadmap with Gemini and save to DB
 * @access  Private
 */
const generateAndSaveRoadmap = async (req, res) => {
  try {
    const { targetSkill, currentLevel, studyTime, learningGoal, existingKnowledge } = req.body;

    if (!targetSkill || typeof targetSkill !== "string" || !targetSkill.trim()) {
      return res.status(400).json({ msg: "Target skill is required" });
    }

    if (!studyTime || typeof studyTime !== "string" || !studyTime.trim()) {
      return res.status(400).json({ msg: "Study time is required (e.g. '5 hours/week')" });
    }

    if (!checkRoadmapRateLimit(req.user.id)) {
      return res.status(429).json({
        msg: "Too many roadmap requests. Please wait a minute before generating another.",
      });
    }

    const validLevel = ["beginner", "intermediate", "advanced"].includes(
      currentLevel?.toLowerCase()
    )
      ? currentLevel.toLowerCase()
      : "beginner";

    // Generate roadmap via AI service
    const generated = await generateRoadmap({
      targetSkill: targetSkill.trim(),
      currentLevel: validLevel,
      studyTime: studyTime.trim(),
      learningGoal: learningGoal?.trim() || "",
      existingKnowledge: existingKnowledge?.trim() || "",
    });

    // Persist in MongoDB linked to user
    const roadmap = new Roadmap({
      user: req.user.id,
      targetSkill: targetSkill.trim(),
      currentLevel: validLevel,
      studyTime: studyTime.trim(),
      learningGoal: learningGoal?.trim() || "",
      existingKnowledge: existingKnowledge?.trim() || "",
      title: generated.title,
      summary: generated.summary,
      phases: generated.phases,
      capstoneProject: generated.capstoneProject || {},
      revisionPlan: generated.revisionPlan || [],
      selfAssessmentChecklist: generated.selfAssessmentChecklist || [],
      nextRecommendedStep: generated.nextRecommendedStep || "",
      finalMilestone: generated.finalMilestone,
    });

    await roadmap.save();

    return res.status(201).json(roadmap);
  } catch (err) {
    console.error("[roadmapController] Error generating roadmap:", err.message);
    return res.status(500).json({ msg: "Failed to generate roadmap: " + err.message });
  }
};

/**
 * @route   GET /api/roadmaps
 * @desc    Get all saved roadmaps for the logged-in user
 * @access  Private
 */
const getUserRoadmaps = async (req, res) => {
  try {
    const roadmaps = await Roadmap.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    return res.json(roadmaps);
  } catch (err) {
    console.error("[roadmapController] Error fetching roadmaps:", err.message);
    return res.status(500).json({ msg: "Server error fetching roadmaps" });
  }
};

/**
 * @route   GET /api/roadmaps/:id
 * @desc    Get a single roadmap by ID (enforces ownership)
 * @access  Private
 */
const getRoadmapById = async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({ msg: "Roadmap not found" });
    }

    // Ownership check: users can only access their own roadmaps
    if (roadmap.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Unauthorized: You do not own this roadmap" });
    }

    return res.json(roadmap);
  } catch (err) {
    console.error("[roadmapController] Error fetching roadmap:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Invalid roadmap ID" });
    }
    return res.status(500).json({ msg: "Server error fetching roadmap" });
  }
};

/**
 * @route   DELETE /api/roadmaps/:id
 * @desc    Delete a roadmap by ID (enforces ownership)
 * @access  Private
 */
const deleteRoadmap = async (req, res) => {
  try {
    const roadmap = await Roadmap.findById(req.params.id);

    if (!roadmap) {
      return res.status(404).json({ msg: "Roadmap not found" });
    }

    // Ownership check
    if (roadmap.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Unauthorized: You do not own this roadmap" });
    }

    await Roadmap.findByIdAndDelete(req.params.id);

    return res.json({ msg: "Roadmap deleted successfully" });
  } catch (err) {
    console.error("[roadmapController] Error deleting roadmap:", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Invalid roadmap ID" });
    }
    return res.status(500).json({ msg: "Server error deleting roadmap" });
  }
};

module.exports = {
  generateAndSaveRoadmap,
  getUserRoadmaps,
  getRoadmapById,
  deleteRoadmap,
};

