// client/src/components/knovia/KnoviaLayout.jsx
import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { BookOpenCheck, FileText, MessageSquareText, ListChecks, CalendarCheck2, LineChart, LayoutGrid } from "lucide-react";
import Navbar from "../navbar/Navbar";

const TABS = [
  { to: "/knovia", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/knovia/documents", label: "Study Documents", icon: FileText },
  { to: "/knovia/ask", label: "Ask My PDFs", icon: MessageSquareText },
  { to: "/knovia/quizzes", label: "AI Quizzes", icon: ListChecks },
  { to: "/knovia/study-plans", label: "Study Plans", icon: CalendarCheck2 },
  { to: "/knovia/progress", label: "Learning Progress", icon: LineChart },
];

const tabClass = ({ isActive }) =>
  `flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition ${
    isActive ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
  }`;

const KnoviaLayout = () => (
  <div className="min-h-screen bg-[#0B1220] text-slate-100">
    <Navbar />
    <div className="border-b border-slate-800 bg-[#0E1626]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 pt-4">
          <BookOpenCheck size={20} className="text-blue-400" aria-hidden="true" />
          <span className="text-base font-bold text-white">Knovia</span>
          <span className="text-sm text-slate-500">Learn smarter. Know more.</span>
        </div>
        <nav aria-label="Knovia sections" className="-mb-px mt-1 flex gap-1 overflow-x-auto">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={tabClass}>
              <Icon size={15} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Outlet />
    </main>
  </div>
);

export default KnoviaLayout;
