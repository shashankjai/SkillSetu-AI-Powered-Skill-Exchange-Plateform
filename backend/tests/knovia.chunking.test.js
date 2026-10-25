const { chunkText, chunkPages, normalizeText } = require("../services/knovia/chunking");
const { cosineSimilarity, isValidEmbedding, atlasScoreToCosine, rankByCosine } = require("../services/knovia/vectorMath");

const OPTS = { size: 200, overlap: 40, minChars: 20 };

describe("Knovia chunking (page-aware)", () => {
  it("normalizes whitespace and strips NUL bytes", () => {
    expect(normalizeText("a \u0000 b\r\n\r\n\r\n\r\nc")).toBe("a b\n\nc");
  });

  it("returns one chunk for short text and none for tiny text", () => {
    expect(chunkText("This is a short but valid sentence.", OPTS)).toHaveLength(1);
    expect(chunkText("tiny", OPTS)).toHaveLength(0);
  });

  it("splits long text into bounded chunks with overlap and forward progress", () => {
    const text = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} explains idea ${i}.`).join(" ");
    const chunks = chunkText(text, OPTS);
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(OPTS.size);
    // overlap: the tail of chunk n appears at the head of chunk n+1
    const tail = chunks[0].slice(-15).trim();
    expect(chunks[1].includes(tail.split(" ").slice(-2).join(" "))).toBe(true);
    // every word of the source survives in at least one chunk
    for (const w of ["number 0", "number 30", "number 59"]) expect(chunks.some((c) => c.includes(w))).toBe(true);
  });

  it("never loops forever when overlap >= size", () => {
    const chunks = chunkText("word ".repeat(500), { size: 100, overlap: 500, minChars: 10 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("never lets a chunk span two pages and keeps exact page numbers", () => {
    const pages = [
      { pageNumber: 1, text: "Alpha content for the first page that is long enough to keep." },
      { pageNumber: 2, text: "" },
      { pageNumber: 3, text: "Gamma content for the third page that is also long enough." },
    ];
    const chunks = chunkPages(pages, OPTS);
    expect(chunks.map((c) => c.pageNumber)).toEqual([1, 3]);
    expect(chunks.map((c) => c.chunkIndex)).toEqual([0, 1]);
    expect(chunks[0].content.includes("Gamma")).toBe(false);
  });

  it("throws on invalid size", () => {
    expect(() => chunkText("abc", { size: 0 })).toThrow();
  });
});

describe("Knovia vector math", () => {
  it("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 6);
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
  });

  it("validates embedding shape", () => {
    expect(isValidEmbedding([1, 2, 3], 3)).toBe(true);
    expect(isValidEmbedding([1, 2], 3)).toBe(false);
    expect(isValidEmbedding([1, NaN, 3], 3)).toBe(false);
    expect(isValidEmbedding("abc", 3)).toBe(false);
  });

  it("converts Atlas normalized scores back to raw cosine", () => {
    expect(atlasScoreToCosine(1)).toBe(1);
    expect(atlasScoreToCosine(0.5)).toBe(0);
    expect(atlasScoreToCosine(0)).toBe(-1);
  });

  it("ranks, thresholds, limits and strips embeddings", () => {
    const cands = [
      { id: "a", embedding: [1, 0] },
      { id: "b", embedding: [0.9, 0.1] },
      { id: "c", embedding: [0, 1] },
    ];
    const out = rankByCosine([1, 0], cands, { topK: 2, minSimilarity: 0.5 });
    expect(out.map((x) => x.id)).toEqual(["a", "b"]);
    expect(out[0].embedding).toBe(undefined);
    expect(rankByCosine([1, 0], cands, { topK: 5, minSimilarity: 0.999 })).toHaveLength(1);
  });
});
