import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { FiUser, FiMail, FiLock, FiArrowRight } from "react-icons/fi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import AuthSidePanel from "../components/auth/AuthSidePanel";
import { Link } from "react-router-dom";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
      await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
      });
      setSuccessMessage("Registration successful! Please log in.");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.msg || "Something went wrong!");
    }
  };

  return (
    <div className="register-page flex h-dvh w-full overflow-hidden bg-[#FFFEFC]">
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative flex w-full flex-col items-center justify-center bg-[#FFFEFC]/90 px-4 py-10 sm:px-6 lg:w-1/2"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(51,65,85,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(100,116,139,0.10),transparent_35%)]" />

        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 mb-8 text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 font-mono">
            Join <span className="brand-gradient-text">SkillSetu</span>
          </span>
          <h1 className="brand-gradient-text mt-5 text-4xl font-black tracking-tight sm:text-5xl">
            SkillSetu
          </h1>
          <p className="mt-3 text-base text-slate-700">
            Create your profile and start learning together.
          </p>
        </motion.div>

        <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-slate-900/[0.04] p-5 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)] sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700 font-mono">
              Start today
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Create account
            </h2>
          </div>

          {successMessage && (
            <div className="mb-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="space-y-5"
          >
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-700" />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error === "Please enter your full name.") setError("");
                }}
                autoComplete="off"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3.5 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-600 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-700" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error === "Please enter a valid email address.")
                    setError("");
                }}
                autoComplete="off"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3.5 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-600 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>

            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-700" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error === "Password must be at least 6 characters long.")
                    setError("");
                }}
                autoComplete="new-password"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3.5 pl-12 pr-12 text-base text-slate-900 placeholder:text-slate-600 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 transition hover:text-slate-900"
              >
                {showPassword ? (
                  <AiOutlineEyeInvisible size={18} />
                ) : (
                  <AiOutlineEye size={18} />
                )}
              </button>
            </div>

            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-700" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error === "Passwords do not match!") setError("");
                }}
                autoComplete="new-password"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3.5 pl-12 pr-12 text-base text-slate-900 placeholder:text-slate-600 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 transition hover:text-slate-900"
              >
                {showConfirmPassword ? (
                  <AiOutlineEyeInvisible size={18} />
                ) : (
                  <AiOutlineEye size={18} />
                )}
              </button>
            </div>

            <button type="submit" className="primary-btn w-full text-base">
              Create account <FiArrowRight />
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-700">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-slate-700 transition hover:text-slate-900"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="hidden min-h-dvh w-1/2 overflow-hidden bg-[#FAFAF8] lg:block"
      >
        <AuthSidePanel variant="register" />
      </motion.div>
    </div>
  );
};

export default RegisterPage;
