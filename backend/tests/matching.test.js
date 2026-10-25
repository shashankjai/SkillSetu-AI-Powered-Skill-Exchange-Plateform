// backend/tests/matching.test.js
require("dotenv").config();

// Mock aiService before requiring matchingService so destructured imports are mocked
jest.mock("../services/aiService", () => {
  const embeddingsMap = {
    "react": [1.0, 0.0, 0.0],
    "react.js": [0.95, 0.31, 0.0],     // cosine ~ 0.95
    "javascript": [0.75, 0.66, 0.0],   // cosine ~ 0.75
    "gardening": [0.0, 1.0, 0.0],      // cosine ~ 0.0
  };

  return {
    generateEmbedding: jest.fn(async (text) => {
      return embeddingsMap[text.toLowerCase()] || [0, 0, 1];
    }),
    generateEmbeddings: jest.fn(async (texts) => {
      return texts.map((t) => embeddingsMap[t.toLowerCase()] || [0, 0, 1]);
    }),
    generateText: jest.fn(async () => "Mocked LLM Response"),
    isAvailable: jest.fn(async () => true),
    EMBEDDING_DIMENSIONS: 3072,
  };
});

const {
  cosineSimilarity,
  findExactMatches,
  findSemanticMatches,
  SIMILARITY_THRESHOLD,
} = require("../services/matchingService");
const SkillEmbedding = require("../models/SkillEmbedding");

