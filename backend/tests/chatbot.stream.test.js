// Server-Sent Events endpoint of the AI assistant, with the AI and the database replaced by fakes.
const EventEmitter = require("events");

const mockSaved = [];
const mockDeleted = [];
jest.mock("../models/ChatbotMessage", () => {
  class ChatbotMessage {
    constructor(data) {
      Object.assign(this, data);
      this._id = `id${mockSaved.length}`;
    }
    async save() {
      mockSaved.push(this);
      return this;
    }
  }
  ChatbotMessage.deleteOne = jest.fn(async (q) => {
    mockDeleted.push(q._id);
    return {};
  });
  return ChatbotMessage;
});
const mockGenerate = jest.fn();
jest.mock("../services/chatbotService", () => ({ generateChatResponse: (...a) => mockGenerate(...a) }));

const { streamMessage } = require("../controllers/chatbotController");

const mockRes = () => {
  const res = new EventEmitter();
  res.out = "";
  res.headers = {};
  res.status = jest.fn((c) => {
    res.code = c;
    return res;
  });
  res.set = jest.fn((h, v) => {
    if (typeof h === "object") Object.assign(res.headers, h);
    else res.headers[h] = v;
    return res;
  });
  res.json = jest.fn((b) => {
    res.body = b;
    return res;
  });
  res.flushHeaders = jest.fn();
  res.write = jest.fn((s) => {
    res.out += s;
  });
  res.end = jest.fn();
  return res;
};
const eventNames = (out) => (out.match(/event: (\w+)/g) || []).map((e) => e.replace("event: ", ""));

beforeEach(() => {
  mockSaved.length = 0;
  mockDeleted.length = 0;
  mockGenerate.mockReset();
});

describe("POST /api/chatbot/message/stream", () => {
  it("streams token events, then a done event, and saves both turns", async () => {
    mockGenerate.mockImplementation(async (_u, _m, opt) => {
      opt.onToken("Hi ");
      opt.onToken("you");
      return { reply: "Hi you", sources: [], contextUsed: false };
    });
    const res = mockRes();
    await streamMessage({ user: { id: "u1" }, body: { message: "hello" } }, res);
    expect(res.headers["Content-Type"]).toMatch(/text\/event-stream/);
    expect(eventNames(res.out)).toEqual(["token", "token", "done"]);
    expect(mockSaved.map((m) => m.role)).toEqual(["user", "model"]);
  });

  it("sends an error event and removes the saved question when the AI fails", async () => {
    mockGenerate.mockRejectedValue(new Error("boom"));
    const res = mockRes();
    await streamMessage({ user: { id: "u2" }, body: { message: "hello" } }, res);
    expect(eventNames(res.out)).toEqual(["error"]);
    expect(mockDeleted).toHaveLength(1);
  });

  it("answers an empty message with a plain 400 before any stream starts", async () => {
    const res = mockRes();
    await streamMessage({ user: { id: "u3" }, body: { message: "   " } }, res);
    expect(res.code).toBe(400);
    expect(res.out).toBe("");
  });
});
