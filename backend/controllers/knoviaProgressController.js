// backend/controllers/knoviaProgressController.js
// Progress is derived at request time from persisted records only.
const QuizAttempt = require("../models/QuizAttempt");
const StudyPlan = require("../models/StudyPlan");
const StudyDocument = require("../models/StudyDocument");
const { computeProgress } = require("../services/knovia/progressLogic");

const getProgress = async (req, res) => {
  const [attempts, plans, documentCount] = await Promise.all([
    QuizAttempt.find({ owner: req.user.id })
      .select("quiz quizTitle percentage score total createdAt results.topic results.correct")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
    StudyPlan.find({ owner: req.user.id }).select("title milestones.tasks.completed milestones.tasks.completedAt").lean(),
    StudyDocument.countDocuments({ owner: req.user.id, status: "ready" }),
  ]);
  res.json({ progress: computeProgress({ attempts, plans, documentCount }) });
};

module.exports = { getProgress };
