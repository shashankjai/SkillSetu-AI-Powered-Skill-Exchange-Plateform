import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState({ items: [], unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadNotifications = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        setLoading(true);
        const { data } = await axios.get(`${API_URL}/api/admin/notifications`, {
          headers: { "x-auth-token": token },
        });
        setNotifications(data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load notifications.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-teal-700 font-mono">
            Alerts
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            Admin Notifications
          </h2>
        </div>
        <div className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {notifications.unread || 0} unread
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-700">
          Loading notifications...
        </div>
      ) : notifications.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-[#FFFEFC]/40 p-8 text-center text-slate-700">
          No admin notifications.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.items.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-4 ${notification.unread ? "border-slate-300 bg-slate-100" : "border-slate-200 bg-[#FFFEFC]/60"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {notification.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    {notification.message}
                  </div>
                </div>
                {notification.unread && (
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white font-mono">
                    New
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
