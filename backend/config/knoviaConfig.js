// backend/config/knoviaConfig.js
// Central, env-overridable configuration for the Knovia study workspace.
// Invalid / non-positive env values fall back to the defaults below.

const posInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const unitFloat = (value, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= -1 && n <= 1 ? n : fallback;
};

const { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } = require("./aiConstants");

const env = process.env;

module.exports = {
  // ── Upload limits ──────────────────────────────────────────────
  MAX_PDF_BYTES: posInt(env.KNOVIA_MAX_PDF_MB, 15) * 1024 * 1024,
  MAX_PDF_PAGES: posInt(env.KNOVIA_MAX_PDF_PAGES, 300),
  MAX_DOCS_PER_USER: posInt(env.KNOVIA_MAX_DOCS_PER_USER, 25),
  MAX_CHUNKS_PER_DOC: posInt(env.KNOVIA_MAX_CHUNKS_PER_DOC, 1500),
  // A document stuck in "processing" longer than this is marked failed.
  PROCESSING_STALE_MS: posInt(env.KNOVIA_PROCESSING_STALE_MIN, 15) * 60 * 1000,

  // ── Chunking (characters, not tokens) ──────────────────────────
  CHUNK_SIZE: posInt(env.KNOVIA_CHUNK_SIZE, 1000),
  CHUNK_OVERLAP: posInt(env.KNOVIA_CHUNK_OVERLAP, 150),
  MIN_CHUNK_CHARS: posInt(env.KNOVIA_MIN_CHUNK_CHARS, 40),

  // ── Retrieval ──────────────────────────────────────────────────
  TOP_K: posInt(env.KNOVIA_TOP_K, 4),
  // Raw cosine similarity cut-off. NOT a probability. Needs tuning on your own
  // documents; see README "Tuning retrieval".
  MIN_SIMILARITY: unitFloat(env.KNOVIA_MIN_SIMILARITY, 0.55),
  // atlas = require Atlas $vectorSearch, local = in-process cosine only,
  // auto = try Atlas, fall back to local on error / zero hits.
  VECTOR_BACKEND: ["atlas", "local", "auto"].includes(env.KNOVIA_VECTOR_BACKEND)
    ? env.KNOVIA_VECTOR_BACKEND
    : "auto",
  VECTOR_INDEX_NAME: env.KNOVIA_VECTOR_INDEX || "knovia_chunks_vector",
  // Upper bound on chunks scanned by the in-process fallback.
  MAX_LOCAL_CANDIDATES: posInt(env.KNOVIA_MAX_LOCAL_CANDIDATES, 5000),
  EMBED_BATCH_SIZE: posInt(env.KNOVIA_EMBED_BATCH_SIZE, 50),

  // ── Generation ─────────────────────────────────────────────────
  QUIZ_MIN_QUESTIONS: 3,
  QUIZ_MAX_QUESTIONS: 20,
  QUIZ_DEFAULT_QUESTIONS: 5,
  QUIZ_CONTEXT_CHUNKS: posInt(env.KNOVIA_QUIZ_CONTEXT_CHUNKS, 14),
  PLAN_CONTEXT_CHUNKS: posInt(env.KNOVIA_PLAN_CONTEXT_CHUNKS, 12),
  GENERATION_TIMEOUT_MS: posInt(env.KNOVIA_GENERATION_TIMEOUT_MS, 60000),
  ANSWER_TIMEOUT_MS: posInt(env.KNOVIA_ANSWER_TIMEOUT_MS, 30000),

  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
};
