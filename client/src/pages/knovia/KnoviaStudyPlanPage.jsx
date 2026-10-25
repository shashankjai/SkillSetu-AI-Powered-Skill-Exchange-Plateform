// client/src/pages/knovia/KnoviaStudyPlanPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2, Clock, Target } from "lucide-react";
import { knoviaApi, getErrorMessage } from "../../api/knoviaApi";
import { Card, Button, ErrorBanner, Pill, ProgressBar, Spinner } from "../../components/knovia/ui";

const TYPE_TONE = { read: "neutral", practice: "blue", quiz: "amber", review: "teal" };

const KnoviaStudyPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingTask, setPendingTask] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try { const d = await knoviaApi.getPlan(id); setPlan(d.plan); setProgress(d.progress); }
      catch (err) { setError(getErrorMessage(err, "Could not load this plan.")); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const toggle = async (task) => {
    setPendingTask(task._id);
    setError("");
    try {
      const d = await knoviaApi.setTask(id, task._id, !task.completed);
      setPlan(d.plan);
      setProgress(d.progress);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the task."));
    } finally {
      setPendingTask(null);
    }
  };

  const remove = async () => {
    try { await knoviaApi.deletePlan(id); navigate("/knovia/study-plans", { replace: true }); }
    catch (err) { setError(getErrorMessage(err, "Could not delete the plan.")); }
  };

  if (loading) return <Spinner label="Loading plan…" />;
  if (!plan) return <ErrorBanner message={error || "Plan not found."} />;

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/knovia/study-plans" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} aria-hidden="true" /> All plans</Link>

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">{plan.title}</h1>
            <p className="mt-1 text-xs text-slate-500">{plan.subject} · {plan.level} · {plan.weeks} weeks · {plan.hoursPerWeek} h/week</p>
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-2"><Button variant="danger" className="!px-2.5 !py-1 text-xs" onClick={remove}>Delete plan</Button><Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => setConfirmDelete(false)}>Cancel</Button></div>
          ) : (
            <Button variant="ghost" className="text-xs text-red-300" onClick={() => setConfirmDelete(true)}><Trash2 size={14} aria-hidden="true" /> Delete</Button>
          )}
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-slate-300"><Target size={15} className="mt-0.5 shrink-0 text-blue-400" aria-hidden="true" />{plan.goal}</p>
        {plan.summary && <p className="mt-3 text-sm leading-relaxed text-slate-400">{plan.summary}</p>}
        {plan.documents?.length > 0 && <p className="mt-3 text-xs text-slate-500">Based on: {plan.documents.map((d) => d.name).join(", ")}</p>}
        <div className="mt-4"><ProgressBar value={progress.percentComplete} label="Plan progress" /><p className="mt-1 text-xs text-slate-500">{progress.completedTasks} of {progress.totalTasks} tasks complete ({progress.percentComplete}%)</p></div>
      </Card>

      <ErrorBanner message={error} />

      {progress.nextActions.length > 0 ? (
        <Card className="mb-5 border-blue-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-white">Next actions</h2>
          <ul className="space-y-1.5 text-sm text-slate-300">
            {progress.nextActions.map((n) => <li key={n.taskId} className="flex gap-2"><span className="text-blue-400">→</span><span>{n.title} <span className="text-xs text-slate-500">(Week {n.weekNumber} · {n.milestone})</span></span></li>)}
          </ul>
        </Card>
      ) : (
        <Card className="mb-5 border-teal-900/60 p-4 text-sm text-teal-200">Every task in this plan is complete.</Card>
      )}

      <div className="space-y-5">
        {plan.milestones.map((m, mi) => (
          <Card key={mi} className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Pill tone="blue">Week {m.weekNumber}</Pill>
              <h2 className="text-sm font-semibold text-white">{m.title}</h2>
            </div>
            {m.description && <p className="mb-3 text-sm text-slate-400">{m.description}</p>}
            <ul className="space-y-2">
              {m.tasks.map((t) => (
                <li key={t._id}>
                  <label htmlFor={`task-${t._id}`} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${t.completed ? "border-teal-900/60 bg-teal-950/20" : "border-slate-800 bg-[#0F1829] hover:border-slate-600"} ${pendingTask === t._id ? "opacity-60" : ""}`}>
                    <input id={`task-${t._id}`} type="checkbox" className="mt-1 h-4 w-4 accent-teal-600" checked={t.completed} disabled={pendingTask === t._id} onChange={() => toggle(t)} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${t.completed ? "text-slate-500 line-through" : "text-slate-100"}`}>{t.title}</span>
                      {t.description && <span className="mt-0.5 block text-xs text-slate-500">{t.description}</span>}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Pill tone={TYPE_TONE[t.type]}>{t.type}</Pill>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500"><Clock size={11} aria-hidden="true" />{t.estimatedMinutes} min</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default KnoviaStudyPlanPage;
