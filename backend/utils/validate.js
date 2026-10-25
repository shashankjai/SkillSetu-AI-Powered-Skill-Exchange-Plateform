// backend/utils/validate.js
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const isObjectId = (v) => typeof v === "string" && OBJECT_ID.test(v);

/** Validate an array of ObjectId strings; returns de-duplicated ids or throws. */
const parseIdList = (value, { max, min = 0, label = "ids" }) => {
  if (value === undefined || value === null) value = [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const ids = [...new Set(value.map(String))];
  if (!ids.every(isObjectId)) throw new Error(`${label} contains an invalid id`);
  if (ids.length < min) throw new Error(`${label} needs at least ${min} item(s)`);
  if (ids.length > max) throw new Error(`${label} accepts at most ${max} items`);
  return ids;
};

/** Evenly pick up to n items across an array (keeps order). */
const sampleEvenly = (arr, n) => {
  if (n <= 0 || arr.length === 0) return [];
  if (arr.length <= n) return arr.slice();
  const out = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
};

/** Safe display name for an uploaded file. */
const sanitizeFilename = (name) => {
  const base = String(name || "document.pdf").split(/[\\/]/).pop();
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim();
  return (cleaned || "document.pdf").slice(0, 200);
};

module.exports = { isObjectId, parseIdList, sampleEvenly, sanitizeFilename };
