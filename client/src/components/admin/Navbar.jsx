import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Menu, LogOut } from "lucide-react";
import { logout } from "../../redux/slices/authSlice";

const Navbar = ({ adminName = "Admin", profileImage, onToggleSidebar }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#FFFEFC]/80">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-900/[0.04] text-slate-900 md:hidden"
            aria-label="Toggle admin sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="brand-gradient-text text-xl font-black md:text-2xl">
            SkillSetu
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-slate-900/[0.04] px-3 py-2 md:flex">
            <img
              src={profileImage || "https://placehold.co/80x80?text=Admin"}
              alt="Admin avatar"
              className="h-8 w-8 rounded-full border border-slate-200 object-cover"
            />
            <span className="text-sm font-semibold text-slate-900">
              {adminName}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
