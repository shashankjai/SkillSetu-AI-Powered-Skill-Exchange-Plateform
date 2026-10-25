const { validatePlanPayload, summarizePlan } = require("../services/knovia/planLogic");
const { computeProgress } = require("../services/knovia/progressLogic");
const { processAnswer, labelChunks, excerptOf, INSUFFICIENT_SENTINEL } = require("../services/knovia/ragLogic");

describe("Knovia study plan validation", () => {
  const raw = JSON.stringify({
    title: "Plan", summary: "s",
    milestones: [
      { title: "Later", weekNumber: 3, tasks: [{ title: "t3", type: "quiz", estimatedMinutes: 5 }] },
      { title: "First", weekNumber: 1, tasks: [{ title: "t1", type: "bogus", estimatedMinutes: 999 }, { title: "" }] },
      { title: "No tasks", weekNumber: 2, tasks: [] },
      { title: "", weekNumber: 2, tasks: [{ title: "x" }] },
    ],
  });

  it("keeps valid milestones, sorts by week, clamps values and assigns task ids", () => {
    const p = validatePlanPayload(raw, { weeks: 4 });
    expect(p.milestones.map((m) => m.title)).toEqual(["First", "Later"]);
    const t = p.milestones[0].tasks[0];
    expect(t.type).toBe("read");
    expect(t.estimatedMinutes).toBe(240);
    expect(typeof t._id).toBe("string");
    expect(t.completed).toBe(false);
    expect(p.milestones[1].tasks[0].estimatedMinutes).toBe(10);
  });

  it("clamps week numbers into range", () => {
    const p = validatePlanPayload(JSON.stringify({ milestones: [{ title: "m", weekNumber: 50, tasks: [{ title: "t" }] }] }), { weeks: 4 });
    expect(p.milestones[0].weekNumber).toBe(4);
  });

  it("throws when nothing valid remains", () => {
    expect(() => validatePlanPayload('{"milestones":[]}', { weeks: 2 })).toThrow();
    expect(() => validatePlanPayload("nope", { weeks: 2 })).toThrow();
  });

  it("summarizes completion and next actions from stored task state", () => {
    const plan = { milestones: [
      { title: "A", weekNumber: 1, tasks: [{ _id: "1", title: "x", completed: true }, { _id: "2", title: "y", completed: false }] },
      { title: "B", weekNumber: 2, tasks: [{ _id: "3", title: "z", completed: false }] },
    ] };
    const s = summarizePlan(plan);
    expect(s.totalTasks).toBe(3);
    expect(s.completedTasks).toBe(1);
    expect(s.percentComplete).toBe(33);
    expect(s.nextActions.map((n) => n.taskId)).toEqual(["2", "3"]);
  });
});

describe("Knovia progress (derived from persisted records)", () => {
  const NOW = new Date("2026-10-17T12:00:00Z");
  const attempt = (id, pct, date, results) => ({ _id: id, quizTitle: "Q", percentage: pct, score: 0, total: 0, createdAt: date, results });

  it("returns an honest empty state with no data", () => {
    const p = computeProgress({ now: NOW });
    expect(p.hasAnyActivity).toBe(false);
    expect(p.quizzes.attempts).toBe(0);
    expect(p.quizzes.averagePercentage).toBe(null);
    expect(p.quizzes.trendPoints).toBe(null);
    expect(p.weakTopics).toEqual([]);
    expect(p.activity).toHaveLength(14);
  });

  it("does not report weak topics or trend with a single attempt", () => {
    const p = computeProgress({ now: NOW, attempts: [attempt("a", 40, "2026-10-16T10:00:00Z", [{ topic: "X", correct: false }, { topic: "X", correct: false }, { topic: "X", correct: false }])] });
    expect(p.weakTopics).toEqual([]);
    expect(p.trendPoints).toBe(undefined);
    expect(p.quizzes.trendPoints).toBe(null);
    expect(p.weakTopicsNote.includes("at least 2")).toBe(true);
  });

  it("identifies weak topics only with enough evidence", () => {
    const r = (topic, correct) => ({ topic, correct });
    const attempts = [
      attempt("a", 50, "2026-10-10T10:00:00Z", [r("Weak", false), r("Weak", false), r("Strong", true), r("Rare", false)]),
      attempt("b", 70, "2026-10-15T10:00:00Z", [r("Weak", true), r("Weak", false), r("Strong", true)]),
    ];
    const p = computeProgress({ now: NOW, attempts });
    expect(p.weakTopics.map((t) => t.topic)).toEqual(["Weak"]);   // Rare has 1 answer -> not judged
    expect(p.weakTopics[0].accuracy).toBe(25);
    expect(p.quizzes.averagePercentage).toBe(60);
    expect(p.quizzes.bestPercentage).toBe(70);
    expect(p.quizzes.trendPoints).toBe(20);
  });

  it("counts plan tasks and buckets activity by day", () => {
    const plans = [{ _id: "p", title: "Plan", milestones: [{ tasks: [
      { completed: true, completedAt: "2026-10-17T08:00:00Z" },
      { completed: true, completedAt: "2026-09-01T08:00:00Z" },   // outside window
      { completed: false, completedAt: null },
    ] }] }];
    const p = computeProgress({ now: NOW, plans, attempts: [attempt("a", 80, "2026-10-17T09:00:00Z", [])], documentCount: 2 });
    expect(p.studyPlans.totalTasks).toBe(3);
    expect(p.studyPlans.completedTasks).toBe(2);
    expect(p.studyPlans.plans[0].percentComplete).toBe(67);
    const today = p.activity.find((d) => d.date === "2026-10-17");
    expect(today.tasksCompleted).toBe(1);
    expect(today.quizAttempts).toBe(1);
    expect(p.hasAnyActivity).toBe(true);
  });
});

describe("Knovia answer post-processing (citation integrity)", () => {
  const labeled = labelChunks([
    { documentName: "bio.pdf", pageNumber: 4, content: "ATP is made in mitochondria." },
    { documentName: "bio.pdf", pageNumber: 9, content: "DNA is in the nucleus." },
  ]);

  it("labels excerpts S1..Sn", () => {
    expect(labeled.map((c) => c.ref)).toEqual(["S1", "S2"]);
  });

  it("keeps valid citations and reports which were cited", () => {
    const r = processAnswer("Mitochondria make ATP [S1].", labeled);
    expect(r.grounded).toBe(true);
    expect(r.citedRefs).toEqual(["S1"]);
  });

  it("strips citations to excerpts that were never supplied", () => {
    const r = processAnswer("Claim A [S1]. Claim B [S7].", labeled);
    expect(r.answer.includes("S7")).toBe(false);
    expect(r.citedRefs).toEqual(["S1"]);
  });

  it("treats an answer with no valid citation as not grounded", () => {
    const r = processAnswer("Here is a confident answer with no citation [S5].", labeled);
    expect(r.grounded).toBe(false);
    expect(r.citedRefs).toEqual([]);
  });

  it("treats the sentinel / empty output as insufficient evidence", () => {
    expect(processAnswer(INSUFFICIENT_SENTINEL, labeled).grounded).toBe(false);
    expect(processAnswer("", labeled).grounded).toBe(false);
  });

  it("truncates excerpts for display", () => {
    expect(excerptOf("a ".repeat(500), 50).length).toBeLessThanOrEqual(51);
  });
});
