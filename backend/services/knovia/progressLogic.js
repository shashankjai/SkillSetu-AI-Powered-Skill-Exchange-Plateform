// backend/services/knovia/progressLogic.js
// Pure, deterministic progress computation from persisted records.

const WEAK_TOPIC_MIN_ANSWERS = 3;     // evidence required before a topic is judged
const WEAK_TOPIC_ACCURACY = 0.6;      // below this = weak
const MIN_ATTEMPTS_FOR_INSIGHTS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

/**
 * @param {object} input
 * @param {{_id, quiz, quizTitle, percentage, score, total, createdAt, results:{topic,correct}[]}[]} input.attempts
 * @param {{_id,title,milestones:{tasks:{completed,completedAt}[]}[]}[]} input.plans
 * @param {number} input.documentCount
 * @param {Date} [input.now]
 */
const computeProgress = ({ attempts = [], plans = [], documentCount = 0, now = new Date(), windowDays = 14 }) => {
  const sorted = [...attempts].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const scoreSeries = sorted.map((a) => ({
    attemptId: String(a._id),
    quizTitle: a.quizTitle,
    percentage: a.percentage,
    score: a.score,
    total: a.total,
    date: new Date(a.createdAt).toISOString(),
  }));

  const average = sorted.length
    ? Math.round((sorted.reduce((s, a) => s + a.percentage, 0) / sorted.length) * 10) / 10
    : null;
  const best = sorted.length ? Math.max(...sorted.map((a) => a.percentage)) : null;

  // Improvement is only reported when there is something to compare.
  let trend = null;
  if (sorted.length >= MIN_ATTEMPTS_FOR_INSIGHTS) {
    const half = Math.floor(sorted.length / 2);
    const avg = (arr) => arr.reduce((s, a) => s + a.percentage, 0) / arr.length;
    trend = Math.round((avg(sorted.slice(sorted.length - half)) - avg(sorted.slice(0, half))) * 10) / 10;
  }

  // Topic accuracy from per-question results.
  const topicMap = new Map();
  for (const a of sorted) {
    for (const r of a.results || []) {
      const key = r.topic || "General";
      const t = topicMap.get(key) || { topic: key, answered: 0, correct: 0 };
      t.answered++;
      if (r.correct) t.correct++;
      topicMap.set(key, t);
    }
  }
  const topics = [...topicMap.values()]
    .map((t) => ({ ...t, accuracy: Math.round((t.correct / t.answered) * 1000) / 10 }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const enoughForWeak = sorted.length >= MIN_ATTEMPTS_FOR_INSIGHTS;
  const weakTopics = enoughForWeak
    ? topics.filter((t) => t.answered >= WEAK_TOPIC_MIN_ANSWERS && t.accuracy / 100 < WEAK_TOPIC_ACCURACY)
    : [];

  // Plans
  const planSummaries = plans.map((p) => {
    const tasks = p.milestones.flatMap((m) => m.tasks);
    const done = tasks.filter((t) => t.completed).length;
    return {
      planId: String(p._id),
      title: p.title,
      totalTasks: tasks.length,
      completedTasks: done,
      percentComplete: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    };
  });
  const totalTasks = planSummaries.reduce((s, p) => s + p.totalTasks, 0);
  const completedTasks = planSummaries.reduce((s, p) => s + p.completedTasks, 0);

  // Activity per day (quiz attempts + completed tasks) for the last N days.
  const start = new Date(now.getTime() - (windowDays - 1) * DAY_MS);
  const buckets = new Map();
  for (let i = 0; i < windowDays; i++) buckets.set(dayKey(new Date(start.getTime() + i * DAY_MS)), { date: null, quizAttempts: 0, tasksCompleted: 0 });
  for (const [k, v] of buckets) v.date = k;
  for (const a of sorted) {
    const b = buckets.get(dayKey(a.createdAt));
    if (b) b.quizAttempts++;
  }
  for (const p of plans) {
    for (const m of p.milestones) {
      for (const t of m.tasks) {
        if (t.completed && t.completedAt) {
          const b = buckets.get(dayKey(t.completedAt));
          if (b) b.tasksCompleted++;
        }
      }
    }
  }

  return {
    documents: documentCount,
    quizzes: {
      attempts: sorted.length,
      averagePercentage: average,
      bestPercentage: best,
      trendPoints: trend, // later-half avg minus earlier-half avg; null if < 2 attempts
      scoreSeries,
    },
    studyPlans: { count: plans.length, totalTasks, completedTasks, plans: planSummaries },
    topics,
    weakTopics,
    weakTopicsNote: enoughForWeak
      ? weakTopics.length === 0
        ? `No topic has both ${WEAK_TOPIC_MIN_ANSWERS}+ answered questions and accuracy below ${WEAK_TOPIC_ACCURACY * 100}%.`
        : null
      : `Weak-topic insights need at least ${MIN_ATTEMPTS_FOR_INSIGHTS} quiz attempts.`,
    activity: [...buckets.values()],
    hasAnyActivity: sorted.length > 0 || completedTasks > 0 || documentCount > 0 || plans.length > 0,
  };
};

module.exports = { computeProgress, WEAK_TOPIC_MIN_ANSWERS, WEAK_TOPIC_ACCURACY, MIN_ATTEMPTS_FOR_INSIGHTS };
