// backend/controllers/chatbotController.js
// Handles AI Learning Assistant conversational messages, history retrieval,
// and history clearing with rate limiting and user ownership enforcement.

const ChatbotMessage = require("../models/ChatbotMessage");
const chatbotService = require("../services/chatbotService");

// ── In-Memory Per-User Rate Limiter (approx. 20 req/min) ───────────
const chatbotRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 20;

const checkChatbotRateLimit = (userId) => {
  const now = Date.now();
  const record = chatbotRateLimitMap.get(userId) || {
    count: 0,
    resetTime: now + RATE_LIMIT_WINDOW_MS,
  };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    chatbotRateLimitMap.set(userId, record);
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  record.count += 1;
  chatbotRateLimitMap.set(userId, record);
  return true;
};

// Periodic map cleanup every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [userId, record] of chatbotRateLimitMap.entries()) {
    if (now > record.resetTime) {
      chatbotRateLimitMap.delete(userId);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

// ── Controller Handlers ─────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 2000;

/** Validates the body and the rate limit. Returns the trimmed message, or null after sending an error. */
const readIncomingMessage = (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ msg: "Message is required and cannot be empty." });
    return null;
  }
  const trimmedMessage = message.trim();
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ msg: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.` });
    return null;
  }
  if (!checkChatbotRateLimit(req.user.id)) {
    res.set("Retry-After", "60");
    res.status(429).json({
      msg: "Too many chatbot requests. Please wait a moment before sending another message.",
    });
    return null;
  }
  return trimmedMessage;
};

/** Saves the model's answer and returns the saved document. */
const saveModelMessage = (userId, aiResult) =>
  new ChatbotMessage({
    user: userId,
    role: "model",
    content: aiResult.reply,
    sources: aiResult.sources || [],
  }).save();

/**
 * @route   POST /api/chatbot/message
 * @desc    Send a message to the AI Assistant with RAG context and persist turn
 * @access  Private (JWT auth required)
 */
const sendMessage = async (req, res) => {
  try {
    const trimmedMessage = readIncomingMessage(req, res);
    if (!trimmedMessage) return undefined;

    // Persist the user's incoming message
    const userMessageDoc = await new ChatbotMessage({
      user: req.user.id,
      role: "user",
      content: trimmedMessage,
    }).save();

    // Generate AI response with RAG context
    let aiResult;
    try {
      aiResult = await chatbotService.generateChatResponse(
        req.user.id,
        trimmedMessage,
        { excludeMessageId: userMessageDoc._id } // already saved above; keep it out of the history block
      );
    } catch (aiErr) {
      // The turn failed: remove the saved question so that "Retry" does not leave duplicates in the history
      await ChatbotMessage.deleteOne({ _id: userMessageDoc._id }).catch(() => {});
      return res.status(500).json({
        msg: aiErr.message || "Failed to generate AI response. Please try again.",
      });
    }

    const modelMessageDoc = await saveModelMessage(req.user.id, aiResult);

    return res.status(200).json({
      reply: aiResult.reply,
      sources: aiResult.sources || [],
      contextUsed: Boolean(aiResult.contextUsed),
      messageId: modelMessageDoc._id,
    });
  } catch (err) {
    console.error("Error in chatbot sendMessage:", err);
    return res.status(500).json({ msg: "Server error processing chat message." });
  }
};

/**
 * @route   POST /api/chatbot/message/stream
 * @desc    Same as sendMessage, but the answer is streamed as Server-Sent Events:
 *            event: token  data: {"text": "..."}          (many)
 *            event: done   data: {reply, sources, contextUsed, messageId}
 *            event: error  data: {"msg": "..."}
 *          Validation and rate-limit errors are plain JSON responses (400/429) sent before the stream starts.
 * @access  Private (JWT auth required)
 */
const streamMessage = async (req, res) => {
  let userMessageDoc = null;
  let streaming = false;
  try {
    const trimmedMessage = readIncomingMessage(req, res);
    if (!trimmedMessage) return undefined;

    userMessageDoc = await new ChatbotMessage({
      user: req.user.id,
      role: "user",
      content: trimmedMessage,
    }).save();

    res.status(200).set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // stop nginx-style proxies from buffering the stream
    });
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    streaming = true;

    let clientGone = false;
    res.on("close", () => {
      clientGone = true;
    });
    const send = (event, data) => {
      if (!clientGone) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const aiResult = await chatbotService.generateChatResponse(req.user.id, trimmedMessage, {
        excludeMessageId: userMessageDoc._id,
        onToken: (piece) => send("token", { text: piece }),
      });
      // saved even if the browser disconnected, so the answer is in the history next time
      const modelMessageDoc = await saveModelMessage(req.user.id, aiResult);
      send("done", {
        reply: aiResult.reply,
        sources: aiResult.sources || [],
        contextUsed: Boolean(aiResult.contextUsed),
        messageId: modelMessageDoc._id,
      });
    } catch (aiErr) {
      await ChatbotMessage.deleteOne({ _id: userMessageDoc._id }).catch(() => {});
      send("error", { msg: aiErr.message || "Failed to generate AI response. Please try again." });
    }
    return res.end();
  } catch (err) {
    console.error("Error in chatbot streamMessage:", err);
    if (userMessageDoc) await ChatbotMessage.deleteOne({ _id: userMessageDoc._id }).catch(() => {});
    if (streaming) {
      res.write(`event: error\ndata: ${JSON.stringify({ msg: "Server error processing chat message." })}\n\n`);
      return res.end();
    }
    return res.status(500).json({ msg: "Server error processing chat message." });
  }
};

/**
 * @route   GET /api/chatbot/history
 * @desc    Retrieve authenticated user's chat history in chronological order
 * @access  Private (JWT auth required)
 */
const getHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const history = await ChatbotMessage.find({ user: req.user.id })
      .sort({ createdAt: 1 })
      .limit(limit)
      .select("-__v")
      .lean();

    return res.status(200).json(history);
  } catch (err) {
    console.error("Error in chatbot getHistory:", err);
    return res.status(500).json({ msg: "Server error fetching chat history." });
  }
};

/**
 * @route   DELETE /api/chatbot/history
 * @desc    Clear all chatbot messages belonging to the authenticated user
 * @access  Private (JWT auth required)
 */
const clearHistory = async (req, res) => {
  try {
    const result = await ChatbotMessage.deleteMany({ user: req.user.id });

    return res.status(200).json({
      msg: "Chat history cleared successfully.",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error in chatbot clearHistory:", err);
    return res.status(500).json({ msg: "Server error clearing chat history." });
  }
};

module.exports = {
  sendMessage,
  streamMessage,
  getHistory,
  clearHistory,
  checkChatbotRateLimit,
  chatbotRateLimitMap,
  MAX_REQUESTS_PER_MINUTE,
};

