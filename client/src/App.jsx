import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import SkillMatchingPage from "./pages/SkillMatchingPage";
import RoadmapPage from "./pages/RoadmapPage";
import AiAssistantPage from "./pages/AiAssistantPage";
import ChatPage from "./pages/ChatPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";

import AdminDashboardPage from "./pages/AdminDashboardPage";
import UserManagement from "./components/admin/UserManagement";
import ReportManagement from "./components/admin/ReportManagement";
import AnalyticsOverview from "./components/admin/AnalyticsOverview";
import SkillsManagement from "./components/admin/SkillsManagement";
import SessionManagement from "./components/admin/SessionManagement";
import AdminNotifications from "./components/admin/AdminNotifications";
import AdminProfile from "./pages/AdminProfilePage";
import EngagementAnalytics from "./components/admin/EngagementAnalytics";

import AboutUsPage from "./pages/AboutUSPage";
import NotFoundPage from "./pages/NotFoundPage";
import ScrollToTop from "./components/ScrollToTop";

import PrivateRoute from "./components/common/PrivateRoute";

import "./App.css";

/** Fades each section of the site in on navigation. Keyed by the first URL segment so /chat -> /chat/:id keeps its state. */
function AnimatedRoutes() {
  const { pathname } = useLocation();
  return (
    <div key={pathname.split("/")[1] || "home"} className="page-in">
      <Routes>
        {/* =========================
            PUBLIC ROUTES
        ========================== */}

        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<LoginPage />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route path="/about-us" element={<AboutUsPage />} />

        {/* =========================
            PROTECTED USER ROUTES
        ========================== */}

        <Route
          path="/profile"
          element={<PrivateRoute element={<ProfilePage />} />}
        />

        <Route
          path="/skill-matching"
          element={<PrivateRoute element={<SkillMatchingPage />} />}
        />

        <Route
          path="/learning-roadmap"
          element={<PrivateRoute element={<RoadmapPage />} />}
        />

        <Route
          path="/ai-assistant"
          element={<PrivateRoute element={<AiAssistantPage />} />}
        />

        <Route path="/chat" element={<PrivateRoute element={<ChatPage />} />} />

        <Route
          path="/chat/:sessionId"
          element={<PrivateRoute element={<ChatPage />} />}
        />

        <Route
          path="/profile-settings"
          element={<PrivateRoute element={<ProfileSettingsPage />} />}
        />

        {/* =========================
            ADMIN ROUTES
        ========================== */}

        <Route
          path="/admin"
          element={
            <PrivateRoute
              element={<AdminDashboardPage />}
              requiredRole="admin"
            />
          }
        >
          <Route index element={<AnalyticsOverview />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="reports" element={<ReportManagement />} />
          <Route path="skills" element={<SkillsManagement />} />
          <Route path="sessions" element={<SessionManagement />} />
          <Route path="analytics" element={<AnalyticsOverview />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="profile" element={<AdminProfile />} />
          <Route
            path="engagement-analytics"
            element={<EngagementAnalytics />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
