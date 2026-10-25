// backend/services/knovia/structured.js
// Tolerant-but-strict JSON extraction for LLM output.

const extractJson = (text) => {
  if (typeof text !== "string" || !text.trim()) throw new Error("Empty AI response");
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s);
  } catch (_) {
    // Fall back to the outermost object/array in the text.
    const firstObj = s.indexOf("{");
    const lastObj = s.lastIndexOf("}");
    const firstArr = s.indexOf("[");
    const lastArr = s.lastIndexOf("]");
    const candidates = [];
    if (firstObj !== -1 && lastObj > firstObj) candidates.push([firstObj, s.slice(firstObj, lastObj + 1)]);
    if (firstArr !== -1 && lastArr > firstArr) candidates.push([firstArr, s.slice(firstArr, lastArr + 1)]);
    candidates.sort((a, b) => a[0] - b[0]);
    for (const [, c] of candidates) {
      try { return JSON.parse(c); } catch (_) { /* try next */ }
    }
    throw new Error("AI response was not valid JSON");
  }
};

const str = (v, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");

module.exports = { extractJson, str };
