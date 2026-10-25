// backend/middlewares/rateLimit.js
// Per-user fixed-window limiter for expensive endpoints (AI calls, uploads).
// In-memory: counts are per Node process. Use a shared store (e.g. Redis) if you
// run more than one instance.

const createUserRateLimiter = ({ name, windowMs = 60_000, max, message }) => {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now > v.resetTime) hits.delete(k);
  }, Math.max(windowMs, 60_000));
  if (timer.unref) timer.unref();

  const middleware = (req, res, next) => {
    const key = (req.user && req.user.id) || req.ip;
    const now = Date.now();
    let rec = hits.get(key);
    if (!rec || now > rec.resetTime) rec = { count: 0, resetTime: now + windowMs };
    if (rec.count >= max) {
      hits.set(key, rec);
      res.set("Retry-After", String(Math.ceil((rec.resetTime - now) / 1000)));
      return res.status(429).json({ msg: message || `Too many ${name} requests. Please wait a moment.`, code: "RATE_LIMITED" });
    }
    rec.count++;
    hits.set(key, rec);
    next();
  };
  middleware.reset = () => hits.clear();
  return middleware;
};

module.exports = { createUserRateLimiter };
