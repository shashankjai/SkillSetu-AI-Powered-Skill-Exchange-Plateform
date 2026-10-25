// backend/middlewares/knoviaErrors.js
// Centralised error handler for /api/knovia. Keeps the existing { msg } error shape.
const multer = require("multer");
const AppError = require("../utils/AppError");

// eslint-disable-next-line no-unused-vars
const knoviaErrorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ msg: err.message, ...(err.code ? { code: err.code } : {}) });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ msg: "The PDF exceeds the maximum allowed file size.", code: "PDF_TOO_LARGE" });
    }
    return res.status(400).json({ msg: "Upload failed: " + err.message, code: "UPLOAD_ERROR" });
  }
  if (err && err.name === "ValidationError") {
    return res.status(400).json({ msg: "Invalid data: " + Object.values(err.errors || {}).map((e) => e.message).join("; ") });
  }
  if (err && err.name === "CastError") {
    return res.status(400).json({ msg: "Invalid identifier." });
  }
  console.error("[knovia] unhandled error:", err);
  return res.status(500).json({ msg: "Something went wrong on the server." });
};

module.exports = { knoviaErrorHandler };
