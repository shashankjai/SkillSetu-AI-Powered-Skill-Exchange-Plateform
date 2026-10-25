// client/src/pages/RoadmapPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import Background from "../components/background/Background";
import Footer from "../components/footer/Footer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Compass,
  Sparkles,
  Clock,
  Target,
  BookOpen,
  CheckCircle2,
  Circle,
  Trash2,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  GraduationCap,
  FileText,
  Check,
  BrainCircuit,
  ListCheck,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const LOADING_TIPS = [
  "Analyzing prerequisite concepts and mental models...",
  "Sequencing curriculum phases by foundational dependency...",
  "Budgeting study hours across exercises and projects...",
  "Architecting real-world capstone project deliverables...",
  "Curating self-assessment criteria and recommended resources...",
];

const RoadmapPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Form Inputs
  const initialSkill = searchParams.get("skill") || "";
  const [targetSkill, setTargetSkill] = useState(initialSkill);
  const [currentLevel, setCurrentLevel] = useState("beginner");
  const [studyTime, setStudyTime] = useState("5 hours/week");
  const [learningGoal, setLearningGoal] = useState("");
  const [existingKnowledge, setExistingKnowledge] = useState("");

  // Search Filter for Saved Roadmaps
  const [searchFilter, setSearchFilter] = useState("");

  // Loading & Data State
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [currentRoadmap, setCurrentRoadmap] = useState(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Accordion State for Phases
  const [expandedPhases, setExpandedPhases] = useState({});
  const [activePhase, setActivePhase] = useState(0); // the phase shown in the detail panel

  // Topic Checkmarks Tracking State: map of "phaseIdx-topicIdx" -> boolean
  const [completedTopics, setCompletedTopics] = useState({});

  const token = localStorage.getItem("token");

  // Tip cycle interval during loading
  useEffect(() => {
    let interval;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Fetch saved roadmaps on mount
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchSavedRoadmaps();
  }, [token, navigate]);

  const fetchSavedRoadmaps = async () => {
    setIsLoadingSaved(true);
    try {
      const res = await axios.get(`${API_URL}/api/roadmaps`, {
        headers: { "x-auth-token": token },
      });
      setSavedRoadmaps(res.data);
      if (res.data.length > 0 && !currentRoadmap && !initialSkill) {
        selectRoadmap(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to load saved roadmaps:", err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const selectRoadmap = (roadmap) => {
    setCurrentRoadmap(roadmap);
    // Open only the first phase: with every phase open the page ran far down the screen
    const firstOnly = {};
    roadmap.phases?.forEach((_, i) => (firstOnly[i] = i === 0));
    setExpandedPhases(firstOnly);
    setActivePhase(0);
    setCompletedTopics({});
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!targetSkill.trim()) {
      toast.error("Please enter a target skill");
      return;
    }

    setIsGenerating(true);
    setLoadingTipIndex(0);

    try {
      const res = await axios.post(
        `${API_URL}/api/roadmaps/generate`,
        {
          targetSkill: targetSkill.trim(),
          currentLevel,
          studyTime,
          learningGoal: learningGoal.trim(),
          existingKnowledge: existingKnowledge.trim(),
        },
        {
          headers: { "x-auth-token": token },
        }
      );

      selectRoadmap(res.data);
      // Prepend to saved list
      setSavedRoadmaps((prev) => [res.data, ...prev]);

      toast.success("AI Learning Roadmap generated successfully!", {
        style: {
          background: "linear-gradient(135deg, #16a34a, #15803d)",
          color: "#fff",
          borderRadius: "14px",
          fontWeight: 700,
        },
      });
    } catch (err) {
      console.error("Roadmap generation failed:", err);
      toast.error(
        err.response?.data?.msg || "Failed to generate roadmap. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteRoadmap = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved roadmap?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/api/roadmaps/${id}`, {
        headers: { "x-auth-token": token },
      });

      const updated = savedRoadmaps.filter((r) => r._id !== id);
      setSavedRoadmaps(updated);

      if (currentRoadmap?._id === id) {
        if (updated.length > 0) {
          selectRoadmap(updated[0]);
        } else {
          setCurrentRoadmap(null);
        }
      }
      toast.info("Roadmap deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete roadmap");
    }
  };

  const togglePhase = (index) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [index]: !(prev[index] ?? index === 0),
    }));
  };

  const toggleAllPhases = (expand) => {
    if (!currentRoadmap?.phases) return;
    const newState = {};
    currentRoadmap.phases.forEach((_, i) => {
      newState[i] = expand;
    });
    setExpandedPhases(newState);
  };

  const toggleTopicCheck = (phaseIdx, topicIdx) => {
    const key = `${phaseIdx}-${topicIdx}`;
    setCompletedTopics((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filtered saved roadmaps
  const filteredSaved = useMemo(() => {
    if (!searchFilter.trim()) return savedRoadmaps;
    const q = searchFilter.toLowerCase();
    return savedRoadmaps.filter(
      (r) =>
        r.targetSkill?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.currentLevel?.toLowerCase().includes(q)
    );
  }, [savedRoadmaps, searchFilter]);

  // Total topics count & completion percentage
  const { totalTopicsCount, completedTopicsCount, progressPercentage } =
    useMemo(() => {
      if (!currentRoadmap?.phases)
        return { totalTopicsCount: 0, completedTopicsCount: 0, progressPercentage: 0 };

      let total = 0;
      let completed = 0;

      currentRoadmap.phases.forEach((phase, pIdx) => {
        phase.topics?.forEach((_, tIdx) => {
          total++;
          if (completedTopics[`${pIdx}-${tIdx}`]) {
            completed++;
          }
        });
      });

      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { totalTopicsCount: total, completedTopicsCount: completed, progressPercentage: pct };
    }, [currentRoadmap, completedTopics]);

  return (
    <div className="min-h-dvh relative bg-[#FFFEFC] text-slate-900 font-sans">
      <Background />
      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          {/* Header Banner */}
          <div className="mb-8 rounded-2xl border border-slate-300 bg-white p-6 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)] md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 border border-slate-300">
                    <Compass size={20} />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 font-mono">
                    AI Curriculum Architect
                  </p>
                </div>
                <h1 className="mt-3 text-3xl font-black text-slate-900 md:text-5xl tracking-tight">
                  Personalized Learning Roadmap
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-700 md:text-base leading-relaxed">
                  Generate structured, prerequisite-ordered learning paths tailored to your experience level, available study hours, and specific goals.
                </p>
              </div>

              {currentRoadmap && (
                <div className="flex items-center gap-3 self-end">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 transition hover:bg-slate-900/[0.06]"
                  >
                    <FileText size={14} />
                    Export / Print
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {/* Left Column: Generator Form & Saved List */}
            <div className="grid items-stretch gap-6 lg:grid-cols-2">
              {/* Generator Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-teal-700" />
                    <h2 className="text-lg font-bold text-slate-900">
                      Architect Your Roadmap
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    AI Powered
                  </span>
                </div>

                <form onSubmit={handleGenerate} className="grid gap-4 sm:grid-cols-2">
                  {/* Target Skill */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Target Skill / Technology *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. React.js, Python, Docker, Machine Learning"
                        value={targetSkill}
                        onChange={(e) => setTargetSkill(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-[#FFFEFC] px-4 py-3 text-sm text-slate-900 placeholder-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                    </div>
                  </div>

                  {/* Current Level */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Current Experience Level *
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {["beginner", "intermediate", "advanced"].map((lvl) => (
                        <button
                          type="button"
                          key={lvl}
                          onClick={() => setCurrentLevel(lvl)}
                          className={`rounded-xl border py-2.5 text-xs font-bold capitalize transition ${
                            currentLevel === lvl
                              ? "border-slate-300 bg-slate-800 text-white shadow-md shadow-slate-900/10"
                              : "border-slate-200 bg-[#FFFEFC]/80 text-slate-600 hover:border-slate-200 hover:text-slate-900"
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Study Time */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Weekly Study Commitment *
                    </label>
                    <select
                      value={studyTime}
                      onChange={(e) => setStudyTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-[#FFFEFC] px-4 py-3 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    >
                      <option value="3-5 hours/week">3 - 5 hours / week (Casual pace)</option>
                      <option value="5-10 hours/week">5 - 10 hours / week (Standard pace)</option>
                      <option value="10-15 hours/week">10 - 15 hours / week (Focused learning)</option>
                      <option value="20+ hours/week">20+ hours / week (Intensive bootcamp)</option>
                    </select>
                  </div>

                  {/* Optional Goal */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Target Outcome / Goal (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pass technical SDE interview, build a SaaS MVP"
                      value={learningGoal}
                      onChange={(e) => setLearningGoal(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-[#FFFEFC] px-4 py-3 text-sm text-slate-900 placeholder-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>

                  {/* Optional Existing Knowledge */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Known Prerequisites / Skills (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Basic HTML/CSS, Python syntax, Git basics"
                      value={existingKnowledge}
                      onChange={(e) => setExistingKnowledge(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-[#FFFEFC] px-4 py-3 text-sm text-slate-900 placeholder-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
                  >
                    {isGenerating ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Architecting Curriculum...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Generate AI Roadmap
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Saved Roadmaps List Card */}
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-teal-700" />
                    <h3 className="text-base font-bold text-slate-900">
                      Saved Roadmaps ({savedRoadmaps.length})
                    </h3>
                  </div>
                  <button
                    onClick={fetchSavedRoadmaps}
                    title="Refresh saved roadmaps"
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>

                {/* Filter Search Input */}
                {savedRoadmaps.length > 3 && (
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter saved roadmaps..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-[#FFFEFC] py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-500 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                )}

                {isLoadingSaved ? (
                  <div className="py-6 text-center text-xs text-slate-600">
                    Loading saved roadmaps...
                  </div>
                ) : filteredSaved.length > 0 ? (
                  <div className="max-h-[22rem] flex-1 space-y-2 overflow-y-auto pr-1">
                    {filteredSaved.map((r) => {
                      const isSelected = currentRoadmap?._id === r._id;
                      return (
                        <div
                          key={r._id}
                          onClick={() => selectRoadmap(r)}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                            isSelected
                              ? "border-slate-300 bg-slate-100 text-slate-900 shadow-md shadow-slate-900/10"
                              : "border-slate-200 bg-[#FFFEFC]/60 text-slate-700 hover:border-slate-200 hover:bg-white"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="truncate text-sm font-bold text-slate-900">
                                {r.targetSkill}
                              </h4>
                              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                                {r.currentLevel}
                              </span>
                            </div>
                            <p className="truncate text-xs text-slate-600 mt-0.5">
                              {r.studyTime} {r.learningGoal ? `• ${r.learningGoal}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteRoadmap(r._id, e)}
                            className="ml-2 shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-600 transition"
                            title="Delete roadmap"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-6 text-center text-xs text-slate-500">
                    {searchFilter ? "No roadmaps match your search." : "No saved roadmaps yet. Generate your first one above!"}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Active Roadmap Display */}
            <div className="min-w-0">
              {isGenerating ? (
                /* Skeleton Loader State */
                <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-6 w-32 animate-pulse rounded-full bg-slate-100" />
                  </div>
                  <div className="h-10 w-3/4 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-16 w-full animate-pulse rounded-xl bg-slate-100/60" />

                  <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                      <BrainCircuit className="animate-spin" size={20} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      AI Architect in Progress
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {LOADING_TIPS[loadingTipIndex]}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-24 w-full animate-pulse rounded-2xl bg-slate-100/40 border border-slate-200"
                      />
                    ))}
                  </div>
                </div>
              ) : currentRoadmap ? (
                <div className="space-y-6">
                  {/* Roadmap Overview Card */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">
                        {currentRoadmap.currentLevel} Level
                      </span>
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700">
                        <Clock size={12} className="mr-1 inline text-teal-700" />
                        {currentRoadmap.studyTime}
                      </span>
                      {currentRoadmap.learningGoal && (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-sm font-medium text-emerald-700">
                          <Target size={12} className="mr-1 inline text-emerald-600" />
                          {currentRoadmap.learningGoal}
                        </span>
                      )}
                      {currentRoadmap.existingKnowledge && (
                        <span className="rounded-full bg-slate-100 border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700">
                          <GraduationCap size={12} className="mr-1 inline text-teal-700" />
                          Prereqs: {currentRoadmap.existingKnowledge}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 md:text-3xl tracking-tight">
                      {currentRoadmap.title}
                    </h2>

                    {currentRoadmap.summary && (
                      <p className="mt-3 text-base leading-relaxed text-slate-700 border-l-2 border-slate-300 pl-3">
                        {currentRoadmap.summary}
                      </p>
                    )}

                    {/* Interactive Topic Progress Tracker */}
                    {totalTopicsCount > 0 && (
                      <div className="mt-6 rounded-2xl border border-slate-200 bg-[#FFFEFC] p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ListCheck size={16} className="text-teal-700" />
                            <span className="text-sm font-semibold text-slate-900">
                              Topic Mastery Tracker
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-700">
                            {completedTopicsCount} / {totalTopicsCount} topics ({progressPercentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-teal-700 transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Phase explorer: navigator on the left, ONE phase at a time on the right (no endless scrolling) */}
                  <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                    <nav aria-label="Roadmap phases" className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24">
                      <h3 className="mb-3 flex items-center gap-2 px-1 text-sm font-semibold text-slate-700">
                        <Layers size={14} /> Curriculum ({currentRoadmap.phases?.length || 0} phases)
                      </h3>
                      <ol className="relative space-y-1.5">
                        {currentRoadmap.phases?.map((ph, i) => {
                          const total = (ph.topics || []).length;
                          const done = (ph.topics || []).filter((_, t) => completedTopics[`${i}-${t}`]).length;
                          const pct = total ? Math.round((done / total) * 100) : 0;
                          const on = i === activePhase;
                          return (
                            <li key={`nav-${i}`}>
                              <button
                                type="button"
                                onClick={() => setActivePhase(i)}
                                aria-current={on ? "step" : undefined}
                                className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                                  on ? "border-teal-700 bg-slate-100" : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                                }`}
                              >
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${on ? "bg-teal-700 text-white" : pct === 100 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"}`}>
                                  {pct === 100 ? <Check size={15} /> : ph.phaseNumber || i + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-base font-semibold text-slate-900">{ph.title}</span>
                                  <span className="mt-1 block text-sm text-slate-600">{ph.duration}</span>
                                  <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-slate-200">
                                    <span className="block h-full rounded-full bg-teal-700 transition-all duration-500" style={{ width: `${pct}%` }} />
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                      <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4">
                        <button
                          type="button"
                          disabled={activePhase === 0}
                          onClick={() => setActivePhase((x) => Math.max(0, x - 1))}
                          className="flex-1 rounded-full border border-slate-200 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-700 hover:text-teal-700 disabled:opacity-40"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={activePhase >= (currentRoadmap.phases?.length || 1) - 1}
                          onClick={() => setActivePhase((x) => Math.min((currentRoadmap.phases?.length || 1) - 1, x + 1))}
                          className="flex-1 rounded-full bg-slate-900 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-40"
                        >
                          Next phase
                        </button>
                      </div>
                    </nav>

                    <div key={`detail-${currentRoadmap._id}-${activePhase}`} className="page-in min-w-0 space-y-4">
                    {currentRoadmap.phases?.map((phase, pIdx) => {
                      const isExpanded = pIdx === activePhase;
                      const doneInPhase = (phase.topics || []).filter((_, tIdx) => completedTopics[`${pIdx}-${tIdx}`]).length;

                      if (!isExpanded) return null;
                      return (
                        <div
                          key={`phase-${pIdx}`}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-teal-700"
                        >
                          {/* Phase Header (Accordion Toggle) */}
                          <button
                            type="button"
                            className="flex w-full cursor-default items-center justify-between gap-4 px-5 py-5 text-left md:px-6"
                          >
                            <div className="flex items-center gap-4">
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-blue-50 text-lg font-semibold text-slate-800">
                                {phase.phaseNumber || pIdx + 1}
                              </span>
                              <div>
                                <h4 className="text-lg font-semibold leading-snug text-slate-900 md:text-xl">
                                  {phase.title}
                                </h4>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="text-sm text-slate-600">{phase.duration}</span>
                                  {(phase.topics || []).length > 0 && (
                                    <span className="text-sm text-slate-500">
                                      {doneInPhase}/{phase.topics.length} topics
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="shrink-0 text-xs font-medium text-slate-500 md:text-sm">Phase {phase.phaseNumber || pIdx + 1} of {currentRoadmap.phases.length}</span>
                          </button>

                          {/* Phase Detail Content */}
                          {isExpanded && (
                            <div className="grid gap-x-7 gap-y-6 border-t border-slate-200 bg-slate-50/50 p-5 md:grid-cols-2 md:p-7">
                              {/* Learning Objectives */}
                              {phase.learningObjectives?.length > 0 && (
                                <div>
                                  <h5 className="mb-3 text-base font-semibold text-slate-900">Learning objectives</h5>
                                  <ul className="space-y-2 pl-5">
                                    {phase.learningObjectives.map((obj, oIdx) => (
                                      <li
                                        key={`obj-${oIdx}`}
                                        className="list-item list-disc pl-1 text-base leading-relaxed text-slate-700 marker:text-blue-600"
                                      >
                                        {obj}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Core Topics with Checkboxes */}
                              {phase.topics?.length > 0 && (
                                <div className="md:col-span-2">
                                  <h5 className="mb-3 text-base font-semibold text-slate-900">Topics and subtopics</h5>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    {phase.topics.map((topic, tIdx) => {
                                      const isChecked = completedTopics[`${pIdx}-${tIdx}`];
                                      return (
                                        <div
                                          key={`topic-${tIdx}`}
                                          onClick={() => toggleTopicCheck(pIdx, tIdx)}
                                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm leading-relaxed transition ${
                                            isChecked
                                              ? "border-emerald-500/40 bg-emerald-50 text-emerald-700"
                                              : "border-slate-200 bg-white/60 text-slate-900 hover:border-slate-200"
                                          }`}
                                        >
                                          <button type="button" className="mt-0.5 shrink-0">
                                            {isChecked ? (
                                              <CheckCircle2 size={15} className="text-emerald-600" />
                                            ) : (
                                              <Circle size={15} className="text-slate-500" />
                                            )}
                                          </button>
                                          <span className={isChecked ? "line-through text-slate-600" : ""}>
                                            {topic}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Practical Exercises & Coding Questions */}
                              {(phase.practicalExercises?.length > 0 || phase.codingQuestions?.length > 0) && (
                                <div>
                                  <h5 className="mb-3 text-base font-semibold text-slate-900">Practice and coding challenges</h5>
                                  <div className="space-y-2">
                                    {phase.practicalExercises?.map((ex, eIdx) => (
                                      <div
                                        key={`ex-${eIdx}`}
                                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700"
                                      >
                                        <strong className="font-semibold text-slate-900">Practice:</strong> {ex}
                                      </div>
                                    ))}
                                    {phase.codingQuestions?.map((q, qIdx) => (
                                      <div
                                        key={`cq-${qIdx}`}
                                        className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700"
                                      >
                                        <strong className="font-semibold text-slate-900">Coding question:</strong> {q}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Suggested Projects */}
                              {phase.suggestedProjects?.length > 0 && (
                                <div>
                                  <h5 className="mb-3 text-base font-semibold text-slate-900">Phase project</h5>
                                  {phase.suggestedProjects.map((proj, prIdx) => (
                                    <div
                                      key={`proj-${prIdx}`}
                                      className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-relaxed text-slate-700"
                                    >
                                      <strong className="font-semibold text-slate-900">Project:</strong> {proj}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Checkpoint Criteria */}
                              {phase.checkpointCriteria?.length > 0 && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                                  <h5 className="mb-3 text-base font-semibold text-emerald-800">Readiness checkpoint</h5>
                                  <ul className="space-y-2 pl-5">
                                    {phase.checkpointCriteria.map((chk, cIdx) => (
                                      <li key={`chk-${cIdx}`} className="list-item list-disc pl-1 text-sm leading-relaxed text-emerald-800 marker:text-emerald-600">
                                        {chk}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Recommended Resources */}
                              {phase.recommendedResources?.length > 0 && (
                                <div>
                                  <h5 className="mb-3 text-base font-semibold text-slate-900">Recommended resources</h5>
                                  <ul className="space-y-2 pl-5">
                                    {phase.recommendedResources.map((res, rIdx) => (
                                      <li key={`res-${rIdx}`} className="list-item list-disc pl-1 text-sm leading-relaxed text-slate-700 marker:text-blue-600">
                                        {res}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>

                  {/* Comprehensive Capstone Project & Mastery Section */}
                  {currentRoadmap.capstoneProject?.title || currentRoadmap.finalMilestone ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl md:p-8 space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                        <Award size={32} className="shrink-0 text-teal-700" />
                        <div>
                          <p className="text-sm font-semibold text-teal-700">
                            Capstone & Mastery Strategy
                          </p>
                          <h3 className="text-xl font-black text-slate-900">
                            {currentRoadmap.capstoneProject?.title || "Real-World Capstone Milestone"}
                          </h3>
                        </div>
                      </div>

                      {currentRoadmap.capstoneProject?.description && (
                        <p className="text-base leading-relaxed text-slate-700">
                          {currentRoadmap.capstoneProject.description}
                        </p>
                      )}

                      {/* Capstone Deliverables */}
                      {currentRoadmap.capstoneProject?.deliverables?.length > 0 && (
                        <div>
                          <h4 className="mb-3 text-base font-semibold text-slate-900">
                            Capstone Deliverables
                          </h4>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {currentRoadmap.capstoneProject.deliverables.map((del, dIdx) => (
                              <div
                                key={`del-${dIdx}`}
                                className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700"
                              >
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal-700" />
                                <span>{del}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Self-Assessment & Revision Plan */}
                      <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-200">
                        {currentRoadmap.selfAssessmentChecklist?.length > 0 && (
                          <div>
                            <h4 className="mb-3 text-base font-semibold text-slate-900">
                              Self-Assessment Checklist
                            </h4>
                            <ul className="space-y-1.5">
                              {currentRoadmap.selfAssessmentChecklist.map((item, iIdx) => (
                                <li key={`sa-${iIdx}`} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                                  <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentRoadmap.revisionPlan?.length > 0 && (
                          <div>
                            <h4 className="mb-3 text-base font-semibold text-slate-900">
                              Revision & Retention Strategy
                            </h4>
                            <ul className="space-y-1.5">
                              {currentRoadmap.revisionPlan.map((rev, rIdx) => (
                                <li key={`rev-${rIdx}`} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                                  <RotateCcw size={13} className="mt-0.5 shrink-0 text-teal-700" />
                                  <span>{rev}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Next Recommended Step */}
                      {currentRoadmap.nextRecommendedStep && (
                        <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4">
                          <p className="text-sm font-semibold text-slate-700">
                            Next Recommended Action
                          </p>
                          <p className="mt-1 text-base leading-relaxed text-slate-900">
                            {currentRoadmap.nextRecommendedStep}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                /* Empty Selection State */
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/40 p-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 border border-slate-300">
                    <Compass size={36} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">No Roadmap Selected</h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
                    Fill out the parameters on the left to design a customized, AI-driven learning curriculum matching your exact goals and experience level.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
      <ToastContainer position="top-right" />
    </div>
  );
};

export default RoadmapPage;
