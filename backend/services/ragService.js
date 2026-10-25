// backend/services/ragService.js
// Retrieval-Augmented Generation (RAG) service for SkillSetu.
// Performs semantic retrieval over public, verified knowledge chunks.

const KnowledgeChunk = require("../models/KnowledgeChunk");
const aiService = require("./aiService");
const { EMBEDDING_DIMENSIONS } = require("../config/aiConstants");

// Tunable through the environment (no code change needed):
//   RAG_TOP_K, RAG_SIMILARITY_THRESHOLD, RAG_MAX_CANDIDATES, RAG_KEYWORD_WEIGHT
const num = (v, d) => (Number.isFinite(Number(v)) && v !== undefined && v !== "" ? Number(v) : d);
const DEFAULT_TOP_K = num(process.env.RAG_TOP_K, 3);
const DEFAULT_SIMILARITY_THRESHOLD = num(process.env.RAG_SIMILARITY_THRESHOLD, 0.65);
const MAX_CANDIDATE_CHUNKS = num(process.env.RAG_MAX_CANDIDATES, 150);
const KEYWORD_WEIGHT = num(process.env.RAG_KEYWORD_WEIGHT, 0.25); // dense score gets (1 - weight)
const MIN_KEYWORD_SCORE = 0.5; // a chunk can qualify on keywords alone when at least half the query terms match
const QUERY_CACHE_SIZE = 100;

const STOP_WORDS = new Set(
  "a an the and or but if is are was were be been to of in on at for with about from by as it its this that these those how what why when where which who can could should would do does did i me my we you your our they them their there here not no yes into than then so very just also please tell explain".split(
    " "
  )
);

