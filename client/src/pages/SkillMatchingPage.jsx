// client/src/pages/SkillMatchingPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import Background from "../components/background/Background";
import Footer from "../components/footer/Footer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Search,
  Star,
  Clock,
  User,
  Sparkles,
  Compass,
  Calendar,
  Send,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const SkillMatchingPage = () => {
  const [matches, setMatches] = useState([]);
  const [ratings, setRatings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionDetails, setSessionDetails] = useState({});
  const navigate = useNavigate();
  const [errorMessages, setErrorMessages] = useState({});

  const fetchMatches = useCallback(async () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      navigate("/login");
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await axios.get(`${API_URL}/api/matches`, {
        headers: { "x-auth-token": token },
      });

      setMatches(response.data);

      const ratingsPromises = response.data.map(async (match) => {
        const userId = match.user._id;
        try {
          const ratingResponse = await axios.get(
            `${API_URL}/api/sessions/ratings/${userId}`,
            {
              headers: { "x-auth-token": token },
            }
          );
          return { userId, averageRating: ratingResponse.data.averageRating };
        } catch {
          return { userId, averageRating: "N/A" };
        }
      });

      const ratingsData = await Promise.all(ratingsPromises);
      const ratingsMap = ratingsData.reduce(
        (acc, { userId, averageRating }) => {
          acc[userId] = averageRating;
          return acc;
        },
        {}
      );
      setRatings(ratingsMap);
    } catch (err) {
      console.error("Error fetching matches:", err);
      setFetchError(
        err.response?.data?.msg || "Failed to load skill matches. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const sendSessionRequest = async (userId) => {
    const token = localStorage.getItem("token");
    const { date, time } = sessionDetails[userId] || {};
    const skill = matches.find(
      (match) => match.user._id === userId
    )?.teachSkill;

    const newErrorMessages = { ...errorMessages };
    newErrorMessages[userId] = {};

    if (!date) {
      newErrorMessages[userId].date = "Please select a date";
    } else {
      const today = new Date();
      const selectedDate = new Date(date + "T00:00:00");
      if (selectedDate < today.setHours(0, 0, 0, 0)) {
        newErrorMessages[userId].date = "Selected date is in the past";
      }
    }

    if (!time) {
      newErrorMessages[userId].time = "Please select a time";
    } else {
      const today = new Date();
      const selectedDate = new Date(date + "T00:00:00");
      if (
        selectedDate.getTime() === today.setHours(0, 0, 0, 0) &&
        time &&
        new Date(`${date}T${time}`).getTime() < Date.now()
      ) {
        newErrorMessages[userId].time = "Selected time is in the past";
      }
    }

    setErrorMessages(newErrorMessages);

    if (newErrorMessages[userId]?.date || newErrorMessages[userId]?.time) {
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/sessions/request`,
        { userId2: userId, sessionDate: date, sessionTime: time, skill },
        { headers: { "x-auth-token": token } }
      );

      await axios.post(
        `${API_URL}/api/notifications/send`,
        {
          userId,
          message: `You have a new session request for ${skill} on ${date} at ${time}`,
          type: "session_request",
        },
        { headers: { "x-auth-token": token } }
      );

      toast.success("Session request sent successfully!", {
        style: {
          background: "linear-gradient(135deg, #16a34a, #15803d)",
          color: "#fff",
          borderRadius: "14px",
          fontWeight: 700,
        },
      });
    } catch (err) {
      console.error("Error sending session request:", err);
      toast.error("Error sending session request. Please try again.");
    }
  };

  const filteredMatches = matches.filter(
    (match) =>
      match.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.teachSkill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-dvh relative bg-[#FFFEFC] text-slate-900 flex flex-col font-sans">
      <Background />
      <Navbar />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 md:px-8 z-10 space-y-8">
        {/* Header Banner */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Peer Discovery
              </span>
              <h1 className="text-2xl font-black text-slate-900 sm:text-4xl mt-1 tracking-tight">
                Skill Matching & Exchange
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                Connect with peers who teach what you want to learn. Schedule live 1-on-1 sessions, generate customized roadmaps, and exchange expertise.
              </p>
            </div>
            <button
              onClick={fetchMatches}
              className="self-start sm:self-center flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200 hover:text-slate-900 transition"
              title="Refresh matches"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin text-teal-700" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-lg mx-auto">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search matches by user name or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500 transition"
          />
        </div>

        {/* Matches Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            // Skeleton Loader
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`skel-${idx}`}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-20 rounded-xl bg-slate-100/60" />
                <div className="h-10 rounded-xl bg-slate-100" />
              </div>
            ))
          ) : fetchError ? (
            <div className="col-span-full rounded-2xl border border-red-500/20 bg-red-50 p-8 text-center text-red-700 space-y-3">
              <p className="text-sm font-semibold">{fetchError}</p>
              <button
                onClick={fetchMatches}
                className="rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 transition active:scale-[0.97]"
              >
                Retry Loading
              </button>
            </div>
          ) : filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <div
                key={`${match.user._id}-${match.teachSkill}`}
                className="card-fx flex flex-col justify-between bg-white p-5"
              >
                <div className="space-y-4">
                  {/* Match Header: avatar, name with rating next to it, status */}
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img
                        src={
                          match.user?.profilePicture
                            ? `${API_URL}/uploads/profile-pictures/${match.user.profilePicture}`
                            : "/default-avatar.png"
                        }
                        alt={match.user.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop";
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 className="truncate text-base font-bold text-slate-900">{match.user.name}</h3>
                        {(() => {
                          const value = ratings[match.user._id];
                          const rated = value && value !== "N/A" && Number(value) > 0;
                          return rated ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
                              title="Average rating from completed sessions"
                            >
                              <Star size={12} className="fill-amber-400 text-amber-500" aria-hidden="true" />
                              {Number(value).toFixed(1)}
                            </span>
                          ) : (
                            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500" title="No ratings yet">
                              New
                            </span>
                          );
                        })()}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-600">{match.user.status || "Active member"}</p>
                    </div>
                  </div>

                  {/* What they teach / what you learn */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-900">
                      Teaches <span className="text-teal-700">{match.teachSkill}</span>
                    </span>
                    {match.learnSkill && match.learnSkill !== match.teachSkill && (
                      <span className="rounded-full border border-slate-200 px-2.5 py-1 font-medium text-slate-600">
                        Matches your goal: {match.learnSkill}
                      </span>
                    )}
                  </div>

                  {/* Compatibility bar */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-mono uppercase tracking-[0.14em] text-slate-500">Compatibility</span>
                      <span className="font-bold text-teal-700">{match.score || "90%+"}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round((match.compatibilityScore || 0.9) * 100)} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-teal-700" style={{ width: `${Math.round((match.compatibilityScore || 0.9) * 100)}%` }} />
                    </div>
                  </div>

                  {/* AI explanation */}
                  {match.explanation && (
                    <p className="rounded-xl border border-slate-200 bg-slate-100 p-3 text-xs leading-relaxed text-slate-700">
                      <span className="font-semibold text-slate-900">Why matched: </span>
                      {match.explanation}
                    </p>
                  )}

                  {/* Direct Link to Roadmap */}
                  <Link
                    to={`/learning-roadmap?skill=${encodeURIComponent(match.teachSkill)}`}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                  >
                    <Compass size={14} />
                    Generate AI Roadmap for {match.teachSkill}
                  </Link>
                </div>

                {/* Session Scheduling Form */}
                <div className="mt-5 pt-4 border-t border-slate-200 space-y-2.5">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Request 1-on-1 Session
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="date"
                        value={sessionDetails[match.user._id]?.date || ""}
                        onChange={(e) =>
                          setSessionDetails((prev) => ({
                            ...prev,
                            [match.user._id]: {
                              ...(prev[match.user._id] || {}),
                              date: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-[#FFFEFC] px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                      />
                      {errorMessages[match.user._id]?.date && (
                        <p className="mt-0.5 text-[10px] text-red-600">
                          {errorMessages[match.user._id].date}
                        </p>
                      )}
                    </div>

                    <div>
                      <input
                        type="time"
                        value={sessionDetails[match.user._id]?.time || ""}
                        onChange={(e) =>
                          setSessionDetails((prev) => ({
                            ...prev,
                            [match.user._id]: {
                              ...(prev[match.user._id] || {}),
                              time: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 bg-[#FFFEFC] px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-600 focus:outline-none"
                      />
                      {errorMessages[match.user._id]?.time && (
                        <p className="mt-0.5 text-[10px] text-red-600">
                          {errorMessages[match.user._id].time}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => sendSessionRequest(match.user._id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition"
                  >
                    <Send size={13} />
                    Send Session Request
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white/60 p-12 text-center text-slate-600 space-y-2">
              <User size={32} className="mx-auto text-teal-700 mb-2" />
              <h3 className="text-base font-bold text-slate-900">No Matching Peers Found</h3>
              <p className="text-xs max-w-sm mx-auto">
                {searchQuery
                  ? "No peers match your search query. Try another keyword."
                  : "Try adding more skills to learn or teach in your profile to expand your matches!"}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
      <ToastContainer position="top-right" theme="dark" />
    </div>
  );
};

export default SkillMatchingPage;