describe("AI Smart Skill Matching - Phase 2 Unit Tests", () => {
  describe("1. Vector Math - cosineSimilarity", () => {
    it("should return 1.0 for identical vectors", () => {
      const v = [0.5, 0.5, 0.5, 0.5];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 4);
    });

    it("should return 0.0 for orthogonal vectors", () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it("should throw an error if vectors have different dimensions", () => {
      const a = [1, 2];
      const b = [1, 2, 3];
      expect(() => cosineSimilarity(a, b)).toThrow(
        "Vectors must have the same dimensionality"
      );
    });

    it("should return 0 for zero vectors without division by zero errors", () => {
      const a = [0, 0, 0];
      const b = [1, 1, 1];
      expect(cosineSimilarity(a, b)).toBe(0);
    });
  });

  describe("2. SkillEmbedding Model - Stable Hashing", () => {
    it("should generate consistent SHA-256 hashes", () => {
      const hash1 = SkillEmbedding.hashText("React.js");
      const hash2 = SkillEmbedding.hashText("react.js");
      const hash3 = SkillEmbedding.hashText("  React.js  ");
      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3);
      expect(hash1).toHaveLength(64);
    });
  });

  describe("3. Exact Matching Fallback (findExactMatches)", () => {
    const currentUser = {
      _id: "user123",
      name: "Alice",
      skillsToLearn: ["React", "Python"],
      skillsToTeach: ["Node.js"],
    };

    it("should find exact matches and calculate 100% score", () => {
      const candidates = [
        {
          _id: "cand1",
          name: "Bob",
          skillsToTeach: ["react"], // case-insensitive check
          skillsToLearn: ["Go"],
        },
        {
          _id: "cand2",
          name: "Charlie",
          skillsToTeach: ["C++"],
          skillsToLearn: ["Java"],
        },
      ];

      const matches = findExactMatches(currentUser, candidates);
      expect(matches).toHaveLength(1);
      expect(matches[0].user._id).toBe("cand1");
      expect(matches[0].teachSkill).toBe("react");
      expect(matches[0].compatibilityScore).toBe(1.0);
      expect(matches[0].score).toBe("100%");
      expect(matches[0].matchType).toBe("exact");
    });

    it("should exclude current user even if present in candidates", () => {
      const candidates = [
        {
          _id: "user123", // same ID as currentUser
          name: "Alice Clone",
          skillsToTeach: ["React"],
          skillsToLearn: [],
        },
        {
          _id: "cand1",
          name: "Bob",
          skillsToTeach: ["React"],
          skillsToLearn: [],
        },
      ];

      const matches = findExactMatches(currentUser, candidates);
      expect(matches).toHaveLength(1);
      expect(matches[0].user._id).toBe("cand1");
    });

    it("should handle empty or whitespace-only skills safely", () => {
      const emptyUser = {
        _id: "userEmpty",
        skillsToLearn: ["", "   "],
      };
      const candidates = [
        {
          _id: "cand1",
          skillsToTeach: ["React"],
        },
      ];

      const matches = findExactMatches(emptyUser, candidates);
      expect(matches).toEqual([]);
    });
  });

  describe("4. Semantic Matching Business Logic", () => {
    beforeEach(() => {
      jest.spyOn(SkillEmbedding, "find").mockResolvedValue([]);
      jest.spyOn(SkillEmbedding, "bulkWrite").mockResolvedValue({});
    });

    afterEach(() => {
      SkillEmbedding.find.mockRestore();
      SkillEmbedding.bulkWrite.mockRestore();
    });

    it("should rank candidates descending by compatibility score and exclude low similarity", async () => {
      const currentUser = {
        _id: "u1",
        name: "Learner",
        skillsToLearn: ["React"],
        skillsToTeach: [],
      };

      const candidates = [
        {
          _id: "c_garden",
          name: "Gardener",
          skillsToTeach: ["gardening"], // cos ~ 0.0 -> filtered out
        },
        {
          _id: "c_js",
          name: "JS Dev",
          skillsToTeach: ["javascript"], // cos ~ 0.75 -> matches
        },
        {
          _id: "c_reactjs",
          name: "React Pro",
          skillsToTeach: ["react.js"], // cos ~ 0.95 -> matches higher
        },
      ];

      const matches = await findSemanticMatches(currentUser, candidates);

      // Verify gardening is filtered out
      expect(matches.find((m) => m.user._id === "c_garden")).toBeUndefined();

      // Verify matches are ranked descending
      expect(matches.length).toBe(2);
      expect(matches[0].user._id).toBe("c_reactjs");
      expect(matches[1].user._id).toBe("c_js");
      expect(matches[0].compatibilityScore).toBeGreaterThan(matches[1].compatibilityScore);
      expect(matches[0].matchType).toBe("semantic");
      expect(matches[0].score).toBeDefined();
      expect(matches[0].explanation).toContain("react.js");
    });

    it("should strictly exclude current user from semantic matching candidates", async () => {
      const currentUser = {
        _id: "self_user",
        name: "Learner",
        skillsToLearn: ["React"],
        skillsToTeach: [],
      };

      const candidates = [
        {
          _id: "self_user",
          name: "Learner Self",
          skillsToTeach: ["react.js"],
        },
        {
          _id: "other_user",
          name: "Other User",
          skillsToTeach: ["react.js"],
        },
      ];

      const matches = await findSemanticMatches(currentUser, candidates);
      expect(matches).toHaveLength(1);
      expect(matches[0].user._id).toBe("other_user");
    });

    it("should return empty array if learner has empty skillsToLearn", async () => {
      const emptyLearner = {
        _id: "learner_no_skills",
        name: "Newbie",
        skillsToLearn: [],
        skillsToTeach: ["Python"],
      };

      const candidates = [
        {
          _id: "c1",
          skillsToTeach: ["React"],
        },
      ];

      const matches = await findSemanticMatches(emptyLearner, candidates);
      expect(matches).toEqual([]);
    });

    it("should gracefully handle candidates with no teachable skills", async () => {
      const learner = {
        _id: "learner1",
        skillsToLearn: ["React"],
      };

      const candidates = [
        {
          _id: "c_empty",
          skillsToTeach: [],
        },
        {
          _id: "c_spaces",
          skillsToTeach: ["   ", ""],
        },
      ];

      const matches = await findSemanticMatches(learner, candidates);
      expect(matches).toEqual([]);
    });
  });
});
