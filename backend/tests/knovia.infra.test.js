const { createUserRateLimiter } = require("../middlewares/rateLimit");
const { isObjectId, parseIdList, sampleEvenly, sanitizeFilename } = require("../utils/validate");
const AppError = require("../utils/AppError");

const mockRes = () => {
  const res = { statusCode: 200, headers: {}, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.set = (k, v) => { res.headers[k] = v; return res; };
  return res;
};

describe("Knovia rate limiter", () => {
  it("allows up to max requests per user then returns 429 with Retry-After", () => {
    const limiter = createUserRateLimiter({ name: "t", windowMs: 60000, max: 2 });
    let passed = 0;
    const next = () => { passed++; };
    for (let i = 0; i < 2; i++) limiter({ user: { id: "u1" } }, mockRes(), next);
    const res = mockRes();
    limiter({ user: { id: "u1" } }, res, next);
    expect(passed).toBe(2);
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe("RATE_LIMITED");
    expect(typeof res.headers["Retry-After"]).toBe("string");
  });

  it("tracks users independently", () => {
    const limiter = createUserRateLimiter({ name: "t", windowMs: 60000, max: 1 });
    let passed = 0;
    limiter({ user: { id: "a" } }, mockRes(), () => passed++);
    limiter({ user: { id: "b" } }, mockRes(), () => passed++);
    expect(passed).toBe(2);
  });
});

describe("Knovia validation helpers", () => {
  it("validates ObjectId strings", () => {
    expect(isObjectId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isObjectId("../../etc/passwd")).toBe(false);
    expect(isObjectId({ $ne: null })).toBe(false);
    expect(isObjectId("507f1f77bcf86cd79943901")).toBe(false);
  });

  it("parses id lists: dedupes, enforces bounds, rejects NoSQL-style objects", () => {
    const a = "507f1f77bcf86cd799439011";
    const b = "507f1f77bcf86cd799439012";
    expect(parseIdList([a, a, b], { max: 5 })).toEqual([a, b]);
    expect(parseIdList(undefined, { max: 5 })).toEqual([]);
    expect(() => parseIdList([], { min: 1, max: 5 })).toThrow();
    expect(() => parseIdList([a, b], { max: 1 })).toThrow();
    expect(() => parseIdList([{ $ne: "x" }], { max: 5 })).toThrow();
    expect(() => parseIdList("nope", { max: 5 })).toThrow();
  });

  it("samples evenly and preserves order", () => {
    const arr = Array.from({ length: 100 }, (_, i) => i);
    const s = sampleEvenly(arr, 4);
    expect(s).toEqual([0, 25, 50, 75]);
    expect(sampleEvenly([1, 2], 5)).toEqual([1, 2]);
    expect(sampleEvenly([], 3)).toEqual([]);
  });

  it("sanitizes uploaded file names (no paths, no control chars)", () => {
    expect(sanitizeFilename("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFilename("C:\\Users\\me\\notes.pdf")).toBe("notes.pdf");
    expect(sanitizeFilename("a\u0000b<c>.pdf")).toBe("abc.pdf");
    expect(sanitizeFilename("")).toBe("document.pdf");
    expect(sanitizeFilename("x".repeat(500)).length).toBe(200);
  });

  it("AppError carries status and code", () => {
    const e = new AppError(404, "nope", "X");
    expect(e.status).toBe(404);
    expect(e.code).toBe("X");
    expect(e.message).toBe("nope");
  });
});
