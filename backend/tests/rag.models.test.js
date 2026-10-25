// backend/tests/rag.models.test.js
// 100% Offline Unit Tests for Step 1 Models, Schema Validation & Seeding Readiness.
// No MongoDB connections or live AI API calls are made.

const mongoose = require("mongoose");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const ChatbotMessage = require("../models/ChatbotMessage");
const { EMBEDDING_DIMENSIONS } = require("../config/aiConstants");
const {
  starterKnowledgeDocuments,
  prepareChunks,
  seedKnowledgeBase,
} = require("../data/seedKnowledge");

describe("RAG Models & Seed Knowledge - Step 1 Unit Tests", () => {
  describe("1. KnowledgeChunk Schema Validation", () => {
    it("should pass validation with valid 3072-dimensional vector", () => {
      const validVector = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
      const chunk = new KnowledgeChunk({
        documentTitle: "Test Document",
        documentSource: "SkillSetu Verified Platform Documentation",
        category: "platform_guide",
        chunkIndex: 0,
        content: "Valid test content for platform guide.",
        contentHash: "hash_test_123",
        dimensions: EMBEDDING_DIMENSIONS,
        embedding: validVector,
      });

      const err = chunk.validateSync();
      expect(err).toBeUndefined();
      expect(chunk.dimensions).toBe(3072);
      expect(chunk.embedding.length).toBe(3072);
    });

    it("should fail validation if embedding length does not match EMBEDDING_DIMENSIONS", () => {
      const shortVector = [0.1, 0.2, 0.3]; // Length 3 instead of 3072
      const chunk = new KnowledgeChunk({
        documentTitle: "Test Document",
        documentSource: "Test Source",
        category: "dsa",
        chunkIndex: 0,
        content: "Test content.",
        contentHash: "hash_short_vec",
        dimensions: EMBEDDING_DIMENSIONS,
        embedding: shortVector,
      });

      const err = chunk.validateSync();
      expect(err).toBeDefined();
      expect(err.errors["embedding"]).toBeDefined();
    });

    it("should fail validation if vector contains NaN or non-numeric values", () => {
      const invalidVector = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
      invalidVector[10] = NaN;

      const chunk = new KnowledgeChunk({
        documentTitle: "Test Document",
        documentSource: "Test Source",
        category: "web_development",
        chunkIndex: 0,
        content: "Test content.",
        contentHash: "hash_nan_vec",
        dimensions: EMBEDDING_DIMENSIONS,
        embedding: invalidVector,
      });

      const err = chunk.validateSync();
      expect(err).toBeDefined();
      expect(err.errors["embedding"]).toBeDefined();
    });

    it("should fail validation if required fields (title, category, content) are missing", () => {
      const chunk = new KnowledgeChunk({
        // Missing documentTitle, category, content, embedding
        chunkIndex: 0,
      });

      const err = chunk.validateSync();
      expect(err).toBeDefined();
      expect(err.errors["documentTitle"]).toBeDefined();
      expect(err.errors["documentSource"]).toBeDefined();
      expect(err.errors["category"]).toBeDefined();
      expect(err.errors["content"]).toBeDefined();
      expect(err.errors["embedding"]).toBeDefined();
    });

    it("should reject invalid category not in enum", () => {
      const validVector = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
      const chunk = new KnowledgeChunk({
        documentTitle: "Test Document",
        documentSource: "Test Source",
        category: "unsupported_category_xyz",
        chunkIndex: 0,
        content: "Test content.",
        contentHash: "hash_invalid_cat",
        dimensions: EMBEDDING_DIMENSIONS,
        embedding: validVector,
      });

      const err = chunk.validateSync();
      expect(err).toBeDefined();
      expect(err.errors["category"]).toBeDefined();
    });
  });

  describe("2. Document-Scoped Hashing & Deduplication", () => {
    it("should generate stable deterministic hashes for identical inputs", () => {
      const h1 = KnowledgeChunk.hashChunk("Title A", 0, "Hello World Content");
      const h2 = KnowledgeChunk.hashChunk("Title A", 0, "Hello World Content");
      expect(h1).toBe(h2);
      expect(typeof h1).toBe("string");
      expect(h1.length).toBe(64); // SHA-256 hex string
    });

    it("should distinguish identical content belonging to different documents or chunk indices", () => {
      const sharedContent = "Common shared introductory text across modules.";
      const hashDocA = KnowledgeChunk.hashChunk("Module A", 0, sharedContent);
      const hashDocB = KnowledgeChunk.hashChunk("Module B", 0, sharedContent);
      const hashChunk1 = KnowledgeChunk.hashChunk("Module A", 1, sharedContent);

      expect(hashDocA).not.toBe(hashDocB);
      expect(hashDocA).not.toBe(hashChunk1);
    });
  });

  describe("3. ChatbotMessage Schema Validation", () => {
    it("should pass validation for valid user and model messages", () => {
      const validMsg = new ChatbotMessage({
        user: new mongoose.Types.ObjectId(),
        role: "model",
        content: "Here is an explanation of React hooks.",
        sources: [
          {
            documentTitle: "React Component Lifecycle & State Management",
            documentSource: "General Educational Reference - Web Development",
            category: "web_development",
            similarity: 0.82,
          },
        ],
      });

      const err = validMsg.validateSync();
      expect(err).toBeUndefined();
      expect(validMsg.sources).toHaveLength(1);
    });

    it("should reject messages with invalid role", () => {
      const invalidMsg = new ChatbotMessage({
        user: new mongoose.Types.ObjectId(),
        role: "admin", // Only 'user' or 'model' allowed
        content: "Some message",
      });

      const err = invalidMsg.validateSync();
      expect(err).toBeDefined();
      expect(err.errors["role"]).toBeDefined();
    });

    it("should reject messages exceeding maximum length (4000 characters)", () => {
      const longText = "a".repeat(4001);
      const longMsg = new ChatbotMessage({
        user: new mongoose.Types.ObjectId(),
        role: "user",
        content: longText,
      });

      const err = longMsg.validateSync();
      expect(err).toBeDefined();
      expect(err.errors["content"]).toBeDefined();
    });
  });

  describe("4. Seed Knowledge Preparation & Readiness", () => {
    it("should prepare chunks with valid metadata and distinguish platform vs educational content", () => {
      const chunks = prepareChunks();
      expect(chunks.length).toBe(starterKnowledgeDocuments.length);

      const platformChunks = chunks.filter((c) => c.category === "platform_guide");
      const educationalChunks = chunks.filter((c) => c.category !== "platform_guide");

      expect(platformChunks.length).toBeGreaterThan(0);
      expect(educationalChunks.length).toBeGreaterThan(0);

      platformChunks.forEach((c) => {
        expect(c.documentSource).toContain("SkillSetu Verified Platform Documentation");
        expect(c.contentHash).toBeDefined();
        expect(c.isPublic).toBe(true);
      });

      educationalChunks.forEach((c) => {
        expect(c.documentSource).toContain("General Educational Reference");
      });
    });

    it("should throw error if seedKnowledgeBase is called without an embeddingGenerator", async () => {
      await expect(seedKnowledgeBase()).rejects.toThrow(
        "seedKnowledgeBase requires an active embeddingGenerator function"
      );
    });

    it("should throw error if embeddingGenerator returns wrong dimensions", async () => {
      const badGenerator = async () => [0.1, 0.2]; // Length 2 instead of 3072
      await expect(seedKnowledgeBase(badGenerator)).rejects.toThrow(
        `Expected ${EMBEDDING_DIMENSIONS} dimensions`
      );
    });

    it("should throw error and never call updateOne if embedding contains NaN", async () => {
      const updateOneSpy = jest.spyOn(KnowledgeChunk, "updateOne").mockResolvedValue({});
      const nanGenerator = async () => {
        const vec = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
        vec[5] = NaN;
        return vec;
      };
      try {
        await expect(seedKnowledgeBase(nanGenerator)).rejects.toThrow(
          "non-finite or non-numeric values"
        );
        expect(updateOneSpy).not.toHaveBeenCalled();
      } finally {
        updateOneSpy.mockRestore();
      }
    });

    it("should throw error and never call updateOne if embedding contains Infinity or -Infinity", async () => {
      const updateOneSpy = jest.spyOn(KnowledgeChunk, "updateOne").mockResolvedValue({});
      const infinityGenerator = async () => {
        const vec = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
        vec[10] = Infinity;
        return vec;
      };
      const negInfinityGenerator = async () => {
        const vec = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
        vec[20] = -Infinity;
        return vec;
      };

      try {
        await expect(seedKnowledgeBase(infinityGenerator)).rejects.toThrow(
          "non-finite or non-numeric values"
        );
        expect(updateOneSpy).not.toHaveBeenCalled();

        await expect(seedKnowledgeBase(negInfinityGenerator)).rejects.toThrow(
          "non-finite or non-numeric values"
        );
        expect(updateOneSpy).not.toHaveBeenCalled();
      } finally {
        updateOneSpy.mockRestore();
      }
    });

    it("should throw error and never call updateOne if embedding contains non-numeric string types", async () => {
      const updateOneSpy = jest.spyOn(KnowledgeChunk, "updateOne").mockResolvedValue({});
      const stringElementGenerator = async () => {
        const vec = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
        vec[0] = "0.01"; // string type
        return vec;
      };

      try {
        await expect(seedKnowledgeBase(stringElementGenerator)).rejects.toThrow(
          "non-finite or non-numeric values"
        );
        expect(updateOneSpy).not.toHaveBeenCalled();
      } finally {
        updateOneSpy.mockRestore();
      }
    });

    it("should pass runValidators: true and upsert: true in updateOne options", async () => {
      const validVector = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
      const singleGenerator = async () => validVector;
      const updateOneSpy = jest
        .spyOn(KnowledgeChunk, "updateOne")
        .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      try {
        const res = await seedKnowledgeBase(singleGenerator);
        expect(res.processed).toBe(starterKnowledgeDocuments.length);
        expect(updateOneSpy).toHaveBeenCalled();
        const callOptions = updateOneSpy.mock.calls[0][2];
        expect(callOptions).toEqual(
          expect.objectContaining({ upsert: true, runValidators: true })
        );
      } finally {
        updateOneSpy.mockRestore();
      }
    });

    it("should fail fast and preserve original error if embeddingGenerator fails midway", async () => {
      let callCount = 0;
      const failingGenerator = async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Simulated Provider Rate Limit on chunk 2");
        }
        return new Array(EMBEDDING_DIMENSIONS).fill(0.01);
      };

      // Mock KnowledgeChunk.updateOne so no real DB connection is required
      const updateOneSpy = jest
        .spyOn(KnowledgeChunk, "updateOne")
        .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      try {
        await expect(seedKnowledgeBase(failingGenerator)).rejects.toThrow(
          "Simulated Provider Rate Limit on chunk 2"
        );
        expect(callCount).toBe(2);
        // Chunk 1 was processed, chunk 2 threw before DB update, and subsequent chunks were aborted
        expect(updateOneSpy).toHaveBeenCalledTimes(1);
      } finally {
        updateOneSpy.mockRestore();
      }
    });
  });
});

