// Global axios behaviour shared by every page that imports the default axios instance.
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import store from "../redux/store";
import { logout } from "../redux/slices/authSlice";

const PUBLIC_AUTH_PATHS = ["/api/auth/login", "/api/auth/register"];

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  store.dispatch(logout());
};

/** Drop a stored token that has already expired, so the UI never shows a "logged in" state it cannot use. */
export const dropExpiredToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const { exp } = jwtDecode(token);
    if (exp && exp * 1000 < Date.now()) clearSession();
  } catch {
    clearSession();
  }
};

export const setupAxios = () => {
  dropExpiredToken();
  axios.interceptors.response.use(
    (res) => res,
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url || "";
      const isAuthCall = PUBLIC_AUTH_PATHS.some((p) => url.includes(p));
      // 401 on a protected call = expired/invalid token: log out and send the user to login once.
      if (status === 401 && !isAuthCall && localStorage.getItem("token")) {
        clearSession();
        if (window.location.pathname !== "/login") window.location.assign("/login");
      }
      return Promise.reject(error);
    }
  );
};
