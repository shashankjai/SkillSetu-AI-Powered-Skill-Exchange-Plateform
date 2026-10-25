import React from "react";
import { BookOpen, MessageSquareText, Sparkles, Users } from "lucide-react";

const COPY = {
  login: {
    eyebrow: "Welcome back",
    title: "Learn with people, not just courses.",
    text: "Book sessions, swap skills, and build a stronger learning network with trusted peers.",
  },
  register: {
    eyebrow: "Join the network",
    title: "Exchange knowledge, not just messages.",
    text: "Meet peers, teach what you know, and learn in a friendly skill-sharing community.",
  },
};

const POINTS = [
  { icon: Users, title: "Smart skill matching", text: "Find peers who teach what you want to learn." },
  { icon: BookOpen, title: "AI learning roadmaps", text: "A step-by-step plan for any skill you pick." },
  { icon: MessageSquareText, title: "Chat and live sessions", text: "Talk, schedule and learn together." },
  { icon: Sparkles, title: "Rated sessions", text: "Rate each other after every session." },
];

/** Text-only brand panel shown beside the auth form on large screens. */
const AuthSidePanel = ({ variant = "login" }) => {
  const c = COPY[variant] || COPY.login;
  return (
    <div className="dot-grid relative flex h-full w-full flex-col justify-center overflow-hidden border-l border-slate-200 bg-[#FAFAF8] px-10 py-12 xl:px-16">
      <div aria-hidden="true" className="blob -right-20 -top-16 h-72 w-72 bg-slate-300/50" />
      <div aria-hidden="true" className="blob blob-b -bottom-20 -left-16 h-72 w-72 bg-teal-100/70" />

      <div className="relative z-10 max-w-lg">
        <p className="eyebrow">{c.eyebrow}</p>
        <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-slate-900 xl:text-5xl">
          {c.title}
        </h2>
        <span className="bar-grow mt-5 block h-[3px] w-12 rounded-full bg-teal-700" />
        <p className="mt-5 text-base leading-relaxed text-slate-600">{c.text}</p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {POINTS.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              style={{ animationDelay: `${300 + i * 90}ms` }}
              className="rise rounded-xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:border-teal-700 hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,0.35)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                <Icon size={18} aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
              <p className="mt-1 text-[13px] leading-snug text-slate-600">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AuthSidePanel;
