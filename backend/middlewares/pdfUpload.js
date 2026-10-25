// backend/middlewares/pdfUpload.js
// Strict uploader for private study PDFs.
//  - Stored under backend/storage/study-documents/<userId>/ — OUTSIDE the public
//    /uploads static mount in server.js.
//  - Random server-generated file names; client file names are never used on disk.
//  - Size limit, single file, PDF mimetype + extension filter. Magic bytes are
//    verified again after upload by the controller / extractor.
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const AppError = require("../utils/AppError");
const { isObjectId } = require("../utils/validate");
const { MAX_PDF_BYTES } = require("../config/knoviaConfig");

const STORAGE_ROOT = path.join(__dirname, "..", "storage", "study-documents");

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const id = req.user && req.user.id;
    if (!isObjectId(String(id))) return cb(new AppError(401, "Invalid user."));
    const dir = path.join(STORAGE_ROOT, String(id));
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.pdf`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_PDF_BYTES, files: 1, fields: 5 },
  fileFilter: (_req, file, cb) => {
    const okType = file.mimetype === "application/pdf";
    const okExt = /\.pdf$/i.test(file.originalname || "");
    if (!okType || !okExt) return cb(new AppError(400, "Only PDF files are allowed.", "PDF_TYPE"));
    cb(null, true);
  },
});

/** Absolute path for a stored file, refusing anything outside the owner's directory. */
const resolveStoredPath = (ownerId, storedName) => {
  if (!isObjectId(String(ownerId)) || !/^[a-f0-9-]{36}\.pdf$/i.test(String(storedName))) {
    throw new AppError(400, "Invalid file reference.");
  }
  return path.join(STORAGE_ROOT, String(ownerId), String(storedName));
};

module.exports = { uploadSinglePdf: upload.single("file"), resolveStoredPath, STORAGE_ROOT };
