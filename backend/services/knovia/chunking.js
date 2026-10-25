// backend/services/knovia/chunking.js
// Page-aware text chunking. A chunk NEVER spans two pages, so every chunk has
// exactly one page number and citations are exact.

const normalizeText = (raw) =>
  String(raw || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Prefer to cut at a paragraph break, then sentence end, then whitespace.
const findCut = (text, start, hardEnd, minEnd) => {
  const window = text.slice(minEnd, hardEnd);
  const para = window.lastIndexOf("\n\n");
  if (para !== -1) return minEnd + para + 2;
  const sentence = Math.max(
    window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "), window.lastIndexOf(".\n")
  );
  if (sentence !== -1) return minEnd + sentence + 2;
  const space = window.lastIndexOf(" ");
  if (space !== -1) return minEnd + space + 1;
  return hardEnd;
};

/**
 * Split one page's text into overlapping windows.
 * @returns {string[]}
 */
const chunkText = (text, { size, overlap, minChars }) => {
  if (!(size > 0)) throw new Error("chunk size must be > 0");
  const safeOverlap = Math.min(Math.max(0, overlap || 0), Math.floor(size / 2));
  const clean = normalizeText(text);
  if (clean.length < (minChars || 1)) return [];
  if (clean.length <= size) return [clean];

  const out = [];
  let start = 0;
  while (start < clean.length) {
    const hardEnd = Math.min(start + size, clean.length);
    let end = hardEnd;
    if (hardEnd < clean.length) {
      end = findCut(clean, start, hardEnd, start + Math.floor(size * 0.6));
    }
    const piece = clean.slice(start, end).trim();
    if (piece.length >= (minChars || 1)) out.push(piece);
    if (end >= clean.length) break;

    let next = end - safeOverlap;
    if (next <= start) next = end; // guarantee forward progress
    // Do not begin the next chunk mid-word.
    while (next < end && next > 0 && !/\s/.test(clean[next - 1])) next++;
    start = next;
  }
  return out;
};

/**
 * @param {{pageNumber:number,text:string}[]} pages
 * @returns {{pageNumber:number, chunkIndex:number, content:string}[]}
 */
const chunkPages = (pages, opts) => {
  const out = [];
  let chunkIndex = 0;
  for (const page of pages || []) {
    for (const content of chunkText(page.text, opts)) {
      out.push({ pageNumber: page.pageNumber, chunkIndex: chunkIndex++, content });
    }
  }
  return out;
};

module.exports = { normalizeText, chunkText, chunkPages };
