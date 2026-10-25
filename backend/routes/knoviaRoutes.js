// backend/routes/knoviaRoutes.js
// Knovia study workspace API. EVERY route requires a valid JWT; every handler
// scopes its queries by req.user.id.
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const { createUserRateLimiter } = require("../middlewares/rateLimit");
const { uploadSinglePdf } = require("../middlewares/pdfUpload");
const { knoviaErrorHandler } = require("../middlewares/knoviaErrors");
const { isObjectId } = require("../utils/validate");
const AppError = require("../utils/AppError");

const docs = require("../controllers/knoviaDocumentController");
const askCtl = require("../controllers/knoviaAskController");
const quiz = require("../controllers/knoviaQuizController");
const plans = require("../controllers/knoviaPlanController");
const progress = require("../controllers/knoviaProgressController");

const uploadLimiter = createUserRateLimiter({ name: "upload", windowMs: 60_000, max: 10, message: "Too many uploads. Please wait a minute." });
const aiLimiter = createUserRateLimiter({ name: "AI", windowMs: 60_000, max: 12, message: "Too many AI requests. Please wait a minute." });
const generationLimiter = createUserRateLimiter({ name: "generation", windowMs: 60_000, max: 5, message: "Too many generation requests. Please wait a minute." });

// Reject malformed ids before they reach the database.
router.param("id", (req, _res, next, id) => (isObjectId(id) ? next() : next(new AppError(400, "Invalid identifier."))));

router.use(verifyToken);

// Documents
router.get("/documents", docs.listDocuments);
router.post("/documents", uploadLimiter, docs.enforceQuota, uploadSinglePdf, docs.uploadDocument);
router.get("/documents/:id", docs.getDocument);
router.get("/documents/:id/file", docs.downloadDocument);
router.post("/documents/:id/reprocess", uploadLimiter, docs.reprocessDocument);
router.delete("/documents/:id", docs.deleteDocument);

// Ask my PDFs
router.post("/ask", aiLimiter, askCtl.ask);
router.get("/conversations", askCtl.listConversations);
router.get("/conversations/:id", askCtl.getConversation);
router.delete("/conversations/:id", askCtl.deleteConversation);

// Quizzes (static paths first so "attempts" is not captured by :id)
router.get("/quiz-attempts", quiz.listAttempts);
router.get("/quiz-attempts/:id", quiz.getAttempt);
router.post("/quizzes", generationLimiter, quiz.generateQuiz);
router.get("/quizzes", quiz.listQuizzes);
router.get("/quizzes/:id", quiz.getQuiz);
router.post("/quizzes/:id/attempts", quiz.submitAttempt);
router.delete("/quizzes/:id", quiz.deleteQuiz);

// Study plans
router.post("/study-plans", generationLimiter, plans.generatePlan);
router.get("/study-plans", plans.listPlans);
router.get("/study-plans/:id", plans.getPlan);
router.patch("/study-plans/:id/tasks/:taskId", plans.setTaskCompletion);
router.delete("/study-plans/:id", plans.deletePlan);

// Progress
router.get("/progress", progress.getProgress);

router.use(knoviaErrorHandler);

module.exports = router;
