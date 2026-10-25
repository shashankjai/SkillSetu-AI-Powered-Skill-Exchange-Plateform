// client/src/pages/knovia/KnoviaAttemptPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, RotateCcw } from "lucide-react";
import { knoviaApi, getErrorMessage } from "../../api/knoviaApi";
import { Card, ErrorBanner, Pill, Spinner, formatDate } from "../../components/knovia/ui";

const KnoviaAttemptPage = () => {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try { setAttempt((await knoviaApi.getAttempt(attemptId)).attempt); }
      catch (err) { setError(getErrorMessage(err, "Could not load this result.")); }
      finally { setLoading(false); }
    })();
  }, [attemptId]);

  if (loading) return <Spinner label="Loading result…" />;
  if (!attempt) return <ErrorBanner message={error || "Result not found."} />;

  const tone = attempt.percentage >= 70 ? "text-teal-300" : attempt.percentage >= 40 ? "text-amber-300" : "text-red-300";

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/knovia/quizzes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} aria-hidden="true" /> All quizzes</Link>

      <Card className="mb-6 p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">{formatDate(attempt.createdAt)}</p>
        <h1 className="mt-1 text-lg font-bold text-white">{attempt.quizTitle}</h1>
        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className={`text-4xl font-bold ${tone}`}>{attempt.score}<span className="text-xl text-slate-500">/{attempt.total}</span></p>
          <p className={`pb-1 text-lg font-semibold ${tone}`}>{attempt.percentage}%</p>
          <Link to={`/knovia/quizzes/${attempt.quiz}`} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#172338] px-3 py-1.5 text-sm font-semibold text-slate-200 hover:bg-[#1d2b45]"><RotateCcw size={14} aria-hidden="true" /> Retake</Link>
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-white">Review</h2>
      <ol className="space-y-4">
        {attempt.results.map((r) => {
          const unanswered = r.selectedIndex === null || r.selectedIndex === undefined;
          return (
            <li key={r.questionIndex}>
              <Card className="p-4 sm:p-5">
                <div className="mb-3 flex items-start gap-3">
                  {r.correct ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-teal-400" aria-label="Correct" /> : unanswered ? <MinusCircle size={18} className="mt-0.5 shrink-0 text-slate-500" aria-label="Unanswered" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-red-400" aria-label="Incorrect" />}
                  <p className="text-sm font-medium leading-relaxed text-white">{r.questionIndex + 1}. {r.prompt}</p>
                </div>
                <ul className="space-y-1.5">
                  {r.options.map((opt, oi) => {
                    const isCorrect = oi === r.correctIndex;
                    const isPicked = oi === r.selectedIndex;
                    const cls = isCorrect ? "border-teal-700 bg-teal-950/30 text-teal-100" : isPicked ? "border-red-800 bg-red-950/30 text-red-100" : "border-slate-800 bg-[#0F1829] text-slate-400";
                    return (
                      <li key={oi} className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${cls}`}>
                        <span><span className="mr-1.5 font-semibold opacity-70">{String.fromCharCode(65 + oi)}.</span>{opt}</span>
                        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide">{isCorrect ? "Correct" : isPicked ? "Your answer" : ""}</span>
                      </li>
                    );
                  })}
                </ul>
                {unanswered && <p className="mt-2 text-xs text-slate-500">You didn't answer this question.</p>}
                <div className="mt-3 rounded-lg bg-[#0F1829] px-3 py-2.5 text-sm text-slate-300">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Explanation</p>
                  {r.explanation}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Pill>{r.topic}</Pill>
                    {r.sourceDocument && <span className="text-xs text-slate-500">Source: {r.sourceDocument}{r.sourcePage ? `, page ${r.sourcePage}` : ""}</span>}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default KnoviaAttemptPage;
