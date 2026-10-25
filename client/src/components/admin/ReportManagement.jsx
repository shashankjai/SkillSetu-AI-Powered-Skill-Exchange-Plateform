import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaCommentDots } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [sessionChats, setSessionChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);

  const loadReports = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/reports`, {
        headers: { "x-auth-token": token },
        params: { status: statusFilter },
      });
      setReports(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const updateReportStatus = async (reportId, nextStatus) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${API_URL}/api/admin/reports/${reportId}`,
        { status: nextStatus },
        { headers: { "x-auth-token": token } },
      );
      loadReports();
      setSelectedReport(null);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update report.");
    }
  };

  const handleSuspendUser = async (userId) => {
    if (!window.confirm("Suspend this user from the platform?")) return;

    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${API_URL}/api/admin/users/${userId}/block`,
        {},
        {
          headers: { "x-auth-token": token },
        },
      );
      setError("User suspended successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to suspend user.");
    }
  };

  const viewChats = async (sessionId) => {
    if (!sessionId) return;
    const token = localStorage.getItem("token");
    try {
      setLoadingChats(true);
      const { data } = await axios.get(
        `${API_URL}/api/admin/session-chats/${sessionId}`,
        {
          headers: { "x-auth-token": token },
        },
      );
      setSessionChats(data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to fetch message history.",
      );
    } finally {
      setLoadingChats(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-teal-700 font-mono">
            Moderation
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            Reports Management
          </h2>
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-900/[0.04] px-3 py-2 text-slate-900"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="under review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-700">
          Loading reports...
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-[#FFFEFC]/40 p-8 text-center text-slate-700">
          No reports found.
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report._id}
              className="rounded-2xl border border-slate-200 bg-white p-5 card-fx"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono">
                    Report
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {report.reason}
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    {report.reporter?.name || "Unknown reporter"} →{" "}
                    {report.targetUser?.name || "Unknown user"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {report.priority || "medium"}
                  </span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-700">
                    {report.status}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-slate-700">{report.description}</p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono">
                    Reporter
                  </div>
                  <div className="mt-1 text-slate-900">
                    {report.reporter?.email || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono">
                    Date
                  </div>
                  <div className="mt-1 text-slate-900">
                    {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono">
                    Session
                  </div>
                  <div className="mt-1 text-slate-900">
                    {report.session?._id || "No session linked"}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReport(report)}
                  className="rounded-lg bg-slate-900/[0.04] px-3 py-2 text-sm font-medium text-slate-900"
                >
                  View details
                </button>
                <button
                  type="button"
                  onClick={() => updateReportStatus(report._id, "under review")}
                  className="rounded-full bg-slate-800 px-3 py-2 text-sm font-medium text-white active:scale-[0.97]"
                >
                  Mark reviewed
                </button>
                <button
                  type="button"
                  onClick={() => updateReportStatus(report._id, "resolved")}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={() => updateReportStatus(report._id, "rejected")}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-900"
                >
                  Reject
                </button>
                {report.targetUser?._id && (
                  <button
                    type="button"
                    onClick={() => handleSuspendUser(report.targetUser._id)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white"
                  >
                    Suspend user
                  </button>
                )}
                {report.session?._id && (
                  <button
                    type="button"
                    onClick={() => viewChats(report.session._id)}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-2 text-sm font-medium text-white active:scale-[0.97]"
                  >
                    <FaCommentDots /> Chat history
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReport && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 card-fx">
          <h3 className="text-xl font-bold text-slate-900">Report details</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono">
                Reporter
              </p>
              <p className="mt-2 text-slate-900">
                {selectedReport.reporter?.name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono">
                Reported user
              </p>
              <p className="mt-2 text-slate-900">
                {selectedReport.targetUser?.name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono">
                Reason
              </p>
              <p className="mt-2 text-slate-900">{selectedReport.reason}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-700 font-mono">
                Priority
              </p>
              <p className="mt-2 text-slate-900">
                {selectedReport.priority || "medium"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-slate-700">{selectedReport.description}</p>
        </div>
      )}

      {sessionChats.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 card-fx">
          <h3 className="text-xl font-bold text-slate-900">Session chat</h3>
          {loadingChats ? (
            <div className="mt-3 text-slate-700">Loading messages...</div>
          ) : (
            <div className="mt-4 space-y-3">
              {sessionChats.map((message) => (
                <div
                  key={message._id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900"
                >
                  <div className="mb-1 flex justify-between gap-3 text-xs text-slate-600">
                    <span>{message.senderId?.name || "System"}</span>
                    <span>{new Date(message.timestamp).toLocaleString()}</span>
                  </div>
                  <div>{message.content || "Attachment sent"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportManagement;
