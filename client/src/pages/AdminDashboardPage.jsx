import React, { useState, useEffect } from "react";
import axios from "axios";
import { Outlet } from "react-router-dom";
import AdminNavbar from "../components/admin/Navbar";
import AdminSideBar from "../components/admin/AdminSideBar";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile } from "../redux/slices/adminProfileSlice";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const AdminDashboardPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.profile);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [overview, setOverview] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    totalSkills: 0,
    totalMatches: 0,
    totalSessions: 0,
    completedSessions: 0,
    reportedUsers: 0,
    pendingReports: 0,
    userGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        setLoading(true);
        const { data } = await axios.get(`${API_URL}/api/admin/dashboard`, {
          headers: { "x-auth-token": token },
        });
        setOverview(data);
        setError("");
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load dashboard data.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const _toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const profileImage = user?.profilePicture
    ? user.profilePicture.startsWith("http")
      ? user.profilePicture
      : `${API_URL}/uploads/${user.profilePicture}`
    : "https://placehold.co/150x150?text=Admin";

  const stats = [
    {
      label: "Total Users",
      value: overview.totalUsers,
      change: `${overview.userGrowth}%`,
      tone: "blue",
    },
    {
      label: "Active Users",
      value: overview.activeUsers,
      change: "Live",
      tone: "green",
    },
    {
      label: "New Users",
      value: overview.newUsers,
      change: "This month",
      tone: "violet",
    },
    {
      label: "Total Skills",
      value: overview.totalSkills,
      change: "Catalog",
      tone: "amber",
    },
    {
      label: "Total Matches",
      value: overview.totalMatches,
      change: "Connected",
      tone: "cyan",
    },
    {
      label: "Total Sessions",
      value: overview.totalSessions,
      change: "Scheduled",
      tone: "emerald",
    },
    {
      label: "Completed Sessions",
      value: overview.completedSessions,
      change: "Done",
      tone: "pink",
    },
    {
      label: "Reported Users",
      value: overview.reportedUsers,
      change: `${overview.pendingReports} pending`,
      tone: "red",
    },
  ];

  const toneMap = {
    blue: "from-slate-100 to-slate-100 border-slate-300",
    green: "from-emerald-600/20 to-emerald-500/10 border-emerald-400/30",
    violet: "from-violet-600/20 to-violet-500/10 border-violet-400/30",
    amber: "from-amber-600/20 to-amber-500/10 border-amber-400/30",
    cyan: "from-slate-100 to-slate-100 border-slate-300",
    emerald: "from-emerald-600/20 to-emerald-500/10 border-emerald-400/30",
    pink: "from-pink-600/20 to-pink-500/10 border-pink-400/30",
    red: "from-red-600/20 to-red-500/10 border-red-400/30",
  };

  return (
    <div className="min-h-dvh bg-[#FFFEFC] text-slate-900">
      <AdminNavbar
        adminName={user?.name || "Admin"}
        profileImage={profileImage}
        onToggleSidebar={_toggleSidebar}
      />

      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSideBar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
              <div className="group relative flex-shrink-0">
                <img
                  src={profileImage}
                  alt="Profile"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      "https://placehold.co/150x150?text=Admin";
                  }}
                  className="h-24 w-24 rounded-full border-4 border-slate-200 object-cover shadow-2xl transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 font-mono">
                  Admin panel
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-900">
                  {user?.name || "Admin User"}
                </h2>
                <p className="mt-3 max-w-3xl text-sm text-slate-900 md:text-base">
                  Responsible for overseeing platform operations, handling
                  reports, and guiding the growth of the{" "}
                  <span className="brand-gradient-text">SkillSetu</span>{" "}
                  community.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, change, tone }) => (
              <div
                key={label}
                className={`rounded-2xl border bg-gradient-to-br p-5 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)] ${toneMap[tone]}`}
              >
                <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-teal-700 font-mono">
                  <span>{label}</span>
                  <span className="rounded-full bg-slate-900/[0.04] px-2 py-1 text-[10px] text-slate-900">
                    {change}
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900">
                  {loading ? "—" : value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
