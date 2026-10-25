// client/src/pages/knovia/KnoviaOverviewPage.jsx
// Entry point of the workspace. Shows the user's real state and one recommended next step.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, MessageSquareText, ListChecks, CalendarCheck2, LineChart, ArrowRight } from "lucide-react";
import { knoviaApi, getErrorMessage } from "../../api/knoviaApi";
import { Card, PageHeader, ErrorBanner, Spinner } from "../../components/knovia/ui";

const KnoviaOverviewPage = () => {
  const [docs, setDocs] = useState(null);
  const [progress, setProgress] = useState(null);
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [d, pr, pl] = await Promise.all([knoviaApi.listDocuments(), knoviaApi.getProgress(), knoviaApi.listPlans()]);
        setDocs(d.documents);
        setProgress(pr.progress);
        setPlans(pl.plans);
      } catch (err) {
        setError(getErrorMessage(err, "Could not load your workspace."));
      }
    })();
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!docs || !progress || !plans) return <Spinner label="Loading your workspace…" />;

  const ready = docs.filter((d) => d.status === "ready");
  const processing = docs.filter((d) => d.status === "processing");
  const openPlan = plans.find((p) => p.progress.nextActions.length > 0);

  // One recommendation, derived from real state.
  let next;
  if (docs.length === 0) next = { text: "Upload your first PDF to get started.", to: "/knovia/documents", cta: "Upload a PDF" };
  else if (ready.length === 0 && processing.length > 0) next = { text: "Your document is being processed. It will be ready shortly.", to: "/knovia/documents", cta: "View documents" };
  else if (progress.quizzes.attempts === 0) next = { text: "Check what you've learned: generate a quiz from your documents.", to: "/knovia/quizzes", cta: "Create a quiz" };
  else if (openPlan) next = { text: `Next in “${openPlan.title}”: ${openPlan.progress.nextActions[0].title}`, to: `/knovia/study-plans/${openPlan._id}`, cta: "Open plan" };
  else if (plans.length === 0) next = { text: "Turn your goal into a weekly plan.", to: "/knovia/study-plans", cta: "Create a study plan" };
  else next = { text: "Ask a question about your material to keep going.", to: "/knovia/ask", cta: "Ask my PDFs" };

  const tiles = [
    { to: "/knovia/documents", icon: FileText, title: "Study Documents", stat: `${ready.length} ready${processing.length ? `, ${processing.length} processing` : ""}` },
    { to: "/knovia/ask", icon: MessageSquareText, title: "Ask My PDFs", stat: "Answers with page citations" },
    { to: "/knovia/quizzes", icon: ListChecks, title: "AI Quizzes", stat: `${progress.quizzes.attempts} attempt${progress.quizzes.attempts === 1 ? "" : "s"}` },
    { to: "/knovia/study-plans", icon: CalendarCheck2, title: "Study Plans", stat: `${plans.length} plan${plans.length === 1 ? "" : "s"}` },
    { to: "/knovia/progress", icon: LineChart, title: "Learning Progress", stat: progress.quizzes.averagePercentage === null ? "No scores yet" : `${progress.quizzes.averagePercentage}% average` },
  ];

  return (
    <>
      <PageHeader title="Your study workspace" subtitle="Everything here is built from the documents you upload and the work you do." />
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-blue-900/60 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Recommended next step</p>
          <p className="mt-1 text-sm text-slate-100">{next.text}</p>
        </div>
        <Link to={next.to} className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]">{next.cta} <ArrowRight size={15} aria-hidden="true" /></Link>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ to, icon: Icon, title, stat }) => (
          <Link key={to} to={to} className="group rounded-xl border border-slate-800 bg-[#111B2B] p-4 transition hover:border-slate-600">
            <Icon size={20} className="text-blue-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-white">{title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{stat}</p>
          </Link>
        ))}
      </div>
    </>
  );
};

export default KnoviaOverviewPage;
