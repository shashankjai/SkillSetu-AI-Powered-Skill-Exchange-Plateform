// backend/services/knovia/knoviaAi.js
// Thin wrapper over the EXISTING aiService that maps failures to AppErrors.
const aiService = require("../aiService");
const AppError = require("../../utils/AppError");
const cfg = require("../../config/knoviaConfig");
const { isValidEmbedding } = require("./vectorMath");

const mapAiError = (err, what) => {
  const m = (err && err.message) || "";
  if (/API key not configured|unavailable/i.test(m)) {
    return new AppError(503, "AI features are not configured on this server.", "AI_UNAVAILABLE");
  }
  if (/timed out/i.test(m)) {
    return new AppError(504, `The AI service took too long to ${what}. Please try again.`, "AI_TIMEOUT");
  }
  return new AppError(502, `The AI service failed to ${what}. Please try again shortly.`, "AI_ERROR");
};

const embedQuery = async (text) => {
  try {
    const v = await aiService.generateEmbedding(text, { taskType: "RETRIEVAL_QUERY" });
    if (!isValidEmbedding(v, cfg.EMBEDDING_DIMENSIONS)) {
      throw new AppError(502, "The AI service returned an embedding with unexpected dimensions.", "AI_BAD_EMBEDDING");
    }
    return v;
  } catch (err) {
    throw err instanceof AppError ? err : mapAiError(err, "embed your question");
  }
};

/** Embed document chunks in batches; validates every vector. */
const embedDocuments = async (texts) => {
  const out = [];
  for (let i = 0; i < texts.length; i += cfg.EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + cfg.EMBED_BATCH_SIZE);
    let vectors;
    try {
      vectors = await aiService.generateEmbeddings(batch, { taskType: "RETRIEVAL_DOCUMENT" });
    } catch (err) {
      throw mapAiError(err, "embed the document");
    }
    if (!Array.isArray(vectors) || vectors.length !== batch.length || !vectors.every((v) => isValidEmbedding(v, cfg.EMBEDDING_DIMENSIONS))) {
      throw new AppError(502, "The AI service returned invalid embeddings.", "AI_BAD_EMBEDDING");
    }
    out.push(...vectors);
  }
  return out;
};

const generate = async (prompt, { maxOutputTokens = 2048, temperature = 0.3, timeout = cfg.GENERATION_TIMEOUT_MS } = {}) => {
  try {
    const text = await aiService.generateText(prompt, { maxOutputTokens, temperature, timeout });
    if (typeof text !== "string" || !text.trim()) throw new Error("empty");
    return text;
  } catch (err) {
    throw mapAiError(err, "generate a response");
  }
};

module.exports = { embedQuery, embedDocuments, generate, mapAiError };
