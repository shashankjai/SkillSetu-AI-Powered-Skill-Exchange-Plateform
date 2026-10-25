// client/src/components/knovia/ui.jsx
// Small shared primitives for the Knovia workspace, matching SkillSetu's dark
// navy system (#0B1220 page, #111B2B cards, #172338 inset, #3478F6 actions).
import React from "react";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

export const Card = ({ className = "", children, as: Tag = "section", ...rest }) => (
  <Tag className={`rounded-xl border border-slate-800 bg-[#111B2B] ${className}`} {...rest}>
    {children}
  </Tag>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-400">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const BUTTON_STYLES = {
  primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:hover:bg-[#2563EB]",
  secondary: "border border-slate-700 bg-[#172338] text-slate-200 hover:bg-[#1d2b45]",
  danger: "border border-red-900/60 bg-red-950/40 text-red-300 hover:bg-red-950/70",
  ghost: "text-slate-300 hover:bg-[#172338]",
};

export const Button = ({ variant = "primary", loading = false, disabled, className = "", children, type = "button", ...rest }) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
    {...rest}
  >
    {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
    {children}
  </button>
);

const BADGES = {
  ready: { label: "Ready", cls: "border-teal-800/70 bg-teal-950/50 text-teal-300", Icon: CheckCircle2 },
  processing: { label: "Processing", cls: "border-amber-800/70 bg-amber-950/40 text-amber-300", Icon: Clock },
  failed: { label: "Failed", cls: "border-red-900/70 bg-red-950/40 text-red-300", Icon: AlertCircle },
};

export const StatusBadge = ({ status }) => {
  const b = BADGES[status] || BADGES.processing;
  const Icon = b.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${b.cls}`}>
      <Icon size={12} aria-hidden="true" className={status === "processing" ? "animate-pulse" : ""} />
      {b.label}
    </span>
  );
};

export const Pill = ({ children, tone = "neutral" }) => {
  const tones = {
    neutral: "border-slate-700 bg-[#172338] text-slate-300",
    blue: "border-blue-900/70 bg-blue-950/40 text-blue-300",
    teal: "border-teal-800/70 bg-teal-950/50 text-teal-300",
    amber: "border-amber-800/70 bg-amber-950/40 text-amber-300",
  };
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
};

export const EmptyState = ({ icon: Icon, title, body, action }) => (
  <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-700 bg-[#0F1829] px-6 py-10 text-center">
    {Icon && <Icon size={28} className="mb-3 text-slate-500" aria-hidden="true" />}
    <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
    {body && <p className="mt-1 max-w-md text-sm text-slate-400">{body}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorBanner = ({ message, onRetry }) =>
  message ? (
    <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3.5 py-2.5 text-sm text-red-200">
      <span className="flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{message}</span>
      {onRetry && <button onClick={onRetry} className="shrink-0 font-semibold underline underline-offset-2 hover:text-white">Retry</button>}
    </div>
  ) : null;

export const Spinner = ({ label = "Loading…" }) => (
  <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400" role="status">
    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
    {label}
  </div>
);

export const ProgressBar = ({ value, label }) => (
  <div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label || "Progress"}>
      <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  </div>
);

export const fieldClass =
  "w-full rounded-lg border border-slate-700 bg-[#0B1220] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50";

export const Field = ({ label, hint, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const formatBytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
