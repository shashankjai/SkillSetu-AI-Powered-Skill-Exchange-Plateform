// backend/controllers/knoviaDocumentController.js
const fs = require("fs");
const crypto = require("crypto");
const StudyDocument = require("../models/StudyDocument");
const DocumentChunk = require("../models/DocumentChunk");
const AppError = require("../utils/AppError");
const cfg = require("../config/knoviaConfig");
const { sanitizeFilename } = require("../utils/validate");
const { resolveStoredPath } = require("../middlewares/pdfUpload");
const { looksLikePdf } = require("../services/knovia/pdfExtractor");
const { processDocument } = require("../services/knovia/documentPipeline");

const PUBLIC_FIELDS = "originalName sizeBytes pageCount chunkCount status errorCode errorMessage processedAt createdAt updatedAt";

const removeFile = (p) => fs.promises.unlink(p).catch(() => {});

// Guard: refuse uploads before reading the body when the user is at quota.
const enforceQuota = async (req, _res, next) => {
  const count = await StudyDocument.countDocuments({ owner: req.user.id });
  if (count >= cfg.MAX_DOCS_PER_USER) {
    throw new AppError(409, `You can store up to ${cfg.MAX_DOCS_PER_USER} documents. Delete one to upload another.`, "DOC_QUOTA");
  }
  next();
};

const startBackgroundProcessing = (id) =>
  setImmediate(() => processDocument(id).catch((e) => console.error("[knovia] pipeline crash:", e)));

const uploadDocument = async (req, res) => {
  if (!req.file) throw new AppError(400, "No PDF file was provided (field name: file).", "NO_FILE");
  const filePath = req.file.path;

  try {
    if (req.file.size === 0) throw new AppError(400, "The uploaded file is empty.", "PDF_EMPTY");
    const buffer = await fs.promises.readFile(filePath);
    if (!looksLikePdf(buffer)) throw new AppError(400, "The file is not a valid PDF.", "PDF_INVALID");

    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const existing = await StudyDocument.findOne({ owner: req.user.id, sha256 }).select(PUBLIC_FIELDS).lean();
    if (existing) {
      await removeFile(filePath);
      return res.status(409).json({ msg: "You have already uploaded this PDF.", code: "DOC_DUPLICATE", document: existing });
    }

    const doc = await StudyDocument.create({
      owner: req.user.id,
      originalName: sanitizeFilename(req.file.originalname),
      storedName: req.file.filename,
      sizeBytes: req.file.size,
      sha256,
      status: "processing",
    });

    startBackgroundProcessing(doc._id);
    const out = await StudyDocument.findById(doc._id).select(PUBLIC_FIELDS).lean();
    return res.status(202).json({ document: out });
  } catch (err) {
    await removeFile(filePath);
    // Two concurrent uploads of the same file race on the unique (owner, sha256) index.
    if (err && err.code === 11000) {
      throw new AppError(409, "You have already uploaded this PDF.", "DOC_DUPLICATE");
    }
    throw err;
  }
};

const listDocuments = async (req, res) => {
  // Recover documents orphaned by a crash/restart mid-processing.
  await StudyDocument.updateMany(
    { owner: req.user.id, status: "processing", updatedAt: { $lt: new Date(Date.now() - cfg.PROCESSING_STALE_MS) } },
    { $set: { status: "failed", errorCode: "PROCESSING_TIMEOUT", errorMessage: "Processing did not finish. Use Retry." } }
  );
  const documents = await StudyDocument.find({ owner: req.user.id }).select(PUBLIC_FIELDS).sort({ createdAt: -1 }).lean();
  res.json({ documents, limits: { maxDocuments: cfg.MAX_DOCS_PER_USER, maxMegabytes: cfg.MAX_PDF_BYTES / 1048576, maxPages: cfg.MAX_PDF_PAGES } });
};

// Ownership is part of the query: another user's id yields the same 404 as a missing one.
const findOwned = async (req, select = PUBLIC_FIELDS) => {
  const doc = await StudyDocument.findOne({ _id: req.params.id, owner: req.user.id }).select(select);
  if (!doc) throw new AppError(404, "Document not found.", "DOC_NOT_FOUND");
  return doc;
};

const getDocument = async (req, res) => {
  const doc = await findOwned(req);
  res.json({ document: doc });
};

const downloadDocument = async (req, res) => {
  const doc = await findOwned(req, "originalName storedName owner");
  const filePath = resolveStoredPath(doc.owner, doc.storedName);
  if (!fs.existsSync(filePath)) throw new AppError(410, "The stored file is no longer available.", "FILE_MISSING");
  res.set("Content-Type", "application/pdf");
  res.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`);
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Cache-Control", "private, no-store");
  fs.createReadStream(filePath).pipe(res);
};

const reprocessDocument = async (req, res) => {
  const doc = await findOwned(req, "status owner");
  if (doc.status === "processing") throw new AppError(409, "This document is already being processed.", "DOC_BUSY");
  doc.status = "processing";
  doc.errorCode = "";
  doc.errorMessage = "";
  await doc.save();
  startBackgroundProcessing(doc._id);
  const out = await StudyDocument.findById(doc._id).select(PUBLIC_FIELDS).lean();
  res.status(202).json({ document: out });
};

const deleteDocument = async (req, res) => {
  const doc = await findOwned(req, "owner storedName");
  await DocumentChunk.deleteMany({ document: doc._id, owner: req.user.id });
  await removeFile(resolveStoredPath(doc.owner, doc.storedName));
  await StudyDocument.deleteOne({ _id: doc._id, owner: req.user.id });
  res.json({ msg: "Document deleted." });
};

module.exports = {
  enforceQuota, uploadDocument, listDocuments, getDocument, downloadDocument, reprocessDocument, deleteDocument,
};
