// backend/controllers/knoviaPlanController.js
const StudyPlan = require("../models/StudyPlan");
const AppError = require("../utils/AppError");
const cfg = require("../config/knoviaConfig");
const { parseIdList } = require("../utils/validate");
const { generate } = require("../services/knovia/knoviaAi");
const { getReadyOwnedDocuments, loadExcerpts } = require("../services/knovia/documentAccess");
const { buildPlanPrompt, validatePlanPayload, summarizePlan } = require("../services/knovia/planLogic");

const LEVELS = ["beginner", "intermediate", "advanced"];
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const generatePlan = async (req, res) => {
  const subject = text(req.body.subject, 120);
  const goal = text(req.body.goal, 600);
  const hoursPerWeek = Number(req.body.hoursPerWeek);
  const weeks = Number(req.body.weeks);
  const level = LEVELS.includes(req.body.level) ? req.body.level : "beginner";

  if (!subject) throw new AppError(400, "Subject is required.", "BAD_PLAN_INPUT");
  if (!goal) throw new AppError(400, "A learning goal is required.", "BAD_PLAN_INPUT");
  if (!Number.isInteger(hoursPerWeek) || hoursPerWeek < 1 || hoursPerWeek > 60) throw new AppError(400, "hoursPerWeek must be a whole number from 1 to 60.", "BAD_PLAN_INPUT");
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 26) throw new AppError(400, "weeks must be a whole number from 1 to 26.", "BAD_PLAN_INPUT");

  let ids;
  try { ids = parseIdList(req.body.documentIds, { max: 5, label: "documentIds" }); }
  catch (e) { throw new AppError(400, e.message, "BAD_DOCUMENT_IDS"); }

  let docs = [];
  let excerpts = [];
  if (ids.length) {
    docs = await getReadyOwnedDocuments(req.user.id, ids);
    excerpts = await loadExcerpts(req.user.id, docs, cfg.PLAN_CONTEXT_CHUNKS);
  }

  const raw = await generate(buildPlanPrompt({ subject, goal, hoursPerWeek, weeks, level, excerpts }), {
    maxOutputTokens: 4096, temperature: 0.4, timeout: cfg.GENERATION_TIMEOUT_MS,
  });

  let plan;
  try { plan = validatePlanPayload(raw, { weeks }); }
  catch (_) { throw new AppError(502, "The AI returned a plan in an unusable format. Please try again.", "AI_BAD_FORMAT"); }

  const saved = await StudyPlan.create({
    owner: req.user.id,
    title: plan.title || `Study plan: ${subject}`.slice(0, 160),
    subject, goal, level, hoursPerWeek, weeks,
    summary: plan.summary,
    documents: docs.map((d) => ({ documentId: d._id, name: d.originalName })),
    milestones: plan.milestones,
  });
  const obj = saved.toObject();
  res.status(201).json({ plan: obj, summary: summarizePlan(obj) });
};

const listPlans = async (req, res) => {
  const plans = await StudyPlan.find({ owner: req.user.id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ plans: plans.map((p) => ({ ...p, progress: summarizePlan(p) })) });
};

const getPlan = async (req, res) => {
  const plan = await StudyPlan.findOne({ _id: req.params.id, owner: req.user.id }).lean();
  if (!plan) throw new AppError(404, "Study plan not found.", "PLAN_NOT_FOUND");
  res.json({ plan, progress: summarizePlan(plan) });
};

const setTaskCompletion = async (req, res) => {
  if (typeof req.body.completed !== "boolean") throw new AppError(400, "completed must be true or false.");
  const plan = await StudyPlan.findOne({ _id: req.params.id, owner: req.user.id });
  if (!plan) throw new AppError(404, "Study plan not found.", "PLAN_NOT_FOUND");

  let task = null;
  for (const m of plan.milestones) {
    task = m.tasks.find((t) => t._id === req.params.taskId);
    if (task) break;
  }
  if (!task) throw new AppError(404, "Task not found.", "TASK_NOT_FOUND");

  task.completed = req.body.completed;
  task.completedAt = req.body.completed ? new Date() : null;
  await plan.save();
  const obj = plan.toObject();
  res.json({ plan: obj, progress: summarizePlan(obj) });
};

const deletePlan = async (req, res) => {
  const r = await StudyPlan.deleteOne({ _id: req.params.id, owner: req.user.id });
  if (r.deletedCount === 0) throw new AppError(404, "Study plan not found.", "PLAN_NOT_FOUND");
  res.json({ msg: "Study plan deleted." });
};

module.exports = { generatePlan, listPlans, getPlan, setTaskCompletion, deletePlan };
