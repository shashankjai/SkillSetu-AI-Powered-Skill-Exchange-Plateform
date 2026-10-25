// client/src/pages/knovia/KnoviaProgressPage.jsx
// Every number on this page is computed by the backend from stored quiz attempts,
// study-plan tasks and documents. Nothing here is placeholder data.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, TrendingUp, TrendingDown, Info } from "lucide-react";
import { knoviaApi, getErrorMessage } from "../../api/knoviaApi";
import { Card, PageHeader, EmptyState, ErrorBanner, ProgressBar, Spinner } from "../../components/knovia/ui";

const Stat = ({ label, value, sub }) => (
  <Card className="p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
  </Card>
);

const ScoreChart = ({ series }) => {
  const data = series.slice(-20);
  const W = 600, H = 160, pad = 24;
  const bw = (W - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" role="img" aria-label={`Quiz scores for your last ${data.length} attempts`}>
      {[0, 50, 100].map((g) => {
        const y = pad / 2 + (H - pad) * (1 - g / 100);
        return <g key={g}><line x1={pad} x2={W - pad} y1={y} y2={y} stroke="#1e293b" /><text x={0} y={y + 3} fontSize="9" fill="#64748b">{g}%</text></g>;
      })}
      {data.map((d, i) => {
        const h = ((H - pad) * d.percentage) / 100;
        const x = pad + i * bw + bw * 0.15;
        return (
          <g key={d.attemptId}>
            <title>{`${d.quizTitle}: ${d.score}/${d.total} (${d.percentage}%) on ${new Date(d.date).toLocaleDateString()}`}</title>
            <rect x={x} y={pad / 2 + (H - pad) - h} width={bw * 0.7} height={Math.max(h, 1)} rx="2" fill={d.percentage >= 70 ? "#0F766E" : d.percentage >= 40 ? "#B45309" : "#B91C1C"} />
          </g>
        );
      })}
      <text x={pad} y={H + 16} fontSize="9" fill="#64748b">oldest</text>
      <text x={W - pad} y={H + 16} fontSize="9" fill="#64748b" textAnchor="end">latest</text>
    </svg>
  );
};

const KnoviaProgressPage = () => {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try { setP((await knoviaApi.getProgress()).progress); setError(""); }
    catch (err) { setError(getErrorMessage(err, "Could not load your progress.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <Spinner label="Calculating progress…" />;
  if (!p) return <ErrorBanner message={error} onRetry={load} />;

  if (!p.hasAnyActivity) {
    return (
      <>
        <PageHeader title="Learning Progress" />
        <EmptyState icon={LineChart} title="No learning activity yet" body="Upload a document, take a quiz or complete study-plan tasks. Your real progress will show up here." action={<Link to="/knovia/documents" className="rounded-lg bg-[#2563EB] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]">Upload a document</Link>} />
      </>
    );
  }

  const q = p.quizzes;
  const maxActivity = Math.max(1, ...p.activity.map((d) => d.quizAttempts + d.tasksCompleted));

  return (
    <>
      <PageHeader title="Learning Progress" subtitle="Calculated from your saved quiz attempts, study-plan tasks and documents." />
      <ErrorBanner message={error} />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Documents" value={p.documents} sub="ready to study" />
        <Stat label="Quiz attempts" value={q.attempts} />
        <Stat label="Average score" value={q.averagePercentage === null ? "—" : `${q.averagePercentage}%`} sub={q.attempts ? `best ${q.bestPercentage}%` : "no attempts yet"} />
        <Stat label="Tasks done" value={`${p.studyPlans.completedTasks}/${p.studyPlans.totalTasks}`} sub={`${p.studyPlans.count} plan${p.studyPlans.count === 1 ? "" : "s"}`} />
        <Stat
          label="Score trend"
          value={q.trendPoints === null ? "—" : <span className={`inline-flex items-center gap-1 ${q.trendPoints >= 0 ? "text-teal-300" : "text-red-300"}`}>{q.trendPoints >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}{q.trendPoints > 0 ? "+" : ""}{q.trendPoints}</span>}
          sub={q.trendPoints === null ? "needs 2+ attempts" : "points, recent vs earlier"}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Quiz scores over time</h2>
          {q.scoreSeries.length === 0 ? <p className="text-sm text-slate-500">Take a quiz to see your scores here.</p> : <ScoreChart series={q.scoreSeries} />}
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Activity, last 14 days</h2>
          <div className="flex h-32 items-end gap-1.5" role="img" aria-label="Quiz attempts and completed tasks per day over the last 14 days">
            {p.activity.map((d) => {
              const n = d.quizAttempts + d.tasksCompleted;
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${d.quizAttempts} quiz attempt(s), ${d.tasksCompleted} task(s) completed`}>
                  <div className={`w-full rounded-sm ${n ? "bg-[#2563EB]" : "bg-slate-800"}`} style={{ height: `${n ? Math.max(8, (n / maxActivity) * 100) : 4}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-600"><span>{p.activity[0].date.slice(5)}</span><span>{p.activity[p.activity.length - 1].date.slice(5)}</span></div>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Topics to review</h2>
          {p.weakTopics.length > 0 ? (
            <ul className="space-y-3">
              {p.weakTopics.map((t) => (
                <li key={t.topic}>
                  <div className="mb-1 flex justify-between text-sm"><span className="text-slate-200">{t.topic}</span><span className="text-amber-300">{t.accuracy}%</span></div>
                  <ProgressBar value={t.accuracy} label={`${t.topic} accuracy`} />
                  <p className="mt-1 text-xs text-slate-500">{t.correct} of {t.answered} questions correct</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-start gap-2 text-sm text-slate-400"><Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{p.weakTopicsNote}</p>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Study plans</h2>
          {p.studyPlans.plans.length === 0 ? (
            <p className="text-sm text-slate-500">No study plans yet. <Link to="/knovia/study-plans" className="text-blue-400 hover:underline">Create one</Link>.</p>
          ) : (
            <ul className="space-y-3">
              {p.studyPlans.plans.map((sp) => (
                <li key={sp.planId}>
                  <Link to={`/knovia/study-plans/${sp.planId}`} className="mb-1 flex justify-between text-sm hover:text-white"><span className="truncate text-slate-200">{sp.title}</span><span className="shrink-0 pl-2 text-slate-400">{sp.completedTasks}/{sp.totalTasks}</span></Link>
                  <ProgressBar value={sp.percentComplete} label={`${sp.title} progress`} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
};

export default KnoviaProgressPage;
