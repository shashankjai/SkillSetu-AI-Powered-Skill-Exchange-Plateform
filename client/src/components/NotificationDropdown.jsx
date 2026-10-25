// src/components/NotificationDropdown.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { markAllAsRead, markAsRead } from "../redux/slices/notificationSlice";
import axios from "axios"; // Import axios here

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const NotificationDropdown = ({ onClose }) => {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state) => state.notifications);
  const [filter, setFilter] = useState("all"); // Default filter is 'all'

  const handleMarkAsRead = async (id) => {
    if (!id) return;

    dispatch(markAsRead(id));
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${API_URL}/api/notifications/${id}/read`,
        {},
        { headers: { "x-auth-token": token } },
      );
    } catch (err) {
      console.error("Error updating read status in backend:", err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!user?._id || !token) return;

    dispatch(markAllAsRead());
    try {
      await axios.patch(
        `${API_URL}/api/notifications/${user._id}/read-all`,
        {},
        { headers: { "x-auth-token": token } },
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err.message);
    }
  };

  const toggleFilter = (filterType) => {
    if (filter === filterType) {
      setFilter("all");
    } else {
      setFilter(filterType);
    }
  };

  // Filter notifications based on the selected filter
  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.isRead;
    if (filter === "read") return notif.isRead;
    return true; // Show all notifications when filter is 'all'
  });

  // Close the dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        event.target.closest(".notification-dropdown") === null &&
        event.target.closest(".notification-bell-container") === null
      ) {
        onClose();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [onClose]);

  return (
    <div className="notification-dropdown absolute right-0 top-full z-[110] mt-3 max-h-64 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-950/50">
      {/* Filter Buttons */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-2.5">
        <button
          onClick={() => toggleFilter("unread")}
          className={`!w-auto !p-0 text-xs transition ${filter === "unread" ? "font-bold text-slate-700" : "text-slate-600"} hover:text-slate-700`}
        >
          Unread
        </button>
        <button
          onClick={() => toggleFilter("read")}
          className={`!w-auto !p-0 text-xs transition ${filter === "read" ? "font-bold text-slate-700" : "text-slate-600"} hover:text-slate-700`}
        >
          Read
        </button>
        <button
          onClick={handleMarkAllAsRead}
          className="!w-auto !p-0 text-xs text-slate-700 transition hover:text-slate-700"
        >
          Mark All as Read
        </button>
      </div>

      {/* Notifications List */}
      <ul className="max-h-44 overflow-y-auto">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <li
              key={notification._id}
              className={`cursor-pointer border-b border-slate-200 p-3 text-sm transition hover:bg-slate-900/[0.06] ${!notification.isRead ? "bg-slate-100 text-slate-900" : "text-slate-700"}`}
              onClick={() => handleMarkAsRead(notification._id)} // Mark as read on click
            >
              {notification.message}
            </li>
          ))
        ) : (
          <li className="p-4 text-sm text-slate-600">No notifications</li>
        )}
      </ul>
    </div>
  );
};

export default NotificationDropdown;
