// backend/services/knovia/pdfExtractor.js
// Page-by-page PDF text extraction using pdfjs-dist (pure JS, no system binaries).
// Does NOT perform OCR: scanned / image-only PDFs are rejected with a clear error.

const AppError = require("../../utils/AppError");
const { normalizeText } = require("./chunking");

const PDF_MAGIC = Buffer.from("%PDF-");

let pdfjsPromise = null;
const loadPdfjs = () => {
  if (!pdfjsPromise) {
    // pdfjs-dist is ESM-only; the legacy build supports Node.
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsPromise;
};

/** Cheap structural check before handing bytes to the parser. */
const looksLikePdf = (buf) => Buffer.isBuffer(buf) && buf.length > 8 && buf.subarray(0, 1024).includes(PDF_MAGIC);

/**
 * @param {Buffer} buffer
 * @param {{maxPages:number}} opts
 * @returns {Promise<{pageCount:number, pages:{pageNumber:number,text:string}[]}>}
 */
const extractPages = async (buffer, { maxPages }) => {
  if (!buffer || buffer.length === 0) throw new AppError(400, "The uploaded file is empty.", "PDF_EMPTY");
  if (!looksLikePdf(buffer)) throw new AppError(400, "The file is not a valid PDF.", "PDF_INVALID");

  const pdfjs = await loadPdfjs();
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buffer), // copy: pdfjs transfers/detaches the buffer
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
      verbosity: 0,
    }).promise;
  } catch (err) {
    if (err && err.name === "PasswordException") {
      throw new AppError(400, "This PDF is password-protected. Remove the password and upload it again.", "PDF_ENCRYPTED");
    }
    throw new AppError(400, "This PDF is corrupt or could not be read.", "PDF_CORRUPT");
  }

  try {
    if (doc.numPages > maxPages) {
      throw new AppError(400, `This PDF has ${doc.numPages} pages; the limit is ${maxPages}.`, "PDF_TOO_LONG");
    }
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // Preserve line breaks reported by pdf.js so chunking can find paragraph/sentence cuts.
      let text = "";
      for (const item of content.items) {
        if (typeof item.str !== "string") continue;
        text += item.str;
        text += item.hasEOL ? "\n" : " ";
      }
      pages.push({ pageNumber: i, text: normalizeText(text) });
      page.cleanup();
    }
    const totalChars = pages.reduce((s, p) => s + p.text.length, 0);
    if (totalChars < 50) {
      throw new AppError(
        422,
        "No selectable text was found. This looks like a scanned or image-only PDF, which Knovia cannot read yet (no OCR).",
        "PDF_NO_TEXT"
      );
    }
    return { pageCount: doc.numPages, pages };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(400, "This PDF is corrupt or could not be read.", "PDF_CORRUPT");
  } finally {
    try { await doc.destroy(); } catch (_) { /* ignore */ }
  }
};

module.exports = { extractPages, looksLikePdf };
