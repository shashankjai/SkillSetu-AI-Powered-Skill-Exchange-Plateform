// backend/tests/chatbot.test.js
// 100% Offline Unit Tests for Chatbot Controller, Routes, Validation & History Management.
// Zero database connections or live AI API calls.

const mongoose = require("mongoose");
const {
  sendMessage,
  getHistory,
  clearHistory,
  checkChatbotRateLimit,
  chatbotRateLimitMap,
  MAX_REQUESTS_PER_MINUTE,
} = require("../controllers/chatbotController");
const chatbotService = require("../services/chatbotService");
const ChatbotMessage = require("../models/ChatbotMessage");

const createMockReqRes = (options = {}) => {
  const req = {
    user: options.user || { id: "test_user_123" },
    body: options.body || {},
    query: options.query || {},
    headers: options.headers || {},
  };

  const res = {
    statusCode: null,
    responseData: null,
    status: jest.fn().mockImplementation(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn().mockImplementation(function (data) {
      this.responseData = data;
      return this;
    }),
  };

  return { req, res };
};

describe("Chatbot Controller & API Endpoints - Step 3 Unit Tests", () => {
  beforeEach(() => {
    chatbotRateLimitMap.clear();
    jest.restoreAllMocks();
  });

  describe("1. Input Validation (POST /api/chatbot/message)", () => {
    it("should return 400 if message is missing or empty string", async () => {
      const { req, res } = createMockReqRes({ body: { message: "" } });
      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ msg: "Message is required and cannot be empty." })
      );
    });

    it("should return 400 if message is only whitespace", async () => {
      const { req, res } = createMockReqRes({ body: { message: "     " } });
      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ msg: "Message is required and cannot be empty." })
      );
    });

    it("should return 400 if message exceeds 2000 characters", async () => {
      const longMessage = "x".repeat(2001);
      const { req, res } = createMockReqRes({ body: { message: longMessage } });
      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "Message exceeds maximum allowed length of 2000 characters.",
        })
      );
    });
  });

  describe("2. Rate Limiting (POST /api/chatbot/message)", () => {
    it("should allow up to MAX_REQUESTS_PER_MINUTE and block subsequent calls with 429", async () => {
      const userId = "rate_limited_user";

      // Fill up rate limit quota
      for (let i = 0; i < MAX_REQUESTS_PER_MINUTE; i++) {
        const allowed = checkChatbotRateLimit(userId);
        expect(allowed).toBe(true);
      }

      // Next request should be blocked
      const blocked = checkChatbotRateLimit(userId);
      expect(blocked).toBe(false);

      // Verify controller responds with 429
      const { req, res } = createMockReqRes({
        user: { id: userId },
        body: { message: "Hello AI" },
      });
      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.stringContaining("Too many chatbot requests"),
        })
      );
    });
  });

  describe("3. Successful Message Processing & Source Metadata", () => {
    it("should persist user message and model response, returning 200 with sources", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const userMessage = "How does skill swapping work?";

      // Mock ChatbotMessage save
      jest.spyOn(ChatbotMessage.prototype, "save").mockResolvedValue({});

      // Mock chatbotService response
      jest.spyOn(chatbotService, "generateChatResponse").mockResolvedValue({
        reply: "SkillSetu is a free peer-to-peer exchange.",
        sources: [
          {
            documentTitle: "SkillSetu Peer Exchange Mechanics",
            documentSource: "SkillSetu Verified Platform Documentation",
            similarity: 0.88,
          },
        ],
        contextUsed: true,
      });

      const { req, res } = createMockReqRes({
        user: { id: userId },
        body: { message: userMessage },
      });

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          reply: "SkillSetu is a free peer-to-peer exchange.",
          contextUsed: true,
          sources: expect.arrayContaining([
            expect.objectContaining({
              documentTitle: "SkillSetu Peer Exchange Mechanics",
            }),
          ]),
        })
      );
    });

    it("should return 500 when AI generation service fails", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      jest.spyOn(ChatbotMessage.prototype, "save").mockResolvedValue({});
      jest
        .spyOn(chatbotService, "generateChatResponse")
        .mockRejectedValue(
          new Error("The AI Assistant is currently experiencing high demand")
        );

      const { req, res } = createMockReqRes({
        user: { id: userId },
        body: { message: "Help with React" },
      });

      await sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: expect.stringContaining("experiencing high demand"),
        })
      );
    });
  });

  describe("4. Chat History Retrieval & User Isolation (GET /api/chatbot/history)", () => {
    it("should return authenticated user's history in chronological order", async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const mockHistory = [
        {
          _id: "msg1",
          user: userId,
          role: "user",
          content: "Hello",
          createdAt: new Date("2026-10-10T10:00:00Z"),
        },
        {
          _id: "msg2",
          user: userId,
          role: "model",
          content: "Hi! How can I help?",
          createdAt: new Date("2026-10-10T10:00:02Z"),
        },
      ];

      const findSpy = jest.spyOn(ChatbotMessage, "find").mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockHistory),
      });

      const { req, res } = createMockReqRes({
        user: { id: userId },
        query: { limit: "20" },
      });

      await getHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(findSpy).toHaveBeenCalledWith({ user: userId });
      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });
  });

  describe("5. Chat History Clearing & User Isolation (DELETE /api/chatbot/history)", () => {
    it("should delete only messages belonging to authenticated user", async () => {
      const userId = "target_user_abc";
      const deleteManySpy = jest
        .spyOn(ChatbotMessage, "deleteMany")
        .mockResolvedValue({ deletedCount: 8 });

      const { req, res } = createMockReqRes({ user: { id: userId } });
      await clearHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(deleteManySpy).toHaveBeenCalledWith({ user: userId });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: "Chat history cleared successfully.",
          deletedCount: 8,
        })
      );
    });
  });
});

