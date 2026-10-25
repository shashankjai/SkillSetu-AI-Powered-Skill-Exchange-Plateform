// backend/controllers/knoviaAskController.js
const KnoviaConversation = require("../models/KnoviaConversation");
const AppError = require("../utils/AppError");
const cfg = require("../config/knoviaConfig");
const { parseIdList, isObjectId } = require("../utils/validate");
const { embedQuery, generate } = require("../services/knovia/knoviaAi");
const vectorStore = require("../services/knovia/vectorStore");
const { getReadyOwnedDocuments } = require("../services/knovia/documentAccess");
const { buildAnswerPrompt, processAnswer, labelChunks, excerptOf, NO_EVIDENCE_MESSAGE } = require("../services/knovia/ragLogic");

const MAX_MESSAGES_PER_CONVERSATION = 200;
const HISTORY_TURNS = 6;

const ask = async (req, res) => {
  const question = typeof req.body.question === "string" ? req.body.question.trim() : "";
  if (!question) throw new AppError(400, "Question is required.", "BAD_QUESTION");
  if (question.length > 1000) throw new AppError(400, "Question is too long (max 1000 characters).", "BAD_QUESTION");

  let ids;
  try { ids = parseIdList(req.body.documentIds, { max: 25, label: "documentIds" }); }
  catch (e) { throw new AppError(400, e.message, "BAD_DOCUMENT_IDS"); }

  const docs = await getReadyOwnedDocuments(req.user.id, ids);          // ownership + readiness
  const documentIds = docs.map((d) => d._id);

  let conversation = null;
  if (req.body.conversationId) {
    if (!isObjectId(String(req.body.conversationId))) throw new AppError(400, "Invalid conversationId.");
    conversation = await KnoviaConversation.findOne({ _id: req.body.conversationId, owner: req.user.id });
    if (!conversation) throw new AppError(404, "Conversation not found.", "CONVERSATION_NOT_FOUND");
    if (conversation.messages.length >= MAX_MESSAGES_PER_CONVERSATION) {
      throw new AppError(409, "This conversation is full. Start a new one.", "CONVERSATION_FULL");
    }
  }

  // 1) retrieve (owner + document filters are applied inside the vector query)
  const queryEmbedding = await embedQuery(question);
  const { method, hits } = await vectorStore.search({
    queryEmbedding, ownerId: req.user.id, documentIds, topK: cfg.TOP_K, minSimilarity: cfg.MIN_SIMILARITY,
  });

  // 2) answer ONLY if evidence was retrieved
  let grounded = false;
  let answer = NO_EVIDENCE_MESSAGE;
  let sources = [];

  if (hits.length > 0) {
    const labeled = labelChunks(hits);
    const history = conversation
      ? conversation.messages.slice(-HISTORY_TURNS).map((m) => ({ role: m.role, content: m.content.slice(0, 600) }))
      : [];
    const raw = await generate(buildAnswerPrompt({ question, labeled, history }), {
      maxOutputTokens: 1500, temperature: 0.2, timeout: cfg.ANSWER_TIMEOUT_MS,
    });
    const processed = processAnswer(raw, labeled);
    grounded = processed.grounded;
    if (grounded) answer = processed.answer;
    // Sources always reflect what was actually retrieved; `cited` shows what the answer relied on.
    sources = labeled.map((c) => ({
      ref: c.ref,
      documentId: c.documentId,
      documentName: c.documentName,
      pageNumber: c.pageNumber,
      excerpt: excerptOf(c.content),
      similarity: Math.round(c.similarity * 1000) / 1000,
      cited: processed.citedRefs.includes(c.ref),
    }));
    if (!grounded) sources = sources.map((s) => ({ ...s, cited: false }));
  }

  // 3) persist
  if (!conversation) {
    conversation = new KnoviaConversation({
      owner: req.user.id,
      title: question.slice(0, 80),
      documents: documentIds,
      messages: [],
    });
  }
  conversation.messages.push({ role: "user", content: question });
  conversation.messages.push({ role: "model", content: answer, grounded, sources, retrievalMethod: method });
  await conversation.save();
  const saved = conversation.messages[conversation.messages.length - 1];

  res.json({
    conversationId: conversation._id,
    message: {
      _id: saved._id,
      role: "model",
      content: answer,
      grounded,
      sources,
      retrieval: { method, topK: cfg.TOP_K, minSimilarity: cfg.MIN_SIMILARITY, passages: hits.length },
    },
  });
};

const listConversations = async (req, res) => {
  const conversations = await KnoviaConversation.find({ owner: req.user.id })
    .select("title documents updatedAt")
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();
  res.json({ conversations });
};

const getConversation = async (req, res) => {
  const conversation = await KnoviaConversation.findOne({ _id: req.params.id, owner: req.user.id }).lean();
  if (!conversation) throw new AppError(404, "Conversation not found.", "CONVERSATION_NOT_FOUND");
  res.json({ conversation });
};

const deleteConversation = async (req, res) => {
  const r = await KnoviaConversation.deleteOne({ _id: req.params.id, owner: req.user.id });
  if (r.deletedCount === 0) throw new AppError(404, "Conversation not found.", "CONVERSATION_NOT_FOUND");
  res.json({ msg: "Conversation deleted." });
};

module.exports = { ask, listConversations, getConversation, deleteConversation };
