// client/src/pages/HomePage.jsx
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowRight, Bot, ChevronDown, Compass, MessageSquareText, Search, Star, Users, Video } from "lucide-react";
import Navbar from "../components/navbar/Navbar";
import Footer from "../components/footer/Footer";
import Reveal from "../components/common/Reveal";
import Typewriter from "../components/common/Typewriter";
import { spot } from "../utils/spot";

const features = [
  {
    icon: Users,
    title: "AI skill matching",
    text: "Tell SkillSetu what you can teach and what you want to learn. It compares skills by meaning, not just exact words, and shows how well each person fits with a short reason.",
  },
  {
    icon: Compass,
    title: "AI learning roadmaps",
    text: "Pick a skill and get a phase-by-phase plan with topics, exercises, projects and a capstone you can tick off as you go.",
  },
  {
    icon: Bot,
    title: "Learning assistant",
    text: "Ask how the platform works or get help with a topic. Answers come from the platform guide and show the sources they used.",
  },
  {
    icon: MessageSquareText,
    title: "Chat for every session",
    text: "Each accepted exchange gets a private chat for text, images, video and audio, so you can prepare together.",
  },
  {
    icon: Video,
    title: "Video calls",
    text: "Once a session is accepted, you and your partner can meet face to face when the scheduled time starts.",
  },
  {
    icon: Star,
    title: "Ratings and feedback",
    text: "After a session, both people can leave a 1 to 5 rating and feedback, so good teachers are easy to spot.",
  },
];

const steps = [
  { num: "01", title: "Define your profile", desc: "List the skills you want to learn and the skills you can teach." },
  { num: "02", title: "Discover your matches", desc: "AI skill matching finds people whose skills fit yours, with a compatibility score." },
  { num: "03", title: "Request and exchange", desc: "Send a session request. Once it is accepted, chat, schedule and meet by video." },
];

const faqs = [
  {
    q: "How does an exchange session work?",
    a: "You send a session request for a skill with a date and time. The other person can accept it. After that you can chat and meet by video when the session starts. Either of you can then mark it completed or canceled.",
  },
  {
    q: "When can I start a video call?",
    a: "Video calls are available after a request has been accepted, and only the two people in that session can join. The call opens when the scheduled session time starts.",
  },
  {
    q: "How do ratings work?",
    a: "After a session is completed, each participant can give a rating from 1 to 5 and short feedback. A person's average comes from the ratings other people gave them. New members show as New until they get their first rating.",
  },
  {
    q: "What can the AI assistant do?",
    a: "It answers questions about how SkillSetu works and helps with learning topics, using the knowledge base and showing its sources. AI can be wrong, so check anything important.",
  },
  {
    q: "What if someone behaves badly?",
    a: "You can report the other person from your session chat. Reports are reviewed by the admins, who can take action on the account.",
  },
];

const skillTags = [
  "React", "Node.js", "UI/UX Design", "Data Science", "Machine Learning", "Python",
  "Web Development", "DSA", "System Design", "MongoDB", "Public Speaking", "Figma",
];

