// client/src/pages/knovia/KnoviaStudyPlansPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarCheck2, Compass } from "lucide-react";
import { knoviaApi, getErrorMessage } from "../../api/knoviaApi";
import DocumentPicker from "../../components/knovia/DocumentPicker";
import { Card, PageHeader, Button, EmptyState, ErrorBanner, Field, Pill, ProgressBar, Spinner, fieldClass, formatDate } from "../../components/knovia/ui";

const KnoviaStudyPlansPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState({ subject: "", goal: "", level: "beginner", hoursPerWeek: 5, weeks: 4 });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([knoviaApi.listPlans(), knoviaApi.listDocuments()]);
      setPlans(p.plans);
      setDocuments(d.documents);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load study plans."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.subject.trim() && form.goal.trim() && form.hoursPerWeek >= 1 && form.weeks >= 1;

  const generate = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setGenerating(true);
    setError("");
    try {
      const { plan } = await knoviaApi.generatePlan({
        subject: form.subject.trim(), goal: form.goal.trim(), level: form.level,
        hoursPerWeek: Number(form.hoursPerWeek), weeks: Number(form.weeks), documentIds: selected,
      });
      navigate(`/knovia/study-plans/${plan._id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not generate the study plan."));
      setGenerating(false);
    }
  };

  if (loading) return <Spinner label="Loading study plans…" />;

  return (
    <>
      <PageHeader
        title="Study Plans"
        subtitle="Turn a goal and your available time into weekly tasks you can tick off. Attach documents and the plan will follow their actual content."
        actions={<Link to="/learning-roadmap" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><Compass size={15} aria-hidden="true" /> Looking for skill roadmaps?</Link>}
      />
      <ErrorBanner message={error} />

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Create a plan</h2>
          <form onSubmit={generate} className="space-y-4">
            <Field label="Subject" htmlFor="sp-subject"><input id="sp-subject" className={fieldClass} maxLength={120} value={form.subject} onChange={set("subject")} placeholder="e.g. Cell biology" required /></Field>
            <Field label="Goal" htmlFor="sp-goal"><textarea id="sp-goal" rows={3} className={fieldClass} maxLength={600} value={form.goal} onChange={set("goal")} placeholder="e.g. Be ready for my midterm on chapters 1–3" required /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Level" htmlFor="sp-level">
                <select id="sp-level" className={fieldClass} value={form.level} onChange={set("level")}>
                  <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                </select>
              </Field>
              <Field label="Hours / wk" htmlFor="sp-hours"><input id="sp-hours" type="number" min={1} max={60} className={fieldClass} value={form.hoursPerWeek} onChange={set("hoursPerWeek")} /></Field>
              <Field label="Weeks" htmlFor="sp-weeks"><input id="sp-weeks" type="number" min={1} max={26} className={fieldClass} value={form.weeks} onChange={set("weeks")} /></Field>
            </div>
            <Field label={`Study documents (optional, ${selected.length}/5)`} hint="Without documents, the plan is based on your subject and goal only.">
              <DocumentPicker documents={documents} selected={selected} onChange={setSelected} max={5} idPrefix="plan" />
            </Field>
            <Button type="submit" className="w-full" loading={generating} disabled={!valid}>{generating ? "Building your plan…" : "Generate plan"}</Button>
          </form>
        </Card>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-white">Your plans</h2>
          {plans.length === 0 ? (
            <EmptyState icon={CalendarCheck2} title="No study plans yet" body="Describe what you want to learn and how much time you have; the plan appears here." />
          ) : (
            <ul className="space-y-3">
              {plans.map((p) => (
                <li key={p._id}>
                  <Link to={`/knovia/study-plans/${p._id}`} className="block rounded-xl border border-slate-800 bg-[#111B2B] p-4 transition hover:border-slate-600">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{p.title}</p>
                      <Pill tone={p.progress.percentComplete === 100 ? "teal" : "blue"}>{p.progress.percentComplete}% complete</Pill>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{p.subject} · {p.weeks} weeks · {p.hoursPerWeek} h/week · created {formatDate(p.createdAt)}</p>
                    <div className="mt-3"><ProgressBar value={p.progress.percentComplete} label={`${p.title} progress`} /></div>
                    <p className="mt-1.5 text-xs text-slate-500">{p.progress.completedTasks} of {p.progress.totalTasks} tasks done</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
};

export default KnoviaStudyPlansPage;
