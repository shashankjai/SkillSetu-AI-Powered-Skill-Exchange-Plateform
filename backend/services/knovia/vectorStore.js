// backend/services/knovia/vectorStore.js
// Authorised retrieval over DocumentChunk.
//
//  * "atlas_vector_search": MongoDB Atlas $vectorSearch with the owner AND document
//    filters applied INSIDE the index query (requires the Atlas index described in
//    the README and scripts/createKnoviaVectorIndex.js).
//  * "in_process_cosine": exact cosine over the caller's own chunks, computed in
//    Node. Correct but not a vector index — it is bounded by MAX_LOCAL_CANDIDATES
//    and is what runs on non-Atlas MongoDB (local dev, CI).
//
// Every result reports which method produced it so the UI can say so truthfully.
const mongoose = require("mongoose");
const DocumentChunk = require("../../models/DocumentChunk");
const StudyDocument = require("../../models/StudyDocument");
const AppError = require("../../utils/AppError");
const cfg = require("../../config/knoviaConfig");
const { atlasScoreToCosine, rankByCosine } = require("./vectorMath");

const oid = (id) => new mongoose.Types.ObjectId(String(id));

const attachDocumentNames = async (rows) => {
  const ids = [...new Set(rows.map((r) => String(r.document)))];
  const docs = await StudyDocument.find({ _id: { $in: ids } }).select("originalName").lean();
  const names = new Map(docs.map((d) => [String(d._id), d.originalName]));
  return rows.map((r) => ({
    chunkId: String(r._id),
    documentId: String(r.document),
    documentName: names.get(String(r.document)) || "Unknown document",
    pageNumber: r.pageNumber,
    chunkIndex: r.chunkIndex,
    content: r.content,
    similarity: r.similarity,
  }));
};

const atlasSearch = async ({ queryEmbedding, ownerId, documentIds, topK }) => {
  const numCandidates = Math.min(Math.max(topK * 25, 100), 1000);
  const rows = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: cfg.VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates,
        limit: topK,
        filter: { owner: oid(ownerId), document: { $in: documentIds.map(oid) } },
      },
    },
    {
      $project: {
        document: 1, pageNumber: 1, chunkIndex: 1, content: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);
  return rows.map((r) => ({ ...r, similarity: atlasScoreToCosine(r.score) }));
};

const localSearch = async ({ queryEmbedding, ownerId, documentIds, topK, minSimilarity }) => {
  const candidates = await DocumentChunk.find({ owner: ownerId, document: { $in: documentIds } })
    .select("+embedding document pageNumber chunkIndex content")
    .limit(cfg.MAX_LOCAL_CANDIDATES)
    .lean();
  if (candidates.length >= cfg.MAX_LOCAL_CANDIDATES) {
    console.warn(`[knovia] in-process search truncated at ${cfg.MAX_LOCAL_CANDIDATES} chunks; use Atlas Vector Search for large libraries.`);
  }
  return rankByCosine(queryEmbedding, candidates, { topK, minSimilarity });
};

/**
 * @returns {Promise<{method:string, hits:object[]}>}
 */
const search = async ({ queryEmbedding, ownerId, documentIds, topK = cfg.TOP_K, minSimilarity = cfg.MIN_SIMILARITY }) => {
  if (!documentIds.length) return { method: "none", hits: [] };
  const backend = cfg.VECTOR_BACKEND;

  if (backend !== "local") {
    try {
      const raw = await atlasSearch({ queryEmbedding, ownerId, documentIds, topK });
      // Zero raw hits in auto mode usually means the Atlas index has not synced yet.
      if (raw.length > 0 || backend === "atlas") {
        const filtered = raw.filter((r) => r.similarity >= minSimilarity);
        return { method: "atlas_vector_search", hits: await attachDocumentNames(filtered) };
      }
    } catch (err) {
      if (backend === "atlas") {
        throw new AppError(503, "Vector search is not available (is the Atlas vector index created?).", "VECTOR_UNAVAILABLE");
      }
      console.warn("[knovia] Atlas $vectorSearch unavailable, using in-process cosine:", err.message);
    }
  }

  const ranked = await localSearch({ queryEmbedding, ownerId, documentIds, topK, minSimilarity });
  return { method: "in_process_cosine", hits: await attachDocumentNames(ranked) };
};

module.exports = { search };