const FaqItem = ({ q, a, index }) => {
  const [open, setOpen] = useState(false);
  const id = `faq-${index}`;
  return (
    <div className="card-fx bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-display text-lg font-semibold text-slate-900">{q}</span>
        <ChevronDown size={20} aria-hidden="true" className={`shrink-0 text-teal-700 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={id} role="region" className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <p className="overflow-hidden px-5 text-sm leading-relaxed text-slate-600">
          <span className="block pb-5">{a}</span>
        </p>
      </div>
    </div>
  );
};

const SectionHead = ({ no, label, title, children }) => (
  <Reveal className="mx-auto mb-10 max-w-2xl text-center">
    <p className="eyebrow">{no} / {label}</p>
    <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">{title}</h2>
    <span className="bar-grow mx-auto mt-4 block h-[3px] w-12 rounded-full bg-teal-700" />
    {children ? <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">{children}</p> : null}
  </Reveal>
);

const Home = () => {
  const reduxUser = useSelector((state) => state.auth.user);
  const isAuthenticated = Boolean(reduxUser) || Boolean(localStorage.getItem("token"));
  const heroRef = useRef(null);
  // a soft blue glow follows the cursor over the hero (CSS variables, no re-render)
  const moveGlow = (e) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--hx", `${e.clientX - r.left}px`);
    el.style.setProperty("--hy", `${e.clientY - r.top}px`);
    // gentle parallax for the illustration: -1 .. 1 across the hero
    el.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5) * 2));
    el.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5) * 2));
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#FFFEFC] font-sans text-slate-900">
      <Navbar />

      <main className="flex-1">
        {/* ------------------------------------------------------------ hero */}
        <section ref={heroRef} onMouseMove={moveGlow} className="relative overflow-hidden border-b border-slate-200">
          <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-0 z-0" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-500 [section:hover>&]:opacity-100" style={{ background: "radial-gradient(420px circle at var(--hx, 50%) var(--hy, 30%), rgba(33,102,243,0.10), transparent 70%)" }} />
          <div aria-hidden="true" className="blob -left-24 top-6 h-72 w-72 bg-teal-200/40" />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_1.2fr] lg:gap-8 lg:px-8 lg:py-12">
            <div>
              <p className="rise inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-800">
                <span className="h-2 w-2 animate-pulse rounded-full bg-teal-700" />
                <Typewriter words={["Peer-to-Peer Learning", "Teach What You Know", "Learn New Skills", "Build Together"]} />
              </p>

              <h1 className="rise mt-6 font-display text-4xl font-semibold leading-[1.08] text-slate-900 sm:text-5xl xl:text-6xl" style={{ animationDelay: "120ms" }}>
                Master new skills through direct <span className="shimmer">peer exchange</span>.
              </h1>

              <p className="rise mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg" style={{ animationDelay: "220ms" }}>
                SkillSetu connects what you know with what you want to learn. Trade expertise with motivated peers, build custom AI roadmaps, and accelerate your practical growth.
              </p>

              <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "320ms" }}>
                <Link to="/skill-matching" className="btn-primary group text-sm">
                  <Search size={17} /> Explore Skills
                </Link>
                {!isAuthenticated ? (
                  <Link to="/register" className="btn-secondary group text-sm">
                    Get Started <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <Link to="/learning-roadmap" className="btn-secondary text-sm">
                    <Compass size={17} /> View AI Roadmap
                  </Link>
                )}
              </div>
            </div>

            <div className="rise relative mx-auto w-full max-w-2xl" style={{ animationDelay: "260ms" }}>
              <div style={{ transform: "translate3d(calc(var(--px, 0) * 10px), calc(var(--py, 0) * 8px), 0)", transition: "transform 0.25s ease-out" }}>
              <img
                src="/images/hero-skillsetu.webp"
                width="947"
                height="705"
                alt="Illustration of four students collaborating around laptops, with cards that read Teach What You Know, Learn New Skills and Build Together above the SkillSetu app."
                className="float-y block h-auto w-full select-none"
                fetchpriority="high"
              />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ skills strip */}
        <div className="marquee overflow-hidden border-b border-slate-200 bg-[#FAFAF8] py-4" aria-label="Popular skills on SkillSetu">
          <div className="marquee-track" aria-hidden="true">
            {[...skillTags, ...skillTags].map((t, i) => (
              <span key={i} className="mx-6 inline-flex items-center gap-6 font-mono text-xs uppercase tracking-[0.18em] text-teal-700">
                {t}
                <span className="h-1.5 w-1.5 rounded-full bg-teal-700" />
              </span>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------ how it works */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHead no="01" label="how it works" title="How SkillSetu Works">
              Simple, transparent 3-step workflow designed for effective peer learning.
            </SectionHead>
            <Reveal stagger className="grid gap-4 md:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.num} onMouseMove={spot} style={{ "--i": i }} className="card-fx p-6">
                  <span aria-hidden="true" className="absolute right-5 top-3 font-display text-6xl font-semibold text-slate-200">
                    {step.num}
                  </span>
                  <p className="eyebrow">Step {step.num}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------ features */}
        <section className="border-y border-slate-200 bg-white py-12 sm:py-16">
          <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <Reveal className="mx-auto mb-5 max-w-3xl text-center">
              <p className="eyebrow">02 / features</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
                Everything you need to learn from real people
              </h2>
              <span className="bar-grow mx-auto mt-3 block h-[3px] w-12 rounded-full bg-teal-700" />
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                Matching, planning, chat, video and feedback in one place.
              </p>
            </Reveal>
            <Reveal className="mx-auto w-full max-w-[1180px]">
              <img
                src="/hero-image2.png"
                width="1486"
                height="1059"
                alt="SkillSetu features: skill matching, learning roadmaps, assistant, chat, video calls, and feedback"
                loading="lazy"
                style={{ width: "100%", height: "auto", objectFit: "contain" }}
                className="mx-auto block"
              />
            </Reveal>

            <Reveal stagger className="mx-auto mt-5 grid w-full max-w-[1280px] grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {features.map(({ icon: Icon, title, text }, i) => (
                <div key={title} onMouseMove={spot} style={{ "--i": i }} className="card-fx group flex flex-col bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
                      <Icon size={19} />
                    </span>
                    <h3 className="font-display text-base font-semibold leading-snug text-slate-900 sm:text-lg">{title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{text}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ------------------------------------------------------------ FAQ */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <SectionHead no="03" label="faq" title="Questions, answered">
              The basics of how exchanges work on SkillSetu.
            </SectionHead>
            <Reveal stagger className="space-y-3">
              {faqs.map((f, i) => (
                <div key={f.q} style={{ "--i": i }}>
                  <FaqItem q={f.q} a={f.a} index={i} />
                </div>
              ))}
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
