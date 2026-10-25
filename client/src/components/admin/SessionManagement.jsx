import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadSessions = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/sessions`, {
        headers: { "x-auth-token": token },
        params: { status: statusFilter },
      });
      setSessions(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [statusFilter]);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-teal-700 font-mono">
            Platform
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            Session Management
          </h2>
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-900/[0.04] px-3 py-2 text-slate-900"
        >
          <option value="all">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-700">
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-[#FFFEFC]/40 p-8 text-center text-slate-700">
          No sessions found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-[#FFFEFC] text-sm uppercase tracking-[0.2em] text-teal-700 font-mono">
              <tr>
                <th className="px-4 py-3">Session ID</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session._id}
                  className="border-t border-slate-200 text-slate-900"
                >
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {session._id.slice(-8)}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-900">
                    {session.userId1?.name || "Unknown"} /{" "}
                    {session.userId2?.name || "Unknown"}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-900">
                    {session.skill || "General session"}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {session.sessionDate
                      ? new Date(session.sessionDate).toLocaleString()
                      : "Not scheduled"}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {session.status || "pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;
