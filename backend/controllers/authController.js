// controllers/authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

// ---- helpers -----------------------------------------------------------------------------
// The routes declare express-validator rules, but the controller never read their result (the check
// was commented out), so validation did nothing. These helpers enforce it, plus type checks that
// also block NoSQL-injection payloads such as { "email": { "$gt": "" } }.
const isText = (v) => typeof v === "string";
const normalizeEmail = (v) => String(v).trim().toLowerCase();

// Simple in-memory brute-force guard: 10 failed logins per email+IP per 15 minutes.
// (Per server instance. Use Redis or express-rate-limit with a shared store if you scale out.)
const FAILED_LIMIT = 10;
const FAILED_WINDOW_MS = 15 * 60 * 1000;
const failedLogins = new Map();
const loginKey = (req, email) => `${req.ip}|${email}`;
const isLockedOut = (key) => {
  const rec = failedLogins.get(key);
  if (!rec) return 0;
  if (rec.resetAt < Date.now()) {
    failedLogins.delete(key);
    return 0;
  }
  return rec.count >= FAILED_LIMIT ? Math.ceil((rec.resetAt - Date.now()) / 1000) : 0;
};
const recordFailure = (key) => {
  const now = Date.now();
  const rec = failedLogins.get(key);
  if (!rec || rec.resetAt < now) failedLogins.set(key, { count: 1, resetAt: now + FAILED_WINDOW_MS });
  else rec.count += 1;
};

// Register a new user
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, email, password } = req.body;
  if (!isText(name) || !isText(email) || !isText(password)) {
    return res.status(400).json({ msg: "Name, email and password must be text." });
  }
  if (!name.trim() || name.trim().length > 80) {
    return res.status(400).json({ msg: "Name must be 1-80 characters." });
  }
  // bcrypt only uses the first 72 bytes, so longer passwords give a false sense of security
  if (password.length < 6 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ msg: "Password must be 6-72 characters." });
  }
  const cleanEmail = normalizeEmail(email);

  try {
    // Check if user already exists (also matches accounts saved before emails were lower-cased)
    let user = await User.findOne({ email: { $in: [email, cleanEmail] } });
    if (user) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // Create a new user instance
    user = new User({ name: name.trim(), email: cleanEmail, password });

    // Encrypt the password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Generate JWT token
    const payload = { user: { id: user.id, role: user.role } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
      (err, token) => {
        if (err) {
          console.error("JWT sign error during registration:", err);
          return res.status(500).json({ msg: err.message || "Server error" });
        }
        res.json({ token });
      },
    );
  } catch (err) {
    console.error("Error in registerUser:", err);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};

const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: errors.array()[0].msg, errors: errors.array() });
  }

  const { email, password } = req.body;
  if (!isText(email) || !isText(password)) {
    return res.status(400).json({ msg: "Email and password must be text." });
  }
  const cleanEmail = normalizeEmail(email);
  const key = loginKey(req, cleanEmail);
  const wait = isLockedOut(key);
  if (wait) {
    res.set("Retry-After", String(wait));
    return res.status(429).json({ msg: "Too many failed attempts. Please try again later." });
  }

  if (process.env.ADMIN_EMAIL && cleanEmail === normalizeEmail(process.env.ADMIN_EMAIL)) {
    try {
      const adminUser = await User.findOne({ email: { $in: [email, cleanEmail] } });

      if (!adminUser) {
        // Same answer as a wrong password, so the admin account cannot be detected from outside
        console.error("Admin login attempted but admin record missing.");
        recordFailure(key);
        return res.status(400).json({ msg: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, adminUser.password);
      if (!isMatch) {
        recordFailure(key);
        return res.status(400).json({ msg: "Invalid credentials" });
      }
      failedLogins.delete(key);

      const payload = { user: { id: adminUser._id.toString(), role: "admin" } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "2h",
      });

      return res.json({
        token,
        name: adminUser.name,
        email: adminUser.email,
        id: adminUser._id,
      });
    } catch (err) {
      console.error("Error during admin login:", err.message || err);
      return res.status(500).json({ msg: "Server error during admin login" });
    }
  }

  // ─── 2) NORMAL USER LOGIN FLOW ─────────────────────────────────────────
  try {
    // Find in DB
    const user = await User.findOne({ email: { $in: [email, cleanEmail] } });
    if (!user) {
      recordFailure(key);
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // 2️⃣ Reject if blocked
    if (user.status === "blocked") {
      return res
        .status(403)
        .json({ msg: "Your account has been blocked. Contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      recordFailure(key);
      return res.status(400).json({ msg: "Invalid credentials" });
    }
    failedLogins.delete(key);

    // Issue a standard user token
    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });
    res.json({
      token,
      name: user.name, // Add name
      email: user.email, // Add email
      id: user._id, // Add _id
      role: user.role, // Add role
    });
  } catch (err) {
    console.error("Error in loginUser:", err.stack || err);
    res.status(500).json({ msg: err.message || "Server error" });
  }
};
module.exports = { registerUser, loginUser };
