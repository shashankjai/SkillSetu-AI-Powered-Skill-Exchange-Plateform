import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const PrivateRoute = ({ element, children, requiredRole }) => {
  const location = useLocation();

  // Get user from Redux
  const reduxUser = useSelector((state) => state.auth.user);

  // Get persisted authentication data
  const token = localStorage.getItem("token");

  let storedUser = null;

  try {
    const user = localStorage.getItem("user");

    if (user) {
      storedUser = JSON.parse(user);
    }
  } catch (error) {
    console.error("Error reading user from localStorage:", error);

    // Remove corrupted user data
    localStorage.removeItem("user");
  }

  /*
   * Prefer Redux user.
   *
   * If Redux does not have the user yet, use the
   * persisted user from localStorage.
   *
   * This is important after browser refresh because
   * Redux state is recreated after refresh.
   */
  const user = reduxUser || storedUser;

  /*
   * User is authenticated only when both:
   *
   * 1. Token exists
   * 2. User information exists
   */
  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  /*
   * Role-based protection.
   *
   * Example:
   * requiredRole="admin"
   *
   * Only admin users can access the route.
   */
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  /*
   * Authentication successful.
   * Render the protected page.
   */
  return element || children;
};

export default PrivateRoute;