// backend/tests/rag.services.test.js
// 100% Offline Unit Tests for ragService.js and chatbotService.js
// Mocks aiService and models. Zero MongoDB connections or live AI calls.

const {
  cosineSimilarity,
  retrieveRelevantChunks,
  buildContextBlock,
  DEFAULT_TOP_K,
  DEFAULT_SIMILARITY_THRESHOLD,
} = require("../services/ragService");
const {
  buildGroundedPrompt,
  generateChatResponse,
  MAX_HISTORY_MESSAGES,
} = require("../services/chatbotService");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const ChatbotMessage = require("../models/ChatbotMessage");
const aiService = require("../services/aiService");
const { EMBEDDING_DIMENSIONS } = require("../config/aiConstants");

describe("RAG & Chatbot Services - Step 2 Unit Tests", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

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

    it("should return 0 for mismatched length or invalid inputs", () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity(null, [1, 2])).toBe(0);
      expect(cosineSimilarity([1, 2], "invalid")).toBe(0);
    });
  });

  describe("2. Semantic Retrieval - retrieveRelevantChunks", () => {
    it("should return empty array immediately for empty or whitespace query", async () => {
      const resEmpty = await retrieveRelevantChunks("");
      const resSpaces = await retrieveRelevantChunks("   ");
      expect(resEmpty).toEqual([]);
      expect(resSpaces).toEqual([]);
    });

    it("should generate query embedding, query public chunks, and rank by similarity", async () => {
      // Mock query vector
      const queryVector = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
      jest.spyOn(aiService, "generateEmbedding").mockResolvedValue(queryVector);

      // Create candidates: 1 high match (0.99), 1 moderate match (0.75), 1 low match (0.10)
      const highVector = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
      const modVector = new Array(EMBEDDING_DIMENSIONS).fill(0.0075);
      const lowVector = new Array(EMBEDDING_DIMENSIONS).fill(0.001);

      const mockCandidateChunks = [
        {
          documentTitle: "Doc Low",
          documentSource: "Source C",
          category: "web_development",
          content: "Low match content.",
          embedding: lowVector,
        },
        {
          documentTitle: "Doc High",
          documentSource: "Source A",
          category: "platform_guide",
          content: "High match content.",
          embedding: highVector,
        },
        {
          documentTitle: "Doc Mod",
          documentSource: "Source B",
          category: "platform_guide",
          content: "Moderate match content.",
          embedding: modVector,
        },
      ];

      const findSpy = jest.spyOn(KnowledgeChunk, "find").mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCandidateChunks),
      });

      const results = await retrieveRelevantChunks("How do I match on SkillSetu?", {
        threshold: 0.60,
        topK: 2,
      });

      // Verify query filter strictly restricts to public documents
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ isPublic: true, owner: null })
      );

      // Verify top-K = 2 and ranked descending
      expect(results).toHaveLength(2);
      expect(results[0].documentTitle).toBe("Doc High");
      expect(results[1].documentTitle).toBe("Doc Mod");
      expect(results[0].similarity).toBeGreaterThanOrEqual(results[1].similarity);
    });

    it("should return empty array if no chunks exceed similarity threshold", async () => {
      const queryVector = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
      jest.spyOn(aiService, "generateEmbedding").mockResolvedValue(queryVector);

      const orthogonalVector = new Array(EMBEDDING_DIMENSIONS).fill(0);
      orthogonalVector[0] = 1;

      const mockChunks = [
        {
          documentTitle: "Unrelated Doc",
          documentSource: "Source X",
          category: "web_development",
          content: "Completely unrelated topic.",
          embedding: orthogonalVector,
        },
      ];

      jest.spyOn(KnowledgeChunk, "find").mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockChunks),
      });

      const results = await retrieveRelevantChunks("Unrelated query", {
        threshold: 0.80,
      });

      expect(results).toEqual([]);
    });
  });

  describe("3. Prompt Grounding & Context Construction", () => {
    it("should build clean context block with source attribution", () => {
      const chunks = [
        {
          documentTitle: "Skill Matching Guide",
          documentSource: "SkillSetu Platform Guide",
          content: "Matching uses cosine similarity.",
        },
      ];

      const block = buildContextBlock(chunks);
      expect(block).toContain("Skill Matching Guide");
      expect(block).toContain("SkillSetu Platform Guide");
      expect(block).toContain("Matching uses cosine similarity.");
    });

    it("should return empty string for empty chunks in buildContextBlock", () => {
      expect(buildContextBlock([])).toBe("");
      expect(buildContextBlock(null)).toBe("");
    });

    it("should build grounded prompt emphasizing grounding and anti-hallucination", () => {
      const chunks = [
        {
          documentTitle: "Platform Guide",
          documentSource: "SkillSetu",
          content: "Skill swap is free.",
        },
      ];
      const history = [
        { role: "user", content: "Hi" },
        { role: "model", content: "Hello! How can I help?" },
      ];

      const prompt = buildGroundedPrompt("How does it work?", chunks, history);

      expect(prompt).toContain("Platform Guide");
      expect(prompt).toContain("User: Hi");
      expect(prompt).toContain("SkillSetu Assistant: Hello! How can I help?");
      expect(prompt).toContain("How does it work?");
      expect(prompt).toContain("DO NOT fabricate SkillSetu platform policies");
    });

    it("should explicitly state absence of platform material when no chunks match", () => {
      const prompt = buildGroundedPrompt("What is a red-black tree?", []);
      expect(prompt).toContain(
        "NO SPECIFIC PLATFORM REFERENCE MATERIAL WAS FOUND FOR THIS QUERY."
      );
      expect(prompt).toContain(
        'No specific SkillSetu platform documentation was found for this query.'
      );
    });
  });

  describe("4. Chatbot Service Orchestration - generateChatResponse", () => {
    it("should reject empty user message", async () => {
      await expect(generateChatResponse("user123", "")).rejects.toThrow(
        "User message cannot be empty."
      );
      await expect(generateChatResponse("user123", "   ")).rejects.toThrow(
        "User message cannot be empty."
      );
    });

    it("should execute full pipeline, return verified sources, and set contextUsed: true", async () => {
      // Mock embedding and RAG chunks
      const queryVector = new Array(EMBEDDING_DIMENSIONS).fill(0.01);
      jest.spyOn(aiService, "generateEmbedding").mockResolvedValue(queryVector);

      const mockCandidateChunks = [
        {
          documentTitle: "Skill Matching Compatibility",
          documentSource: "SkillSetu Verified Platform Documentation",
          category: "platform_guide",
          content: "Matches users based on cosine similarity.",
          embedding: queryVector, // Identical vector -> sim ~ 1.0
        },
      ];

      jest.spyOn(KnowledgeChunk, "find").mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockCandidateChunks),
      });

      // Mock message history
      jest.spyOn(ChatbotMessage, "find").mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Mock LLM generation
      jest
        .spyOn(aiService, "generateText")
        .mockResolvedValue("SkillSetu matches users using cosine similarity >= 0.70.");

      const result = await generateChatResponse(
        "user123",
        "How does matching work?"
      );

      expect(result.reply).toContain("SkillSetu matches users using cosine similarity");
      expect(result.contextUsed).toBe(true);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].documentTitle).toBe("Skill Matching Compatibility");
      expect(result.sources[0].documentSource).toBe(
        "SkillSetu Verified Platform Documentation"
      );
      expect(result.sources[0].similarity).toBeCloseTo(1.0, 2);
    });

    it("should handle LLM failure gracefully by throwing clear error", async () => {
      jest.spyOn(aiService, "generateEmbedding").mockResolvedValue(
        new Array(EMBEDDING_DIMENSIONS).fill(0.01)
      );
      jest.spyOn(KnowledgeChunk, "find").mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      jest.spyOn(ChatbotMessage, "find").mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      // Simulate Gemini failure
      jest
        .spyOn(aiService, "generateText")
        .mockRejectedValue(new Error("503 Service Unavailable"));

      await expect(
        generateChatResponse("user123", "Help me with Python")
      ).rejects.toThrow("The AI Assistant is currently experiencing high demand");
    });
  });
});

