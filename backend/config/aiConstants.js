// backend/config/aiConstants.js
// Single source of truth for AI configuration. Every value can be overridden through the
// environment so a model rename on Google's side never requires a code change.
//   GEMINI_MODEL            main chat/LLM model
//   GEMINI_FALLBACK_MODEL   used when the main model is unavailable
//   GEMINI_EMBEDDING_MODEL  embedding model (its output size must match EMBEDDING_DIMENSIONS)
//   EMBEDDING_DIMENSIONS    vector size stored in MongoDB (gemini-embedding-001 returns 3072)

const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS) || 3072;
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const LLM_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const LLM_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.8-flash";

module.exports = {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  LLM_MODEL,
  LLM_FALLBACK_MODEL,
};
