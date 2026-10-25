// client/src/pages/knovia/KnoviaQuizTakePage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { knoviaApi, getErrorMessage } from "../../api/knoviaApi";
import { Card, Button, ErrorBanner, Pill, ProgressBar, Spinner } from "../../components/knovia/ui";

const KnoviaQuizTakePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});   // { [questionIndex]: selectedIndex }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmUnanswered, setConfirmUnanswered] = useState(false);

  useEffect(() => {
    (async () => {
      try { setQuiz((await knoviaApi.getQuiz(id)).quiz); }
      catch (err) { setError(getErrorMessage(err, "Could not load this quiz.")); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <Spinner label="Loading quiz…" />;
  if (!quiz) return <ErrorBanner message={error || "Quiz not found."} />;

  const answered = Object.keys(answers).length;
  const total = quiz.questions.length;

  const submit = async () => {
    if (answered < total && !confirmUnanswered) { setConfirmUnanswered(true); return; }
    setSubmitting(true);
    setError("");
    try {
      const payload = quiz.questions.map((q) => ({ questionIndex: q.index, selectedIndex: answers[q.index] ?? null }));
      const { attempt } = await knoviaApi.submitAttempt(id, payload);
      navigate(`/knovia/quizzes/attempts/${attempt._id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit your answers."));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/knovia/quizzes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} aria-hidden="true" /> All quizzes</Link>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500"><Pill tone="blue">{quiz.difficulty}</Pill><span>{total} questions</span></div>
        <div className="mt-4"><ProgressBar value={(answered / total) * 100} label="Questions answered" /><p className="mt-1 text-xs text-slate-500">{answered} of {total} answered</p></div>
      </div>

      <ErrorBanner message={error} />

      <ol className="space-y-4">
        {quiz.questions.map((q) => (
          <li key={q.index}>
            <Card as="fieldset" className="p-4 sm:p-5">
              <legend className="sr-only">Question {q.index + 1}</legend>
              <div className="mb-3 flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#172338] text-xs font-bold text-slate-300">{q.index + 1}</span>
                <p className="text-sm font-medium leading-relaxed text-white">{q.prompt}</p>
              </div>
              <div className="space-y-2" role="radiogroup" aria-label={`Answers for question ${q.index + 1}`}>
                {q.options.map((opt, oi) => {
                  const checked = answers[q.index] === oi;
                  return (
                    <label key={oi} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${checked ? "border-blue-500 bg-blue-950/30 text-white" : "border-slate-800 bg-[#0F1829] text-slate-300 hover:border-slate-600"}`}>
                      <input type="radio" name={`q-${q.index}`} className="mt-0.5 h-4 w-4 accent-blue-600" checked={checked} onChange={() => { setAnswers((a) => ({ ...a, [q.index]: oi })); setConfirmUnanswered(false); }} />
                      <span><span className="mr-1.5 font-semibold text-slate-500">{String.fromCharCode(65 + oi)}.</span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#0B1220]/95 py-4 backdrop-blur">
        <p className="text-sm text-slate-400" role="status">
          {confirmUnanswered ? `${total - answered} question${total - answered === 1 ? " is" : "s are"} unanswered and will be marked wrong.` : `${answered}/${total} answered`}
        </p>
        <Button onClick={submit} loading={submitting}>{confirmUnanswered ? "Submit anyway" : "Submit answers"}</Button>
      </div>
    </div>
  );
};

export default KnoviaQuizTakePage;
