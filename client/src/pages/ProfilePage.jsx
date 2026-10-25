// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../components/navbar/Navbar";
import NotificationBell from "../components/NotificationBell";
import { FaLinkedin, FaGithub, FaTwitter, FaInstagram } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { FiEdit, FiCalendar, FiClock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import { setNotifications } from "../redux/slices/notificationSlice";
import Background from "../components/background/Background";
import "../components/background/Background.css";
import Footer from "../components/footer/Footer";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
import defaultAvatar from "../assets/avatar.jpeg";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [skillsToTeach, setSkillsToTeach] = useState([]);
  const [skillsToLearn, setSkillsToLearn] = useState([]);
  const [modalTeach, setModalTeach] = useState("");
  const [modalLearn, setModalLearn] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingSessions, setPendingSessions] = useState([]);
  const [acceptedSessions, setAcceptedSessions] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [canceledSessions, setCanceledSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Formatters
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

  // Fetch profile & notifications
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const { data } = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { "x-auth-token": token },
        });
        setUser(data);
        setSkillsToTeach(data.skillsToTeach);
        setSkillsToLearn(data.skillsToLearn);

        const notifRes = await axios.get(
          `${API_URL}/api/notifications/${data._id}`,
          { headers: { "x-auth-token": token } },
        );
        dispatch(setNotifications(notifRes.data));
      } catch {
        setError("Failed to load profile or notifications.");
      }
    };
    fetchUserProfile();
  }, [dispatch]);

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const [p, a, co, c] = await Promise.all([
          axios.get(`${API_URL}/api/sessions/pending`, {
            headers: { "x-auth-token": token },
          }),
          axios.get(`${API_URL}/api/sessions/acceptedOnly`, {
            headers: { "x-auth-token": token },
          }),
          axios.get(`${API_URL}/api/sessions/completed`, {
            headers: { "x-auth-token": token },
          }),
          axios.get(`${API_URL}/api/sessions/canceled`, {
            headers: { "x-auth-token": token },
          }),
        ]);

        setPendingSessions(p.data);
        setAcceptedSessions(a.data);
        setCompletedSessions(co.data);
        setCanceledSessions(c.data);
      } catch {
        setError("Error fetching sessions");
      }
    };

    fetchSessions();

    const refreshOnFocus = () => fetchSessions();
    const refreshInterval = window.setInterval(fetchSessions, 5000);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  // Modal handlers
  const openModal = () => {
    setModalTeach(skillsToTeach.join(", "));
    setModalLearn(skillsToLearn.join(", "));
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError("");
    setSuccess("");
  };

  const handleUpdateProfile = async () => {
    const token = localStorage.getItem("token");
    try {
      const { data } = await axios.put(
        `${API_URL}/api/users/profile`,
        {
          name: user.name, // Ensure `name` is sent in the request
          status: user.status,
          socials: user.socials,
          skillsToTeach: modalTeach.split(",").map((s) => s.trim()),
          skillsToLearn: modalLearn.split(",").map((s) => s.trim()),
        },
        { headers: { "x-auth-token": token } },
      );
      setUser(data);
      setSkillsToTeach(data.skillsToTeach);
      setSkillsToLearn(data.skillsToLearn);
      setSuccess("Profile updated successfully!");
      closeModal();
    } catch {
      setError("Failed to update profile.");
    }
  };

  // Session actions
  const handleAccept = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${API_URL}/api/sessions/accept`,
        { sessionId: id },
        { headers: { "x-auth-token": token } },
      );
      setPendingSessions((ps) => ps.filter((s) => s._id !== id));
      setAcceptedSessions((as) => [...as, res.data.session]);
      setSuccess("Session accepted");
    } catch {
      setError("Failed to accept session.");
    }
  };
  const handleStartChat = (id) => navigate(`/chat/${id}`);

  const getSessionPartnerName = (session) => {
    const partner =
      session.userId1?._id === user?._id ? session.userId2 : session.userId1;
    return partner?.name ?? "Unknown User";
  };

  // Show loading state until the profile is available
  if (!user) {
    return (
      <div className="min-h-dvh bg-[#FFFEFC] p-8 text-slate-700 flex items-center justify-center font-sans">
        <div className="text-sm font-semibold text-slate-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-[#FFFEFC] text-slate-900 flex flex-col font-sans">
      <Background />
      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar />
        {/* Profile and Notification Section */}
        <div className="px-4 py-8 sm:px-6 lg:px-8 flex-1">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between space-y-6 p-4 md:flex-row md:space-y-0 md:p-8">
            {/* Left Profile Card */}
            <div className="relative flex min-h-[10rem] w-full flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:mr-4 md:h-60 md:min-h-[12rem] md:flex-row md:space-x-6 md:p-6">
              {/* Controls: Notifications + Edit */}
              <div className="absolute right-4 top-4 z-[120] flex items-center space-x-2">
                <NotificationBell />
                <button
                  onClick={() => navigate("/profile-settings")}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-800 text-white transition hover:bg-teal-700 md:h-12 md:w-12 shadow-md"
                  title="Edit Profile"
                >
                  <FiEdit size={18} className="md:w-5 md:h-5" />
                </button>
              </div>

              {/* Profile Picture */}
              <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-slate-300 shadow-lg shadow-slate-900/10 md:h-28 md:w-28">
                <img
                  src={
                    user?.profilePicture
                      ? `${API_URL}/uploads/profile-pictures/${user.profilePicture}`
                      : defaultAvatar
                  }
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* User Info */}
              <div className="text-center md:text-left space-y-2 mt-4 md:mt-0">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                  {user?.name || "User"}
                </h2>
                <p className="text-base text-slate-900 md:text-lg">
                  Welcome to your profile!
                </p>

                {user?.status && (
                  <p className="text-xs text-slate-700 md:text-sm">
                    <span className="font-semibold text-slate-700">Status:</span>{" "}
                    {user.status}
                  </p>
                )}

                {/* Social Links */}
                {user?.socials && (
                  <div className="flex justify-center md:justify-start space-x-3 md:space-x-4 mt-2">
                    {user.socials.linkedin && (
                      <a
                        href={user.socials.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-700 transition hover:text-slate-700"
                      >
                        <FaLinkedin size={20} className="md:w-6 md:h-6" />
                      </a>
                    )}
                    {user.socials.facebook && (
                      <a
                        href={user.socials.facebook}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-700 transition hover:text-slate-700"
                      >
                        <i className="fab fa-facebook text-lg md:text-xl"></i>
                      </a>
                    )}
                    {user.socials.twitter && (
                      <a
                        href={user.socials.twitter}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-700 transition hover:text-pink-700"
                      >
                        <FaInstagram size={20} className="md:w-6 md:h-6" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Tracking - Now Responsive */}
              <div className="flex flex-wrap justify-center md:justify-end items-center gap-2 md:gap-4 lg:gap-8 mt-4 md:mt-0 ml-auto">
                {/* Completed Sessions */}
                <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
                  <CircularProgressbar
                    value={
                      (completedSessions.length /
                        (pendingSessions.length +
                          completedSessions.length +
                          canceledSessions.length +
                          acceptedSessions.length)) *
                        100 || 0
                    }
                    text={`${completedSessions.length}`}
                    styles={buildStyles({
                      textSize: "32px",
                      textColor: "#0f172a",
                      pathColor: "#4caf50",
                      trailColor: "rgba(148, 163, 184, 0.22)",
                    })}
                  />
                  <p className="mt-1 text-center text-xs text-slate-700 md:text-sm">
                    Completed
                  </p>
                </div>

                {/* Pending Sessions */}
                <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
                  <CircularProgressbar
                    value={
                      (pendingSessions.length /
                        (pendingSessions.length +
                          completedSessions.length +
                          canceledSessions.length +
                          acceptedSessions.length)) *
                        100 || 0
                    }
                    text={`${pendingSessions.length}`}
                    styles={buildStyles({
                      textSize: "32px",
                      textColor: "#0f172a",
                      pathColor: "#ff9800",
                      trailColor: "rgba(148, 163, 184, 0.22)",
                    })}
                  />
                  <p className="mt-1 text-center text-xs text-slate-700 md:text-sm">
                    Pending
                  </p>
                </div>

                {/* Upcoming Sessions */}
                <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
                  <CircularProgressbar
                    value={
                      (acceptedSessions.length /
                        (pendingSessions.length +
                          completedSessions.length +
                          canceledSessions.length +
                          acceptedSessions.length)) *
                        100 || 0
                    }
                    text={`${acceptedSessions.length}`}
                    styles={buildStyles({
                      textSize: "32px",
                      textColor: "#0f172a",
                      pathColor: "#475569",
                      trailColor: "rgba(148, 163, 184, 0.22)",
                    })}
                  />
                  <p className="mt-1 text-center text-xs text-slate-700 md:text-sm">
                    Upcoming
                  </p>
                </div>

                {/* Canceled Sessions */}
                <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24">
                  <CircularProgressbar
                    value={
                      (canceledSessions.length /
                        (pendingSessions.length +
                          completedSessions.length +
                          canceledSessions.length +
                          acceptedSessions.length)) *
                        100 || 0
                    }
                    text={`${canceledSessions.length}`}
                    styles={buildStyles({
                      textSize: "32px",
                      textColor: "#0f172a",
                      pathColor: "#f44336",
                      trailColor: "rgba(148, 163, 184, 0.22)",
                    })}
                  />
                  <p className="mt-1 text-center text-xs text-slate-700 md:text-sm">
                    Canceled
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Info and Skills Info */}
          <div className="mx-auto max-w-7xl p-4 md:p-8">
            {success && (
              <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-600/20 p-3 text-emerald-700">
                {success}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-600/20 p-3 text-rose-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              {/* Skills Card */}
              <div className="h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl transition duration-300 hover:border-slate-200 md:h-96 md:p-6">
                <div className="mb-4 flex items-center justify-between md:mb-6">
                  <h2 className="text-left text-2xl font-bold text-slate-900 md:text-3xl">
                    Your Skills
                  </h2>
                  <div
                    onClick={openModal}
                    className="cursor-pointer rounded-xl bg-slate-800 p-2 text-white transition hover:bg-teal-700 md:p-2.5 shadow-md"
                  >
                    <FiEdit size={18} className="md:w-5 md:h-5" />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-left text-xl font-medium text-slate-700 md:text-2xl">
                    Skills You Can Teach:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skillsToTeach.length > 0 ? (
                      skillsToTeach
                        .flatMap((skill) =>
                          skill.split(",").map((s) => s.trim()),
                        )
                        .map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-200 md:px-5 md:py-2 md:text-lg"
                          >
                            {s}
                          </span>
                        ))
                    ) : (
                      <span className="text-sm text-slate-600 md:text-lg">
                        None
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-left text-xl font-medium text-slate-700 md:text-2xl">
                    Skills You Want to Learn:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {skillsToLearn.length > 0 ? (
                      skillsToLearn
                        .flatMap((skill) =>
                          skill.split(",").map((s) => s.trim()),
                        )
                        .map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-emerald-600/20 px-3 py-1 text-sm font-medium text-emerald-700 transition hover:bg-emerald-600/30 md:px-5 md:py-2 md:text-lg"
                          >
                            {s}
                          </span>
                        ))
                    ) : (
                      <span className="text-sm text-slate-600 md:text-lg">
                        None
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sessions Card */}
              <div className="flex h-80 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xl transition duration-300 hover:border-slate-200 md:h-96 md:p-6">
                <h2 className="mb-4 text-left text-2xl font-bold text-slate-900 md:mb-6 md:text-3xl">
                  Your Sessions
                </h2>

                <div className="flex flex-wrap gap-2 md:space-x-2 mb-4">
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                      activeTab === "pending"
                        ? "bg-slate-800 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setActiveTab("upcoming")}
                    className={`px-3 py-1 md:px-4 md:py-2 rounded-lg font-medium text-sm md:text-base transition ${
                      activeTab === "upcoming"
                        ? "bg-slate-800 text-white"
                        : "bg-slate-900/[0.04] text-slate-600 hover:bg-slate-900/[0.06]"
                    }`}
                  >
                    Upcoming
                  </button>
                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`px-3 py-1 md:px-4 md:py-2 rounded-lg font-medium text-sm md:text-base transition ${
                      activeTab === "completed"
                        ? "bg-slate-800 text-white"
                        : "bg-slate-900/[0.04] text-slate-600 hover:bg-slate-900/[0.06]"
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => setActiveTab("canceled")}
                    className={`px-3 py-1 md:px-4 md:py-2 rounded-lg font-medium text-sm md:text-base transition ${
                      activeTab === "canceled"
                        ? "bg-slate-800 text-white"
                        : "bg-slate-900/[0.04] text-slate-600 hover:bg-slate-900/[0.06]"
                    }`}
                  >
                    Canceled
                  </button>
                </div>

                {/* Scrollable sessions list */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 session-list">
                  {(activeTab === "pending"
                    ? pendingSessions
                    : activeTab === "upcoming"
                      ? acceptedSessions
                      : activeTab === "completed"
                        ? completedSessions
                        : canceledSessions
                  ).length > 0 ? (
                    (activeTab === "pending"
                      ? pendingSessions
                      : activeTab === "upcoming"
                        ? acceptedSessions
                        : activeTab === "completed"
                          ? completedSessions
                          : canceledSessions
                    ).map((s) => (
                      <div
                        key={s._id}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg transition hover:-translate-y-0.5 hover:border-slate-500 md:p-4 card-fx"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 gap-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 md:h-8 md:w-8 md:text-sm">
                              {s.userId1?.name
                                ? s.userId1.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                : "U"}
                            </div>
                            <span className="text-sm font-semibold text-slate-900 md:text-base">
                              {getSessionPartnerName(s, user._id)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 md:text-sm">
                            {s.skill}
                          </p>
                          <span className="text-xs text-slate-600 md:text-sm">
                            {formatDate(s.sessionDate)}
                          </span>
                        </div>

                        <div className="mb-3 flex flex-col gap-2 text-xs text-slate-600 md:flex-row md:items-center md:space-x-4 md:text-sm">
                          <div className="flex items-center space-x-1">
                            <FiCalendar size={12} className="md:w-4 md:h-4" />
                            <span>{formatDate(s.sessionDate)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <FiClock size={12} className="md:w-4 md:h-4" />
                            <span>
                              {s.newMeetingTime ||
                                s.sessionTime ||
                                "Time not set"}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            activeTab === "pending"
                              ? handleAccept(s._id)
                              : handleStartChat(s._id)
                          }
                          className={`text-xs md:text-sm font-medium px-2 py-1 md:px-3 md:py-1.5 rounded-lg transition ${
                            activeTab === "pending"
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-slate-800 text-white hover:bg-teal-700"
                          } active:scale-95`}
                        >
                          {activeTab === "pending"
                            ? "Accept"
                            : activeTab === "upcoming"
                              ? "Start Chat"
                              : "View Feedback"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-slate-600 md:text-base">
                      {activeTab === "pending"
                        ? "No pending sessions."
                        : activeTab === "upcoming"
                          ? "No upcoming sessions."
                          : activeTab === "completed"
                            ? "No completed sessions."
                            : "No canceled sessions."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFEFC]/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl md:max-w-lg"
                initial={{ y: "100vh", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100vh", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <h2 className="mb-6 text-left text-xl font-semibold text-slate-900 md:text-2xl">
                  Update Your Skills
                </h2>

                {error && <p className="mb-4 text-rose-700">{error}</p>}
                {success && <p className="mb-4 text-emerald-700">{success}</p>}

                <div className="mb-4">
                  <label className="mb-2 block text-left text-slate-700">
                    Skills You Can Teach
                  </label>
                  <input
                    type="text"
                    value={modalTeach}
                    onChange={(e) => setModalTeach(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-100 p-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500 md:p-3 md:text-base"
                    placeholder="e.g. JavaScript, Python"
                  />
                </div>
                <div className="mb-6">
                  <label className="mb-2 block text-left text-slate-700">
                    Skills You Want to Learn
                  </label>
                  <input
                    type="text"
                    value={modalLearn}
                    onChange={(e) => setModalLearn(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-100 p-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500 md:p-3 md:text-base"
                    placeholder="e.g. React, Data Science"
                  />
                </div>

                <div className="flex justify-end space-x-3 md:space-x-4">
                  <button
                    onClick={closeModal}
                    className="rounded-lg bg-slate-900/[0.06] px-3 py-1 text-sm text-slate-900 transition hover:bg-slate-900/10 md:px-4 md:py-2 md:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    className="rounded-full bg-slate-800 px-3 py-1 text-sm text-white transition hover:bg-teal-700 md:px-4 md:py-2 md:text-base active:scale-[0.97]"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <Footer />
      </div>
    </div>
  );
};

export default ProfilePage;
