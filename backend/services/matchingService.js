// backend/services/matchingService.js
// Semantic skill matching service.
//
// COMPATIBILITY SCORE FORMULA
// ────────────────────────────
// For each (currentUser.skillToLearn, candidate.skillToTeach) pair:
//   score = cosineSimilarity(embed(skillToLearn), embed(skillToTeach))
//
// cosineSimilarity(A, B) = (A · B) / (‖A‖ × ‖B‖)
//
// Range: 0.0 … 1.0  (embeddings from gemini-embedding-001 are normalised,
//                      so cosine similarity is non-negative for
//                      semantically coherent skill names)
//
// Threshold: >= 0.70 to be considered a semantic match.
//
// When multiple skill pairs match, the per-user score is the MAXIMUM
// individual pair score (we surface the strongest connection).
//
// NOTE: This score represents cosine embedding similarity, NOT a calibrated
// probability of successful learning.

const SkillEmbedding = require("../models/SkillEmbedding");
const { generateEmbedding, generateEmbeddings } = require("./aiService");

const SIMILARITY_THRESHOLD = 0.70;

// ── Vector math ──────────────────────────────────────────────────

/**
 * Cosine similarity between two same-length numeric arrays.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} similarity in [0, 1] (clamped)
 */
const cosineSimilarity = (a, b) => {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimensionality");
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

  // Clamp to [0, 1] — negative similarity means unrelated
  return Math.max(0, Math.min(1, dot / denom));
};

// ── Embedding cache ──────────────────────────────────────────────

/**
 * Retrieve the cached embedding for a skill or generate + cache a new one.
 * @param {string} skillText raw skill name
 * @returns {Promise<number[]>} embedding vector
 */
const getOrCreateEmbedding = async (skillText) => {
  const normalised = skillText.trim().toLowerCase();
  const hash = SkillEmbedding.hashText(normalised);

  // 1. Check cache
  const cached = await SkillEmbedding.findOne({ textHash: hash });
  if (cached) {
    return cached.embedding;
  }

  // 2. Generate via AI
  const embedding = await generateEmbedding(normalised);

  // 3. Upsert into cache (non-blocking write — failure is non-fatal)
  try {
    await SkillEmbedding.findOneAndUpdate(
      { textHash: hash },
      {
        skillText: normalised,
        textHash: hash,
        embedding,
        dimensions: embedding.length,
      },
      { upsert: true, new: true }
    );
  } catch (cacheErr) {
    // Duplicate key races are harmless
    if (cacheErr.code !== 11000) {
      console.warn("[matchingService] Cache write failed:", cacheErr.message);
    }
  }

  return embedding;
};

/**
 * Retrieve or generate embeddings for multiple skills at once.
 * Hits cache first, then batch-generates only the missing ones.
 * @param {string[]} skills
 * @returns {Promise<Map<string, number[]>>} normalised skill → embedding
 */
const getOrCreateEmbeddings = async (skills) => {
  const result = new Map();
  const toGenerate = [];
  const normMap = new Map(); // normalised → original

  // De-duplicate and normalise
  const uniqueNormals = [
    ...new Set(skills.map((s) => s.trim().toLowerCase())),
  ];

  // 1. Batch lookup from cache
  const hashes = uniqueNormals.map((n) => SkillEmbedding.hashText(n));
  const cached = await SkillEmbedding.find({ textHash: { $in: hashes } });

  const cachedMap = new Map();
  for (const doc of cached) {
    cachedMap.set(doc.textHash, doc.embedding);
  }

  for (const norm of uniqueNormals) {
    const hash = SkillEmbedding.hashText(norm);
    if (cachedMap.has(hash)) {
      result.set(norm, cachedMap.get(hash));
    } else {
      toGenerate.push(norm);
    }
  }

  // 2. Generate missing embeddings
  if (toGenerate.length > 0) {
    try {
      const newEmbeddings = await generateEmbeddings(toGenerate);

      // Save to cache in bulk
      const bulkOps = toGenerate.map((norm, i) => ({
        updateOne: {
          filter: { textHash: SkillEmbedding.hashText(norm) },
          update: {
            $set: {
              skillText: norm,
              textHash: SkillEmbedding.hashText(norm),
              embedding: newEmbeddings[i],
              dimensions: newEmbeddings[i].length,
            },
          },
          upsert: true,
        },
      }));

      try {
        await SkillEmbedding.bulkWrite(bulkOps, { ordered: false });
      } catch (bulkErr) {
        console.warn("[matchingService] Bulk cache write issue:", bulkErr.message);
      }

      for (let i = 0; i < toGenerate.length; i++) {
        result.set(toGenerate[i], newEmbeddings[i]);
      }
    } catch (genErr) {
      console.error("[matchingService] Embedding generation failed:", genErr.message);
      throw genErr;
    }
  }

  return result;
};

