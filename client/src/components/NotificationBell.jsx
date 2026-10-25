// src/components/NotificationBell.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import {
  addNotification,
  setNotifications,
} from "../redux/slices/notificationSlice";
import { FaBell } from "react-icons/fa";
import io from "socket.io-client";
import NotificationDropdown from "./NotificationDropdown";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const NotificationBell = () => {
  const dispatch = useDispatch();
  const { unreadCount } = useSelector((state) => state.notifications);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (token && user?._id) {
      axios
        .get(`${API_URL}/api/notifications/${user._id}`, {
          headers: { "x-auth-token": token },
        })
        .then((response) => dispatch(setNotifications(response.data)))
        .catch((error) =>
          console.error("Error fetching notifications:", error),
        );
    }

    const socket = io(`${API_URL}/notifications`);
    socket.on("new_notification", (notification) => {
      if (notification.userId?.toString() === user?._id?.toString()) {
        dispatch(addNotification(notification));
      }
    });
    return () => socket.disconnect();
  }, [dispatch]);

  return (
    <div className="notification-bell-container relative z-[100]">
      <button
        onClick={() => setIsDropdownOpen((open) => !open)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-slate-800 text-white shadow-lg shadow-slate-900/10 transition hover:bg-teal-700"
        title="Notifications"
      >
        <FaBell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-200 bg-rose-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isDropdownOpen && (
        <NotificationDropdown onClose={() => setIsDropdownOpen(false)} />
      )}
    </div>
  );
};

export default NotificationBell;
