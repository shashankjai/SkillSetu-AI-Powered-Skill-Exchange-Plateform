import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { motion } from "framer-motion";
import { FiLogOut } from "react-icons/fi";

const AlreadyLoggedIn = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  let user = null;

  try {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      user = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error("Error reading user from localStorage:", error);
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    dispatch(logout());

    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center dot-grid bg-[#FAFAF8] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 w-full max-w-md text-center"
      >
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="brand-gradient-text text-4xl sm:text-5xl font-bold mb-4"
        >
          SkillSetu
        </motion.h1>

        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
          You are already logged in!
        </h2>

        {user?.name && (
          <p className="text-slate-900 text-lg mb-2">
            Welcome back, <span className="font-bold">{user.name}</span>
          </p>
        )}

        <p className="text-slate-700 text-base sm:text-lg mb-8">
          You are currently signed in to your{" "}
          <span className="brand-gradient-text">SkillSetu</span> account. Please
          logout first if you want to login with another account.
        </p>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 mx-auto bg-white text-slate-700 font-semibold py-3 px-8 rounded-full hover:bg-red-500 hover:text-white transition duration-300 shadow-lg"
        >
          <FiLogOut />
          Logout
        </button>
      </motion.div>
    </div>
  );
};

export default AlreadyLoggedIn;
