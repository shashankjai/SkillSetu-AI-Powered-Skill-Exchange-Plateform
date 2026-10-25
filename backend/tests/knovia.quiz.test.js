const { validateQuizPayload, scoreAttempt, shuffleOptions, toStudentView } = require("../services/knovia/quizLogic");

const good = (over = {}) => ({
  prompt: "What does mitochondria do?",
  options: ["Makes ATP", "Stores DNA", "Digests waste", "Makes lipids"],
  correctIndex: 0,
  explanation: "Per the excerpt, mitochondria produce ATP.",
  topic: "Cell biology",
  source: "S1",
  ...over,
});
const wrap = (qs) => JSON.stringify({ questions: qs });
const REFS = new Set(["S1", "S2"]);

describe("Knovia quiz validation", () => {
  it("accepts a valid question and keeps the correct answer after shuffling", () => {
    const { questions, dropped } = validateQuizPayload(wrap([good()]), { validRefs: REFS, rng: () => 0.3 });
    expect(dropped).toBe(0);
    expect(questions).toHaveLength(1);
    expect(questions[0].options[questions[0].correctIndex]).toBe("Makes ATP");
    expect(questions[0].source).toBe("S1");
  });

  it("parses fenced JSON", () => {
    const { questions } = validateQuizPayload("```json\n" + wrap([good()]) + "\n```", { validRefs: REFS });
    expect(questions).toHaveLength(1);
  });

  it("drops malformed questions instead of repairing them", () => {
    const bad = [
      good({ options: ["a", "b", "c"] }),                       // 3 options
      good({ options: ["a", "a", "b", "c"], prompt: "dup opts" }), // duplicate options
      good({ correctIndex: 4, prompt: "bad idx" }),
      good({ correctIndex: "0", prompt: "string idx" }),
      good({ explanation: "", prompt: "no expl" }),
      good({ prompt: "" }),
    ];
    const { questions, dropped } = validateQuizPayload(wrap([...bad, good({ prompt: "ok one" })]), { validRefs: REFS });
    expect(dropped).toBe(6);
    expect(questions).toHaveLength(1);
  });

  it("drops duplicate prompts and nulls unknown source refs", () => {
    const { questions, dropped } = validateQuizPayload(
      wrap([good(), good(), good({ prompt: "Another?", source: "S99" })]),
      { validRefs: REFS }
    );
    expect(dropped).toBe(1);
    expect(questions[1].source).toBe(null);
  });

  it("throws on non-JSON and missing questions", () => {
    expect(() => validateQuizPayload("sorry I cannot", {})).toThrow();
    expect(() => validateQuizPayload('{"foo":1}', {})).toThrow();
  });

  it("shuffle preserves the option set and tracks the correct one", () => {
    const opts = ["w", "x", "y", "z"];
    for (let i = 0; i < 4; i++) {
      const r = shuffleOptions(opts, i, () => 0.9);
      expect([...r.options].sort()).toEqual(["w", "x", "y", "z"]);
      expect(r.options[r.correctIndex]).toBe(opts[i]);
    }
  });
});

describe("Knovia quiz scoring (server-side)", () => {
  const qs = [
    { options: ["a", "b", "c", "d"], correctIndex: 1, topic: "T1" },
    { options: ["a", "b", "c", "d"], correctIndex: 2, topic: "T2" },
    { options: ["a", "b", "c", "d"], correctIndex: 0, topic: "T1" },
  ];

  it("scores correct, wrong and unanswered", () => {
    const r = scoreAttempt(qs, [
      { questionIndex: 0, selectedIndex: 1 },
      { questionIndex: 1, selectedIndex: 0 },
    ]);
    expect(r.score).toBe(1);
    expect(r.total).toBe(3);
    expect(r.percentage).toBe(33.3);
    expect(r.results[2].selectedIndex).toBe(null);
    expect(r.results[2].correct).toBe(false);
  });

  it("gives 100% for all correct", () => {
    const r = scoreAttempt(qs, [0, 1, 2].map((i) => ({ questionIndex: i, selectedIndex: qs[i].correctIndex })));
    expect(r.percentage).toBe(100);
  });

  it("rejects malformed submissions", () => {
    expect(() => scoreAttempt(qs, "x")).toThrow();
    expect(() => scoreAttempt(qs, [{ questionIndex: 9, selectedIndex: 0 }])).toThrow();
    expect(() => scoreAttempt(qs, [{ questionIndex: 0, selectedIndex: 7 }])).toThrow();
    expect(() => scoreAttempt(qs, [{ questionIndex: 0, selectedIndex: 1 }, { questionIndex: 0, selectedIndex: 2 }])).toThrow();
  });

  it("student view never leaks answers or explanations", () => {
    const view = toStudentView({
      _id: "q1", title: "t", difficulty: "medium", documents: [], createdAt: new Date(),
      questions: [{ prompt: "p", options: ["a", "b", "c", "d"], correctIndex: 2, explanation: "SECRET", topic: "T" }],
    });
    const json = JSON.stringify(view);
    expect(json.includes("correctIndex")).toBe(false);
    expect(json.includes("SECRET")).toBe(false);
  });
});
