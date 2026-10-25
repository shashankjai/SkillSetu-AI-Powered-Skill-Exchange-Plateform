// backend/services/knovia/documentPipeline.js
// PDF -> extract (page-aware) -> chunk -> embed -> store -> mark "ready".
// A document becomes "ready" ONLY after every chunk is embedded and persisted.
const fs = require("fs");
const StudyDocument = require("../../models/StudyDocument");
const DocumentChunk = require("../../models/DocumentChunk");
const AppError = require("../../utils/AppError");
const cfg = require("../../config/knoviaConfig");
const { resolveStoredPath } = require("../../middlewares/pdfUpload");
const { extractPages } = require("./pdfExtractor");
const { chunkPages } = require("./chunking");
const { embedDocuments } = require("./knoviaAi");

const processDocument = async (documentId) => {
  const doc = await StudyDocument.findById(documentId).select("+storedName");
  if (!doc) return;

  try {
    const filePath = resolveStoredPath(doc.owner, doc.storedName);
    const buffer = await fs.promises.readFile(filePath);

    const { pageCount, pages } = await extractPages(buffer, { maxPages: cfg.MAX_PDF_PAGES });
    const chunks = chunkPages(pages, { size: cfg.CHUNK_SIZE, overlap: cfg.CHUNK_OVERLAP, minChars: cfg.MIN_CHUNK_CHARS });
    if (chunks.length === 0) throw new AppError(422, "No usable text could be extracted from this PDF.", "PDF_NO_TEXT");
    if (chunks.length > cfg.MAX_CHUNKS_PER_DOC) {
      throw new AppError(400, `This PDF produces ${chunks.length} chunks; the limit is ${cfg.MAX_CHUNKS_PER_DOC}.`, "PDF_TOO_LARGE");
    }

    const vectors = await embedDocuments(chunks.map((c) => c.content));

    await DocumentChunk.deleteMany({ document: doc._id }); // idempotent re-processing
    await DocumentChunk.insertMany(
      chunks.map((c, i) => ({
        owner: doc.owner,
        document: doc._id,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        content: c.content,
        embedding: vectors[i],
        embeddingModel: cfg.EMBEDDING_MODEL,
      })),
      { ordered: true }
    );

    doc.status = "ready";
    doc.pageCount = pageCount;
    doc.chunkCount = chunks.length;
    doc.embeddingModel = cfg.EMBEDDING_MODEL;
    doc.errorCode = "";
    doc.errorMessage = "";
    doc.processedAt = new Date();
    await doc.save();
  } catch (err) {
    await DocumentChunk.deleteMany({ document: doc._id }).catch(() => {});
    doc.status = "failed";
    doc.chunkCount = 0;
    if (err instanceof AppError) {
      doc.errorCode = err.code || "PROCESSING_FAILED";
      doc.errorMessage = err.message;
    } else {
      console.error("[knovia] document processing failed:", err);
      doc.errorCode = "PROCESSING_FAILED";
      doc.errorMessage = "Processing failed unexpectedly. You can retry.";
    }
    await doc.save().catch((e) => console.error("[knovia] could not save failure state:", e.message));
  }
};

module.exports = { processDocument };
