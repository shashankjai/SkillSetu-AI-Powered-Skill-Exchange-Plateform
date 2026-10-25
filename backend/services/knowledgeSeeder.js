// backend/services/knowledgeSeeder.js
// Seeds the RAG knowledge base (platform guide) with document-type embeddings.
// Safe to call repeatedly: chunks are upserted by contentHash, and a complete base is left untouched.

const KnowledgeChunk = require("../models/KnowledgeChunk");
const aiService = require("./aiService");
const { seedKnowledgeBase, prepareChunks } = require("../data/seedKnowledge");

let running = null;

const embedDocument = (text) => aiService.generateEmbedding(text, { taskType: "RETRIEVAL_DOCUMENT" });

/**
 * @param {{force?: boolean}} [options] force=true re-embeds everything and removes outdated seed chunks
 * @returns {Promise<{skipped?:boolean, reason?:string, total?:number, processed?:number, count?:number}>}
 */
const seedKnowledge = async ({ force = false } = {}) => {
  if (running) return running; // one seeding run at a time
  running = (async () => {
    if (!(await aiService.isAvailable())) {
      return { skipped: true, reason: "AI service unavailable (is GOOGLE_AI_API_KEY set?)" };
    }
    const prepared = prepareChunks();
    if (!force) {
      const count = await KnowledgeChunk.countDocuments({ isPublic: true, owner: null });
      if (count >= prepared.length) return { skipped: true, reason: "already seeded", count };
    }
    const result = await seedKnowledgeBase(embedDocument);
    if (force) {
      await KnowledgeChunk.deleteMany({
        isPublic: true,
        owner: null,
        contentHash: { $nin: prepared.map((c) => c.contentHash) },
      });
    }
    return result;
  })().finally(() => {
    running = null;
  });
  return running;
};

module.exports = { seedKnowledge };
