// backend/services/knovia/documentAccess.js
// The single place that decides which documents a user may read.
const StudyDocument = require("../../models/StudyDocument");
const DocumentChunk = require("../../models/DocumentChunk");
const AppError = require("../../utils/AppError");

/**
 * Resolve ids to documents the user OWNS and that are ready.
 * With no ids, returns all of the user's ready documents.
 * Throws if any requested id is not owned/ready (no existence leak: same error).
 */
const getReadyOwnedDocuments = async (userId, ids = []) => {
  const filter = { owner: userId, status: "ready" };
  if (ids.length) filter._id = { $in: ids };
  const docs = await StudyDocument.find(filter).select("originalName").lean();
  if (ids.length && docs.length !== ids.length) {
    throw new AppError(404, "One or more selected documents were not found or are not ready.", "DOC_NOT_FOUND");
  }
  if (docs.length === 0) {
    throw new AppError(400, "Upload a PDF and wait until it is ready first.", "NO_READY_DOCS");
  }
  return docs;
};

/** Evenly sampled, order-preserving excerpts for quiz / plan generation. */
const loadExcerpts = async (userId, docs, limit, maxChars = 900) => {
  const { sampleEvenly } = require("../../utils/validate");
  const chunks = await DocumentChunk.find({ owner: userId, document: { $in: docs.map((d) => d._id) } })
    .select("document pageNumber chunkIndex content")
    .sort({ document: 1, chunkIndex: 1 })
    .lean();
  const names = new Map(docs.map((d) => [String(d._id), d.originalName]));
  return sampleEvenly(chunks, limit).map((c, i) => ({
    ref: `S${i + 1}`,
    documentName: names.get(String(c.document)) || "Document",
    pageNumber: c.pageNumber,
    content: c.content.slice(0, maxChars),
  }));
};

module.exports = { getReadyOwnedDocuments, loadExcerpts };