// ── Core matching logic ──────────────────────────────────────────

/**
 * Generate an explanation string for a match.
 */
const generateExplanation = (learnSkill, teachSkill, score) => {
  const pct = Math.round(score * 100);

  if (score >= 0.95) {
    return `Excellent match: "${teachSkill}" is essentially the same skill as "${learnSkill}" you want to learn (${pct}% similarity)`;
  }
  if (score >= 0.85) {
    return `Strong match: "${teachSkill}" is very closely related to "${learnSkill}" you want to learn (${pct}% similarity)`;
  }
  if (score >= 0.75) {
    return `Good match: "${teachSkill}" is semantically related to "${learnSkill}" you want to learn (${pct}% similarity)`;
  }
  return `Possible match: "${teachSkill}" may be related to "${learnSkill}" (${pct}% similarity)`;
};

/**
 * Find AI-powered semantic matches for a user.
 *
 * @param {object} currentUser    Mongoose User document
 * @param {object[]} candidates   Array of other User documents (pre-filtered)
 * @returns {Promise<object[]>}   Ranked match results
 */
const findSemanticMatches = async (currentUser, candidates) => {
  const currentUserIdStr = currentUser._id ? currentUser._id.toString() : null;
  const validLearnSkills = (currentUser.skillsToLearn || [])
    .filter((s) => typeof s === "string" && s.trim().length > 0);

  if (validLearnSkills.length === 0) {
    return [];
  }

  // Collect all unique skills that need embeddings
  const allSkills = new Set();
  for (const skill of validLearnSkills) {
    allSkills.add(skill.trim());
  }

  const eligibleCandidates = [];
  for (const candidate of candidates) {
    // Exclude current user explicitly if passed in candidates
    if (
      currentUserIdStr &&
      candidate._id &&
      candidate._id.toString() === currentUserIdStr
    ) {
      continue;
    }

    const validTeach = (candidate.skillsToTeach || []).filter(
      (s) => typeof s === "string" && s.trim().length > 0
    );

    if (validTeach.length > 0) {
      eligibleCandidates.push({ candidate, validTeach });
      for (const skill of validTeach) {
        allSkills.add(skill.trim());
      }
    }
  }

  if (eligibleCandidates.length === 0) {
    return [];
  }

  // Generate/retrieve embeddings for all skills at once
  const embeddings = await getOrCreateEmbeddings([...allSkills]);

  // Compute matches
  const matchResults = [];

  for (const { candidate, validTeach } of eligibleCandidates) {
    // Find the best skill pair between current user's learn goals and candidate's teach skills
    let bestScore = 0;
    let bestLearn = "";
    let bestTeach = "";
    const allPairMatches = [];

    for (const learnSkill of validLearnSkills) {
      const learnNorm = learnSkill.trim().toLowerCase();
      const learnEmb = embeddings.get(learnNorm);
      if (!learnEmb) continue;

      for (const teachSkill of validTeach) {
        const teachNorm = teachSkill.trim().toLowerCase();
        const teachEmb = embeddings.get(teachNorm);
        if (!teachEmb) continue;

        const score = cosineSimilarity(learnEmb, teachEmb);

        if (score >= SIMILARITY_THRESHOLD) {
          allPairMatches.push({
            learnSkill: learnSkill.trim(),
            teachSkill: teachSkill.trim(),
            score,
          });

          if (score > bestScore) {
            bestScore = score;
            bestLearn = learnSkill.trim();
            bestTeach = teachSkill.trim();
          }
        }
      }
    }

    if (bestScore >= SIMILARITY_THRESHOLD) {
      matchResults.push({
        user: candidate,
        teachSkill: bestTeach,
        learnSkill: bestLearn,
        compatibilityScore: parseFloat(bestScore.toFixed(4)),
        score: `${Math.round(bestScore * 100)}%`,
        explanation: generateExplanation(bestLearn, bestTeach, bestScore),
        matchType: "semantic",
        // Include all matching skill pairs for this candidate
        matchedSkills: allPairMatches
          .sort((a, b) => b.score - a.score)
          .map((p) => ({
            teachSkill: p.teachSkill,
            learnSkill: p.learnSkill,
            score: parseFloat(p.score.toFixed(4)),
          })),
      });
    }
  }

  // Sort by compatibility score descending
  matchResults.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return matchResults;
};

