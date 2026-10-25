// backend/services/knovia/vectorMath.js
// Pure vector helpers (no DB / network) so they are unit-testable.

/** Raw cosine similarity in [-1, 1]. Returns 0 for invalid / zero vectors. */
const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
};

/** True when `v` is an array of exactly `dims` finite numbers. */
const isValidEmbedding = (v, dims) =>
  Array.isArray(v) && v.length === dims && v.every((n) => typeof n === "number" && Number.isFinite(n));

/**
 * Atlas $vectorSearch returns a normalised score for cosine similarity:
 *   score = (1 + cosine) / 2.   Convert back so every backend reports raw cosine.
 */
const atlasScoreToCosine = (score) => 2 * score - 1;

/** Rank candidates by cosine, drop those under `minSimilarity`, return top `k`. */
const rankByCosine = (queryEmbedding, candidates, { topK, minSimilarity }) =>
  candidates
    .map((c) => ({ ...c, similarity: cosineSimilarity(queryEmbedding, c.embedding) }))
    .filter((c) => c.similarity >= minSimilarity)
    .sort((x, y) => y.similarity - x.similarity)
    .slice(0, topK)
    .map(({ embedding, ...rest }) => rest);

module.exports = { cosineSimilarity, isValidEmbedding, atlasScoreToCosine, rankByCosine };
