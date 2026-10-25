// backend/controllers/knoviaQuizController.js
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const AppError = require("../utils/AppError");
const cfg = require("../config/knoviaConfig");
const { parseIdList } = require("../utils/validate");
const { generate } = require("../services/knovia/knoviaAi");
const { getReadyOwnedDocuments, loadExcerpts } = require("../services/knovia/documentAccess");
const { buildQuizPrompt, validateQuizPayload, scoreAttempt, toStudentView } = require("../services/knovia/quizLogic");

const DIFFICULTIES = ["easy", "medium", "hard"];

const generateQuiz = async (req, res) => {
  let ids;
  try { ids = parseIdList(req.body.documentIds, { min: 1, max: 5, label: "documentIds" }); }
  catch (e) { throw new AppError(400, e.message, "BAD_DOCUMENT_IDS"); }

  const count = Number.isInteger(req.body.questionCount) ? req.body.questionCount : cfg.QUIZ_DEFAULT_QUESTIONS;
  if (count < cfg.QUIZ_MIN_QUESTIONS || count > cfg.QUIZ_MAX_QUESTIONS) {
    throw new AppError(400, `questionCount must be between ${cfg.QUIZ_MIN_QUESTIONS} and ${cfg.QUIZ_MAX_QUESTIONS}.`);
  }
  const difficulty = DIFFICULTIES.includes(req.body.difficulty) ? req.body.difficulty : "medium";

  const docs = await getReadyOwnedDocuments(req.user.id, ids);
  const excerpts = await loadExcerpts(req.user.id, docs, cfg.QUIZ_CONTEXT_CHUNKS);
  if (excerpts.length === 0) throw new AppError(400, "These documents have no indexed content.", "NO_CONTENT");

  const raw = await generate(buildQuizPrompt({ excerpts, count, difficulty }), {
    maxOutputTokens: Math.min(8192, 700 + count * 450), temperature: 0.4, timeout: cfg.GENERATION_TIMEOUT_MS,
  });

  const refMap = new Map(excerpts.map((e) => [e.ref, e]));
  let validated;
  try { validated = validateQuizPayload(raw, { validRefs: new Set(refMap.keys()) }); }
  catch (_) { throw new AppError(502, "The AI returned a quiz in an unusable format. Please try again.", "AI_BAD_FORMAT"); }

  const minimum = Math.max(cfg.QUIZ_MIN_QUESTIONS, Math.ceil(count * 0.6));
  if (validated.questions.length < minimum) {
    throw new AppError(502, "The AI produced too few valid questions. Please try again.", "AI_TOO_FEW_QUESTIONS");
  }

  const questions = validated.questions.slice(0, count).map(({ source, ...q }) => {
    const ex = source ? refMap.get(source) : null;
    return { ...q, sourceDocument: ex ? ex.documentName : "", sourcePage: ex ? ex.pageNumber : null };
  });

  const quiz = await Quiz.create({
    owner: req.user.id,
    title: `Quiz: ${docs.map((d) => d.originalName.replace(/\.pdf$/i, "")).join(", ").slice(0, 120)}`,
    difficulty,
    documents: docs.map((d) => ({ documentId: d._id, name: d.originalName })),
    questions,
  });

  res.status(201).json({ quiz: toStudentView(quiz.toObject()), droppedQuestions: validated.dropped });
};

const listQuizzes = async (req, res) => {
  const quizzes = await Quiz.find({ owner: req.user.id }).select("title difficulty documents createdAt questions.prompt").sort({ createdAt: -1 }).limit(100).lean();
  const stats = await QuizAttempt.aggregate([
    // Quiz ids were already filtered by owner above; only the owner can attempt a quiz.
    { $match: { quiz: { $in: quizzes.map((q) => q._id) } } },
    { $group: { _id: "$quiz", attempts: { $sum: 1 }, best: { $max: "$percentage" }, last: { $max: "$createdAt" } } },
  ]);
  const byQuiz = new Map(stats.map((s) => [String(s._id), s]));
  res.json({
    quizzes: quizzes.map((q) => ({
      _id: q._id, title: q.title, difficulty: q.difficulty, documents: q.documents, createdAt: q.createdAt,
      questionCount: q.questions.length,
      attempts: (byQuiz.get(String(q._id)) || {}).attempts || 0,
      bestPercentage: (byQuiz.get(String(q._id)) || {}).best ?? null,
    })),
  });
};

// Student view only: never includes correct answers or explanations.
const getQuiz = async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, owner: req.user.id }).lean();
  if (!quiz) throw new AppError(404, "Quiz not found.", "QUIZ_NOT_FOUND");
  res.json({ quiz: toStudentView(quiz) });
};

const deleteQuiz = async (req, res) => {
  const r = await Quiz.deleteOne({ _id: req.params.id, owner: req.user.id });
  if (r.deletedCount === 0) throw new AppError(404, "Quiz not found.", "QUIZ_NOT_FOUND");
  res.json({ msg: "Quiz deleted. Your past attempts are kept in your history." });
};

const submitAttempt = async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, owner: req.user.id }).lean();
  if (!quiz) throw new AppError(404, "Quiz not found.", "QUIZ_NOT_FOUND");

  // The client's score (if any) is ignored; only the chosen options are used.
  let scored;
  try { scored = scoreAttempt(quiz.questions, req.body.answers); }
  catch (e) { throw new AppError(400, e.message, "BAD_ANSWERS"); }

  const results = scored.results.map((r) => {
    const q = quiz.questions[r.questionIndex];
    return {
      ...r,
      prompt: q.prompt, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation,
      sourceDocument: q.sourceDocument, sourcePage: q.sourcePage,
    };
  });

  const attempt = await QuizAttempt.create({
    owner: req.user.id, quiz: quiz._id, quizTitle: quiz.title,
    score: scored.score, total: scored.total, percentage: scored.percentage, results,
  });
  res.status(201).json({ attempt });
};

const listAttempts = async (req, res) => {
  const attempts = await QuizAttempt.find({ owner: req.user.id })
    .select("quiz quizTitle score total percentage createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ attempts });
};

const getAttempt = async (req, res) => {
  const attempt = await QuizAttempt.findOne({ _id: req.params.id, owner: req.user.id }).lean();
  if (!attempt) throw new AppError(404, "Attempt not found.", "ATTEMPT_NOT_FOUND");
  res.json({ attempt });
};

module.exports = { generateQuiz, listQuizzes, getQuiz, deleteQuiz, submitAttempt, listAttempts, getAttempt };
