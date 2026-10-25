// client/src/pages/knovia/KnoviaQuizzesPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListChecks, Trash2, Play, History } from "lucide-react";
import { knoviaApi, getErrorMessage } from "../../api/knoviaApi";
import DocumentPicker from "../../components/knovia/DocumentPicker";
import { Card, PageHeader, Button, EmptyState, ErrorBanner, Field, Pill, Spinner, fieldClass, formatDate } from "../../components/knovia/ui";

const KnoviaQuizzesPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [d, q, a] = await Promise.all([knoviaApi.listDocuments(), knoviaApi.listQuizzes(), knoviaApi.listAttempts()]);
      setDocuments(d.documents);
      setQuizzes(q.quizzes);
      setAttempts(a.attempts);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Could not load quizzes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setError("");
    setGenerating(true);
    try {
      const { quiz } = await knoviaApi.generateQuiz({ documentIds: selected, questionCount: count, difficulty });
      navigate(`/knovia/quizzes/${quiz._id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Could not generate the quiz."));
      setGenerating(false);
    }
  };

  const remove = async (id) => {
    try { await knoviaApi.deleteQuiz(id); setConfirmId(null); await load(); }
    catch (err) { setError(getErrorMessage(err, "Could not delete the quiz.")); }
  };

  if (loading) return <Spinner label="Loading quizzes…" />;
  const hasReady = documents.some((d) => d.status === "ready");

  return (
    <>
      <PageHeader title="AI Quizzes" subtitle="Multiple-choice quizzes written from your own documents. Answers and explanations are revealed after you submit, and scoring happens on the server." />
      <ErrorBanner message={error} />

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Create a quiz</h2>
          {!hasReady ? (
            <EmptyState icon={ListChecks} title="Nothing to quiz yet" body="Upload a PDF and wait for it to be ready." action={<Link to="/knovia/documents" className="text-sm font-semibold text-blue-400 hover:underline">Go to Study Documents</Link>} />
          ) : (
            <div className="space-y-4">
              <Field label={`Documents (${selected.length}/5)`} hint="Pick one or more.">
                <DocumentPicker documents={documents} selected={selected} onChange={setSelected} max={5} idPrefix="quiz" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Questions" htmlFor="q-count">
                  <select id="q-count" className={fieldClass} value={count} onChange={(e) => setCount(Number(e.target.value))}>
                    {[5, 8, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Field>
                <Field label="Difficulty" htmlFor="q-diff">
                  <select id="q-diff" className={fieldClass} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </Field>
              </div>
              <Button className="w-full" onClick={generate} loading={generating} disabled={selected.length === 0}>
                {generating ? "Writing questions…" : "Generate quiz"}
              </Button>
              {generating && <p className="text-xs text-slate-500" role="status">This usually takes 10–30 seconds.</p>}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">Your quizzes</h2>
            {quizzes.length === 0 ? (
              <EmptyState icon={ListChecks} title="No quizzes yet" body="Generate your first quiz from the panel on the left." />
            ) : (
              <ul className="space-y-3">
                {quizzes.map((q) => (
                  <li key={q._id}>
                    <Card className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{q.title}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <Pill tone="blue">{q.difficulty}</Pill>
                            <span>{q.questionCount} questions</span>
                            <span>· {formatDate(q.createdAt)}</span>
                            <span>· {q.attempts} attempt{q.attempts === 1 ? "" : "s"}</span>
                            {q.bestPercentage !== null && <span>· best {q.bestPercentage}%</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {confirmId === q._id ? (
                            <>
                              <Button variant="danger" className="!px-2.5 !py-1 text-xs" onClick={() => remove(q._id)}>Delete</Button>
                              <Button variant="ghost" className="!px-2.5 !py-1 text-xs" onClick={() => setConfirmId(null)}>Cancel</Button>
                            </>
                          ) : (
                            <>
                              <Link to={`/knovia/quizzes/${q._id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"><Play size={13} aria-hidden="true" />{q.attempts ? "Retake" : "Start"}</Link>
                              <button onClick={() => setConfirmId(q._id)} aria-label={`Delete ${q.title}`} className="p-2 text-slate-500 hover:text-red-300"><Trash2 size={15} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><History size={15} aria-hidden="true" /> Attempt history</h2>
            {attempts.length === 0 ? (
              <p className="text-sm text-slate-500">No attempts yet. Your scores will be listed here.</p>
            ) : (
              <Card as="div" className="divide-y divide-slate-800">
                {attempts.slice(0, 15).map((a) => (
                  <Link key={a._id} to={`/knovia/quizzes/attempts/${a._id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-[#172338]">
                    <span className="min-w-0 truncate text-slate-200">{a.quizTitle}</span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                      {formatDate(a.createdAt)}
                      <span className={`font-semibold ${a.percentage >= 70 ? "text-teal-300" : a.percentage >= 40 ? "text-amber-300" : "text-red-300"}`}>{a.score}/{a.total} · {a.percentage}%</span>
                    </span>
                  </Link>
                ))}
              </Card>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default KnoviaQuizzesPage;
