// backend/services/aiService.js
// Core AI service — wraps Google Generative AI SDK for embeddings and LLM calls.
// All secrets stay on the server; the frontend never touches this module.

const { GoogleGenerativeAI } = require("@google/generative-ai");

// ── Configuration ────────────────────────────────────────────────
const {
  EMBEDDING_MODEL,
  LLM_MODEL,
  LLM_FALLBACK_MODEL,
  EMBEDDING_DIMENSIONS,
} = require("../config/aiConstants"); // models are configurable via env (see aiConstants.js)
const DEFAULT_TIMEOUT_MS = 15000;              // 15 s per call

let genAI = null;
let lastAvailableCheck = 0;
let cachedAvailable = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Lazily initialise the Google Generative AI client.
 * Returns null when the API key is missing so callers can fall back gracefully.
 */
const getClient = () => {
  if (genAI) return genAI;

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn(
      "[aiService] GOOGLE_AI_API_KEY is not set — AI features will be disabled."
    );
    return null;
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
};

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Race a promise against a timeout.
 */
const withTimeout = (promise, ms = DEFAULT_TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`AI call timed out after ${ms}ms`)), ms)
    ),
  ]);

// ── Public API ───────────────────────────────────────────────────

/**
 * Generate an embedding vector for a single text string.
 * @param {string} text
 * @returns {Promise<number[]>} 768-dim float array
 * @throws if the client is unavailable or the call fails
 */
const generateEmbedding = async (text, options = {}) => {
  const client = getClient();
  if (!client) {
    throw new Error("AI service unavailable — API key not configured");
  }

  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });

  // taskType improves retrieval quality: RETRIEVAL_QUERY for questions, RETRIEVAL_DOCUMENT for stored text
  const request = options.taskType
    ? { content: { role: "user", parts: [{ text }] }, taskType: options.taskType }
    : text;

  const result = await withTimeout(model.embedContent(request));

  return result.embedding.values;
};

/**
 * Generate embeddings for multiple texts in a single batch.
 * Falls back to sequential calls if the batch API is unavailable.
 * @param {string[]} texts
 * @returns {Promise<number[][]>} array of 768-dim vectors
 */
const generateEmbeddings = async (texts, options = {}) => {
  const client = getClient();
  if (!client) {
    throw new Error("AI service unavailable — API key not configured");
  }

  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });

  // Use batchEmbedContents for efficiency
  try {
    const result = await withTimeout(
      model.batchEmbedContents({
        requests: texts.map((text) => ({
          content: { parts: [{ text }] },
          ...(options.taskType ? { taskType: options.taskType } : {}),
        })),
      }),
      DEFAULT_TIMEOUT_MS * 2 // longer timeout for batch
    );

    return result.embeddings.map((e) => e.values);
  } catch (batchErr) {
    // Fallback: sequential embedding
    console.warn(
      "[aiService] Batch embedding failed, falling back to sequential:",
      batchErr.message
    );
    const results = [];
    for (const text of texts) {
      const r = await withTimeout(
        model.embedContent(
          options.taskType
            ? { content: { role: "user", parts: [{ text }] }, taskType: options.taskType }
            : text
        )
      );
      results.push(r.embedding.values);
    }
    return results;
  }
};

/**
 * Send a prompt to the LLM and return the text response.
 * @param {string} prompt
 * @param {object} [options]
 * @param {number} [options.maxOutputTokens=4096]
 * @param {number} [options.temperature=0.7]
 * @returns {Promise<string>} raw text response
 */
const generateText = async (prompt, options = {}) => {
  const client = getClient();
  if (!client) {
    throw new Error("AI service unavailable — API key not configured");
  }

  const timeoutMs = options.timeout || 15000;
  const config = {
    maxOutputTokens: options.maxOutputTokens || 4096,
    temperature: options.temperature ?? 0.7,
  };

  // Try primary model first, fallback to secondary if unavailable
  const modelsToTry = [LLM_MODEL, LLM_FALLBACK_MODEL];
  let lastErr = null;

  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: config,
      });

      const result = await withTimeout(
        model.generateContent(prompt),
        timeoutMs
      );

      return result.response.text();
    } catch (err) {
      lastErr = err;
      console.warn(
        `[aiService] ${modelName} call failed: ${err.message}. Trying next fallback.`
      );
    }
  }

  throw lastErr || new Error("Failed to generate text from all AI models");
};

/**
 * Streaming variant of generateText: calls onChunk(textPiece) as the model writes, and resolves with the
 * full text. Falls back to the secondary model only if the primary fails BEFORE producing any text
 * (switching mid-answer would repeat or garble what the user already saw).
 * @param {string} prompt
 * @param {object} [options] same as generateText; options.timeout is the max wait for each chunk
 * @param {(piece: string) => void} onChunk
 * @returns {Promise<string>}
 */
const generateTextStream = async (prompt, options = {}, onChunk = () => {}) => {
  const client = getClient();
  if (!client) {
    throw new Error("AI service unavailable — API key not configured");
  }

  const waitMs = options.timeout || 20000;
  const config = {
    maxOutputTokens: options.maxOutputTokens || 4096,
    temperature: options.temperature ?? 0.7,
  };

  let lastErr = null;
  for (const modelName of [LLM_MODEL, LLM_FALLBACK_MODEL]) {
    let full = "";
    try {
      const model = client.getGenerativeModel({ model: modelName, generationConfig: config });
      const result = await withTimeout(model.generateContentStream(prompt), waitMs);
      const iterator = result.stream[Symbol.asyncIterator]();

      while (true) {
        const { value, done } = await withTimeout(iterator.next(), waitMs);
        if (done) break;
        const piece = value.text();
        if (piece) {
          full += piece;
          onChunk(piece);
        }
      }
      return full;
    } catch (err) {
      lastErr = err;
      if (full) throw err; // already streamed part of an answer: do not switch models now
      console.warn(`[aiService] ${modelName} stream failed: ${err.message}. Trying next fallback.`);
    }
  }

  throw lastErr || new Error("Failed to stream text from all AI models");
};

/**
 * Check whether the AI service is operational.
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<boolean>}
 */
const isAvailable = async (forceRefresh = false) => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return false;

  const now = Date.now();
  if (!forceRefresh && cachedAvailable !== null && (now - lastAvailableCheck < CACHE_TTL_MS)) {
    return cachedAvailable;
  }

  try {
    const client = getClient();
    if (!client) {
      cachedAvailable = false;
      lastAvailableCheck = now;
      return false;
    }

    // Lightweight probe — embed a single word
    await generateEmbedding("test");
    cachedAvailable = true;
    lastAvailableCheck = now;
    return true;
  } catch (err) {
    console.warn("[aiService] AI availability check failed:", err.message);
    cachedAvailable = false;
    lastAvailableCheck = now;
    return false;
  }
};

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  generateText,
  generateTextStream,
  isAvailable,
  EMBEDDING_DIMENSIONS,
};

