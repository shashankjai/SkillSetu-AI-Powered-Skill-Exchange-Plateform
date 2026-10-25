import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, ArrowUp } from "lucide-react";
import { FaGithub, FaLinkedin, FaTwitter } from "react-icons/fa";
import Reveal from "../common/Reveal";

const columns = [
  {
    title: "Explore",
    links: [
      { name: "Home", to: "/" },
      { name: "Skill Matching", to: "/skill-matching" },
      { name: "Learning Roadmap", to: "/learning-roadmap" },
      { name: "About Us", to: "/about-us" },
    ],
  },
  {
    title: "Your space",
    links: [
      { name: "AI Assistant", to: "/ai-assistant" },
      { name: "Chat & Sessions", to: "/chat" },
      { name: "Profile", to: "/profile" },
      { name: "Settings", to: "/profile-settings" },
    ],
  },
];

const socials = [
  { label: "GitHub", href: "https://github.com/shashankjai", Icon: FaGithub },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/shashank-jaiswal-203b15289/", Icon: FaLinkedin },
  { label: "Twitter", href: "https://twitter.com", Icon: FaTwitter },
];

const Footer = () => {
  const reduxUser = useSelector((state) => state.auth.user);
  const isAuthenticated = Boolean(reduxUser) || Boolean(localStorage.getItem("token"));

  return (
    <footer className="mt-20 border-t border-slate-200 bg-[#FAFAF8] print:hidden">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        {/* call to action */}
        <Reveal className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-10 sm:px-10">
          <div aria-hidden="true" className="blob -right-16 -top-16 h-56 w-56 bg-white/10" />
          <div aria-hidden="true" className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-teal-300">Peer-to-peer learning</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">Teach one skill. <span className="text-teal-300">Learn another.</span></h2>
              <p className="mt-2 max-w-md text-sm text-slate-300">Find someone who knows what you want to learn, and share what you already know.</p>
            </div>
            <Link
              to={isAuthenticated ? "/skill-matching" : "/register"}
              className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:bg-slate-200"
            >
              {isAuthenticated ? "Find a match" : "Create your account"}
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>

        {/* link grid */}
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to="/" className="font-display text-2xl font-semibold text-slate-900">SkillSetu</Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
              A learning network built around trust, exchange, and practical skill growth.
            </p>
            <div className="mt-5 flex gap-3">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-1 hover:bg-teal-700 hover:text-white"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {columns.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-teal-700">{title}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {links.map(({ name, to }) => (
                  <li key={name}>
                    <Link to={to} className="link-u text-slate-700 transition-colors hover:text-teal-700">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} SkillSetu. Built by{" "}
            <a
              href="https://myportfolio-i6su.onrender.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
            >
              Shashank Jaiswal
            </a>.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 font-mono uppercase tracking-[0.14em] text-teal-700 transition-colors hover:border-teal-700"
          >
            Back to top <ArrowUp size={14} className="transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
