// client/src/components/navbar/Navbar.jsx
// Same layout language as the portfolio navbar: logo left, text links with a growing underline in the
// middle, one dark call-to-action on the right, bordered drop-down menu on mobile.
import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, Menu, X } from "lucide-react";
import { logout } from "../../redux/slices/authSlice";
import ScrollProgress from "../common/ScrollProgress";

const publicLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about-us" },
];

const memberLinks = [
  { label: "Home", to: "/" },
  { label: "Explore", to: "/skill-matching" },
  { label: "Roadmap", to: "/learning-roadmap" },
  { label: "AI Assistant", to: "/ai-assistant" },
  { label: "Chat", to: "/chat" },
  { label: "Profile", to: "/profile" },
  { label: "About", to: "/about-us" },
];

/** SkillSetu wordmark: "Skill" in ink, "Setu" in teal, with a small dot, like the SJ mark in the portfolio. */
export const Logo = ({ className = "text-2xl" }) => (
  <span className={`inline-flex items-baseline font-display font-bold leading-none ${className}`} aria-label="SkillSetu">
    <span className="text-slate-900">Skill</span>
    <span className="text-teal-700">Setu</span>
    <span className="ml-0.5 inline-block h-[0.16em] w-[0.16em] rounded-full bg-slate-900" />
  </span>
);

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const reduxUser = useSelector((state) => state.auth.user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAuthenticated = Boolean(localStorage.getItem("token")) && Boolean(reduxUser);
  const isAdmin = reduxUser?.role === "admin";
  const links = isAuthenticated ? [...memberLinks, ...(isAdmin ? [{ label: "Admin", to: "/admin" }] : [])] : publicLinks;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  // close the mobile menu whenever the page changes
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch(logout());
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `relative py-2 text-[15px] transition-colors hover:text-teal-700 ${isActive ? "text-slate-900" : "text-slate-600"} ` +
    `after:absolute after:-bottom-0.5 after:left-0 after:h-[2px] after:bg-teal-700 after:transition-all after:duration-300 ${
      isActive ? "after:w-full" : "after:w-0"
    }`;

  return (
    <>
      <ScrollProgress />
      <header
        className={`sticky top-0 z-50 border-b border-slate-200 bg-[#FFFEFC]/95 backdrop-blur-sm transition-shadow duration-300 print:hidden ${
          scrolled ? "shadow-[0_6px_18px_-14px_rgba(15,23,42,0.35)]" : ""
        }`}
      >
        <nav className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12" aria-label="Main">
          <Link to="/" aria-label="SkillSetu home" className="shrink-0">
            <Logo />
          </Link>

          <ul className="hidden items-center gap-6 xl:gap-8 lg:flex">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.to === "/"} className={linkClass}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut size={15} aria-hidden="true" /> Logout
                </button>
                <Link to="/skill-matching" className="btn-primary text-sm">
                  Find a match
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="text-[15px] text-slate-600 transition-colors hover:text-teal-700">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-900 lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {menuOpen && (
          <div id="mobile-menu" className="menu-drop max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-slate-200 bg-[#FFFEFC] px-5 pb-5 lg:hidden">
            <ul className="flex flex-col">
              {links.map((l) => (
                <li key={l.to} className="border-b border-slate-200">
                  <NavLink
                    to={l.to}
                    end={l.to === "/"}
                    className={({ isActive }) => `block py-3.5 text-base ${isActive ? "font-medium text-teal-700" : "text-slate-900"}`}
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            {isAuthenticated ? (
              <div className="mt-4 flex flex-col gap-2">
                <Link to="/skill-matching" className="btn-primary w-full text-sm">
                  Find a match
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 py-3 text-sm font-medium text-red-700"
                >
                  <LogOut size={15} aria-hidden="true" /> Logout
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <Link to="/register" className="btn-primary w-full text-sm">
                  Get Started
                </Link>
                <Link to="/login" className="btn-secondary w-full text-sm">
                  Login
                </Link>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
};

export default Navbar;
