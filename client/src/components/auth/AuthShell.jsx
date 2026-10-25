// client/src/components/auth/AuthShell.jsx
// Shared layout for Login and Register: form on the left, product summary on the right.
import React from "react";
import { Link } from "react-router-dom";
import { Users, FileText, ListChecks } from "lucide-react";
import { BrandMark } from "../navbar/Navbar";

const POINTS = [
  { icon: Users, title: "Find learning partners", text: "Skills are matched by meaning, so “JS” can find someone who teaches “JavaScript”." },
  { icon: FileText, title: "Study from your own PDFs", text: "Ask questions and get answers with the page they came from." },
  { icon: ListChecks, title: "Test what you know", text: "Generate quizzes from your material and track your progress." },
];

export const inputClass =
  "h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
    <main className="flex flex-col px-4 py-8 sm:px-8">
      <Link to="/" aria-label="SkillSetu home" className="self-start"><BrandMark /></Link>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6 rounded-xl border border-line bg-surface p-6 shadow-card">{children}</div>
        <p className="mt-5 text-center text-sm text-muted">{footer}</p>
      </div>
    </main>

    <aside className="hidden bg-navy px-12 py-12 text-white lg:flex lg:flex-col lg:justify-center" aria-label="About SkillSetu">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-medium text-[#93C5FD]">Learn together. Exchange skills. Grow further.</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight">A trusted place to exchange skills and build knowledge.</h2>
        <ul className="mt-10 space-y-6">
          {POINTS.map(({ icon: Icon, title: t, text }) => (
            <li key={t} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10"><Icon size={20} aria-hidden="true" /></span>
              <div>
                <p className="text-sm font-semibold">{t}</p>
                <p className="mt-0.5 text-sm text-[#CBD5E1]">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  </div>
);

export default AuthShell;
