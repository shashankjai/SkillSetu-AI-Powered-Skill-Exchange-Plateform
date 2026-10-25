// controllers/matchController.js
//
// Enhanced skill matching controller.
// Uses AI-powered semantic matching when available, falls back to
// the original exact-match algorithm when the AI service is
// unavailable or unconfigured.

const User = require("../models/User");
const {
  findSemanticMatches,
  findExactMatches,
} = require("../services/matchingService");
const { isAvailable } = require("../services/aiService");

// ── Original exact-match logic (preserved for reference & fallback) ──

const matchSkills = (skillsToTeach, skillsToLearn) => {
  const matches = [];

  if (!skillsToTeach || !skillsToLearn) return matches;

  const normalizedTeachSkills = skillsToTeach.map((skill) =>
    skill.trim().toLowerCase()
  );
  const normalizedLearnSkills = skillsToLearn.map((skill) =>
    skill.trim().toLowerCase()
  );

  normalizedLearnSkills.forEach((learnSkill) => {
    normalizedTeachSkills.forEach((teachSkill) => {
      if (teachSkill === learnSkill) {
        matches.push({ teachSkill, learnSkill });
      }
    });
  });

  return matches;
};

// ── Rate Limiting (lightweight per-user protection) ───────────────
const MAX_CANDIDATES = Number(process.env.MATCH_MAX_CANDIDATES) || 500;
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;     // 30 requests / min

const checkRateLimit = (userId) => {
  const now = Date.now();
  const userRecord = rateLimitMap.get(userId) || {
    count: 0,
    resetTime: now + RATE_LIMIT_WINDOW_MS,
  };

  if (now > userRecord.resetTime) {
    userRecord.count = 1;
    userRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(userId, userRecord);
    return true;
  }

  if (userRecord.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userRecord.count += 1;
  rateLimitMap.set(userId, userRecord);
  return true;
};

// Periodic cache cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(userId);
    }
  }
}, 5 * 60 * 1000).unref();

// ── Main handler ─────────────────────────────────────────────────

const getSkillMatches = async (req, res) => {
  try {
    if (!checkRateLimit(req.user.id)) {
      return res.status(429).json({
        msg: "Too many matching requests. Please wait a moment before trying again.",
      });
    }

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ msg: "Current user not found" });
    }

    // Get all non-admin users (excluding self) who have at least one teachable skill
    const candidates = await User.find({
      _id: { $ne: req.user.id },
      role: { $ne: "admin" },
      status: { $ne: "blocked" }, // blocked accounts must not show up as matches
      "skillsToTeach.0": { $exists: true },
    })
      .select("-password -__v")
      .sort({ updatedAt: -1 })
      .limit(MAX_CANDIDATES); // bounds the work (and the number of embeddings) per request

    // ── Try AI-powered semantic matching first ───────────────────
    let useAI = false;
    try {
      useAI = await isAvailable();
    } catch {
      useAI = false;
    }

    if (useAI) {
      try {
        const semanticMatches = await findSemanticMatches(
          currentUser,
          candidates
        );

        // Strip password from user objects (candidates already stripped)
        const safeResults = semanticMatches.map((m) => {
          const userObj =
            typeof m.user.toObject === "function"
              ? m.user.toObject()
              : { ...m.user };
          delete userObj.password;
          return { ...m, user: userObj };
        });

        return res.json(safeResults);
      } catch (aiErr) {
        console.error(
          "[matchController] AI matching failed, falling back to exact match:",
          aiErr.message
        );
        // Fall through to exact matching
      }
    }

    // ── Fallback: exact matching (original algorithm, enhanced format) ──
    const exactMatches = findExactMatches(currentUser, candidates);

    // Strip password from user objects
    const safeResults = exactMatches.map((m) => {
      const userObj =
        typeof m.user.toObject === "function"
          ? m.user.toObject()
          : { ...m.user };
      delete userObj.password;
      return { ...m, user: userObj };
    });

    return res.json(safeResults);
  } catch (err) {
    console.error("Error fetching matches:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = { getSkillMatches, matchSkills };