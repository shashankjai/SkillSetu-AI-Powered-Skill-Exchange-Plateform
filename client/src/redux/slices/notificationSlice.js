// src/redux/slices/notificationSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  notifications: [], // Store notifications
  unreadCount: 0, // Count unread notifications
};

const getReadIdsStorageKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?._id ? `skillsetu-read-notifications-${user._id}` : null;
  } catch {
    return null;
  }
};

const getPersistedReadIds = () => {
  const key = getReadIdsStorageKey();
  if (!key) return new Set();

  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
};

const persistReadIds = (readIds) => {
  const key = getReadIdsStorageKey();
  if (key) localStorage.setItem(key, JSON.stringify([...readIds]));
};

const removeDuplicateReminders = (notifications) => {
  const seenReminders = new Set();

  return notifications.filter((notification) => {
    if (notification.type !== "reminder") return true;

    const reminderKey = `${notification.userId}:${notification.message}`;
    if (seenReminders.has(reminderKey)) return false;

    seenReminders.add(reminderKey);
    return true;
  });
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      const locallyReadIds = new Set(
        state.notifications
          .filter((notification) => notification.isRead)
          .map((notification) => notification._id),
      );
      const persistedReadIds = getPersistedReadIds();

      state.notifications = removeDuplicateReminders(action.payload).map(
        (notification) => ({
          ...notification,
          isRead:
            notification.isRead ||
            locallyReadIds.has(notification._id) ||
            persistedReadIds.has(notification._id),
        }),
      );
      state.unreadCount = state.notifications.filter(
        (notif) => !notif.isRead,
      ).length; // Update unread count
    },
    addNotification: (state, action) => {
      const isDuplicateReminder = state.notifications.some(
        (notification) =>
          notification.type === "reminder" &&
          action.payload.type === "reminder" &&
          notification.userId?.toString() ===
            action.payload.userId?.toString() &&
          notification.message === action.payload.message,
      );

      if (isDuplicateReminder) return;

      state.notifications.unshift(action.payload);
      state.unreadCount = state.notifications.filter(
        (notif) => !notif.isRead,
      ).length;
    },
    markAsRead: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(
        (notif) => notif._id === notificationId,
      );
      if (notification) {
        notification.isRead = true;
        const readIds = getPersistedReadIds();
        readIds.add(notificationId);
        persistReadIds(readIds);
        state.unreadCount = state.notifications.filter(
          (notif) => !notif.isRead,
        ).length; // Update unread count
      }
    },
    markAllAsRead: (state) => {
      const readIds = getPersistedReadIds();
      state.notifications.forEach((notification) => {
        notification.isRead = true;
        readIds.add(notification._id);
      });
      persistReadIds(readIds);
      state.unreadCount = 0;
    },
  },
});

export const { setNotifications, addNotification, markAsRead, markAllAsRead } =
  notificationSlice.actions;
export default notificationSlice.reducer;