/** Lower-case word tokens without stop words ("c++", "node.js" stay intact). */
const tokenize = (text) =>
  (String(text || "").toLowerCase().match(/[a-z0-9][a-z0-9+#.]*/g) || [])
    .map((t) => t.replace(/\.+$/, ""))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

/**
 * Share of distinct query terms found in a chunk (title and tags count double).
 * @returns {{score:number, hits:number}} score in 0..1
 */
const keywordScore = (queryTokens, chunk) => {
  const terms = [...new Set(queryTokens)];
  if (terms.length === 0) return { score: 0, hits: 0 };
  const body = new Set(tokenize(chunk.content));
  const strong = new Set(tokenize(`${chunk.documentTitle || ""} ${(chunk.tags || []).join(" ")}`));
  let points = 0;
  let hits = 0;
  for (const t of terms) {
    if (strong.has(t)) { points += 1; hits += 1; }
    else if (body.has(t)) { points += 0.7; hits += 1; }
  }
  return { score: Math.min(1, points / terms.length), hits };
};

// Small in-memory LRU so a repeated question does not pay for a second embedding call.
const queryCache = new Map();
const getQueryEmbedding = async (text) => {
  const key = text.toLowerCase();
  if (queryCache.has(key)) {
    const v = queryCache.get(key);
    queryCache.delete(key);
    queryCache.set(key, v);
    return v;
  }
  const emb = await aiService.generateEmbedding(text, { taskType: "RETRIEVAL_QUERY" });
  if (
    !Array.isArray(emb) ||
    emb.length !== EMBEDDING_DIMENSIONS ||
    !emb.every((n) => typeof n === "number" && Number.isFinite(n))
  ) {
    throw new Error(`Generated query embedding is invalid or does not match ${EMBEDDING_DIMENSIONS} dimensions.`);
  }
  queryCache.set(key, emb);
  if (queryCache.size > QUERY_CACHE_SIZE) queryCache.delete(queryCache.keys().next().value);
  return emb;
};

/**
 * Compute cosine similarity between two numeric vectors.
 * Clamped between 0 and 1.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return Math.max(0, Math.min(1, dot / denom));
};

/**
 * Retrieves the most semantically relevant public knowledge chunks for a query.
 * Strictly scopes retrieval to public documents (isPublic: true, owner: null).
 *
 * @param {string} queryText User's input question
 * @param {object} [options]
 * @param {number} [options.topK=3] Number of chunks to retrieve
 * @param {number} [options.threshold=0.65] Minimum similarity threshold
 * @param {string} [options.category] Optional category filter
 * @returns {Promise<Array<object>>} Ranked qualifying chunks with similarity scores
 */
const retrieveRelevantChunks = async (queryText, options = {}) => {
  if (!queryText || typeof queryText !== "string" || !queryText.trim()) {
    return [];
  }

  const topK = typeof options.topK === "number" && options.topK > 0 ? options.topK : DEFAULT_TOP_K;
  const threshold =
    typeof options.threshold === "number" && options.threshold >= 0
      ? options.threshold
      : DEFAULT_SIMILARITY_THRESHOLD;

  const query = queryText.trim();
  const queryTokens = tokenize(query);

  // 1. Dense query embedding. If the embedding API is down we still answer from keywords.
  let queryEmbedding = null;
  try {
    queryEmbedding = await getQueryEmbedding(query);
  } catch (embedErr) {
    if (/invalid or does not match/.test(embedErr.message)) throw embedErr;
    console.warn(`[ragService] Embedding unavailable (${embedErr.message}). Using keyword retrieval only.`);
  }

  // 2. Candidate public chunks (bounded)
  const filter = { isPublic: true, owner: null };
  if (options.category) filter.category = options.category;

  const candidateChunks = await KnowledgeChunk.find(filter)
    .select("documentTitle documentSource category content embedding tags")
    .limit(MAX_CANDIDATE_CHUNKS)
    .lean();

  if (!candidateChunks || candidateChunks.length === 0) return [];

  // 3. Hybrid score = dense cosine + keyword overlap.
  const scoredChunks = [];
  for (const chunk of candidateChunks) {
    const hasVector = Array.isArray(chunk.embedding) && chunk.embedding.length === EMBEDDING_DIMENSIONS;
    const dense = queryEmbedding && hasVector ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0;
    const kw = keywordScore(queryTokens, chunk);

    const denseOk = dense >= threshold;
    const keywordOk = kw.score >= MIN_KEYWORD_SCORE && kw.hits >= Math.min(2, queryTokens.length);
    if (!denseOk && !keywordOk) continue;

    scoredChunks.push({
      documentTitle: chunk.documentTitle,
      documentSource: chunk.documentSource,
      category: chunk.category,
      content: chunk.content,
      similarity: dense,
      keywordScore: kw.score,
      score: dense * (1 - KEYWORD_WEIGHT) + kw.score * KEYWORD_WEIGHT,
    });
  }

  // 4. Rank by hybrid score and take top-K
  scoredChunks.sort((x, y) => y.score - x.score);
  return scoredChunks.slice(0, topK);
};

/**
 * Builds a formatted reference context block for inclusion in the LLM prompt.
 *
 * @param {Array<object>} chunks
 * @returns {string} Formatted context block or empty string
 */
const buildContextBlock = (chunks) => {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return "";
  }

  const formatted = chunks.map((chunk, idx) => {
    return (
      `[Reference Document ${idx + 1}: "${chunk.documentTitle}" (Source: ${chunk.documentSource})]\n` +
      `${chunk.content}`
    );
  });

  return (
    "RELEVANT PLATFORM REFERENCE MATERIAL:\n" +
    "--------------------------------------------------\n" +
    formatted.join("\n\n") +
    "\n--------------------------------------------------"
  );
};

module.exports = {
  cosineSimilarity,
  tokenize,
  keywordScore,
  retrieveRelevantChunks,
  buildContextBlock,
  DEFAULT_TOP_K,
  DEFAULT_SIMILARITY_THRESHOLD,
  MAX_CANDIDATE_CHUNKS,
};