// ── Exact matching (existing fallback) ───────────────────────────

/**
 * Original exact-match algorithm preserved as fallback.
 * Same logic as the existing matchController.js but returns
 * the enhanced response format for API consistency.
 *
 * @param {object} currentUser
 * @param {object[]} candidates
 * @returns {object[]}
 */
const findExactMatches = (currentUser, candidates) => {
  const currentUserIdStr = currentUser._id ? currentUser._id.toString() : null;
  const validLearnSkills = (currentUser.skillsToLearn || [])
    .filter((s) => typeof s === "string" && s.trim().length > 0);

  if (validLearnSkills.length === 0) {
    return [];
  }

  const normalizedLearn = validLearnSkills.map((s) =>
    s.trim().toLowerCase()
  );

  const matches = [];

  for (const candidate of candidates) {
    // Exclude current user explicitly if passed in candidates
    if (
      currentUserIdStr &&
      candidate._id &&
      candidate._id.toString() === currentUserIdStr
    ) {
      continue;
    }

    const validTeach = (candidate.skillsToTeach || []).filter(
      (s) => typeof s === "string" && s.trim().length > 0
    );

    if (validTeach.length === 0) {
      continue;
    }

    const normalizedTeach = validTeach.map((s) =>
      s.trim().toLowerCase()
    );

    const pairMatches = [];

    for (let i = 0; i < normalizedLearn.length; i++) {
      const learnNorm = normalizedLearn[i];
      for (let j = 0; j < normalizedTeach.length; j++) {
        const teachNorm = normalizedTeach[j];
        if (learnNorm === teachNorm) {
          pairMatches.push({
            teachSkill: validTeach[j].trim(),
            learnSkill: validLearnSkills[i].trim(),
            score: 1.0,
          });
        }
      }
    }

    if (pairMatches.length > 0) {
      matches.push({
        user: candidate,
        teachSkill: pairMatches[0].teachSkill,
        learnSkill: pairMatches[0].learnSkill,
        compatibilityScore: 1.0,
        score: "100%",
        explanation: `Exact match: "${pairMatches[0].teachSkill}" matches your learning goal`,
        matchType: "exact",
        matchedSkills: pairMatches,
      });
    }
  }

  return matches;
};

module.exports = {
  findSemanticMatches,
  findExactMatches,
  cosineSimilarity,
  getOrCreateEmbedding,
  getOrCreateEmbeddings,
  SIMILARITY_THRESHOLD,
};

