import React, { useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import { SiGmail } from "react-icons/si";

import Navbar from "../components/navbar/Navbar";
import Footer from "../components/footer/Footer";
import Background from "../components/background/Background";
import "../components/background/Background.css";

import profileImg from "../assets/profile.webp";

const AboutUsPage = () => {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-dvh relative bg-[#FFFEFC] text-slate-900">
      <Background />
      <div className="relative z-10">
        <Navbar />

        <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
          {/* Header */}
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)] md:p-8 card-fx">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 font-mono">
              About us
            </p>
            <h1 className="brand-gradient-text mt-3 text-4xl font-black md:text-5xl">
              SkillSetu
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-900 md:text-base">
              A peer-to-peer skill exchange platform connecting learners and
              experts worldwide.
            </p>
          </section>

          {/* Mission & Vision */}
          <section className="grid gap-6 py-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-900/[0.04] p-5 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
              <h2 className="mb-2 text-xl font-semibold text-slate-700">
                Our Mission
              </h2>
              <p className="text-slate-700 leading-relaxed">
                To empower individuals to grow through collaborative learning
                and skill-sharing communities without financial barriers.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-900/[0.04] p-5 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
              <h2 className="mb-2 text-xl font-semibold text-slate-700">
                Our Vision
              </h2>
              <p className="text-slate-700 leading-relaxed">
                A global network where anyone can teach and learn any
                skill—seamlessly, affordably, and quickly.
              </p>
            </div>
          </section>

          {/* Developer Section */}
          <section className="py-12">
            <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">
              Meet the Developer
            </h2>

            <div className="flex flex-col items-center gap-8 rounded-2xl border border-slate-200 bg-slate-900/[0.04] p-6 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)] md:flex-row md:p-8">
              <div className="shrink-0">
                <div className="h-48 w-48 overflow-hidden rounded-full border-2 border-slate-300 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)] md:h-64 md:w-64">
                  <img
                    src={profileImg}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-slate-900">
                  Shashank Jaiswal
                </h3>
                <p className="mb-3 text-slate-700">Full Stack Developer</p>

                <p className="mb-5 text-slate-700 leading-relaxed">
                  I built <span className="brand-gradient-text">SkillSetu</span>{" "}
                  to make education accessible to everyone. This platform lets
                  people share knowledge without worrying about money. When I'm
                  not coding, I explore new technologies and design
                  user-friendly experiences.
                </p>

                <div className="flex justify-center gap-4 md:justify-start">
                  <a
                    href="https://www.linkedin.com/in/shashank-jaiswal-203b15289/"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-slate-900/[0.06] p-3 text-slate-600 transition hover:bg-slate-600 hover:text-slate-900"
                  >
                    <FaLinkedin size={22} />
                  </a>
                  <a
                    href="https://github.com/shashankjai"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-slate-900/[0.06] p-3 text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
                  >
                    <FaGithub size={22} />
                  </a>
                  <a
                    href="mailto:shashank3021195@gmail.com"
                    aria-label="Email Shashank Jaiswal"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-red-50 hover:text-red-700"
                  >
                    <SiGmail size={20} className="text-red-600" />
                    <span>shashank3021195@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-8 text-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
              <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
                Join the Skill Revolution
              </h2>
              <p className="mt-2 text-slate-700">
                Start teaching, learning, and growing with the{" "}
                <span className="brand-gradient-text">SkillSetu</span> community
                today.
              </p>
              <button className="mt-5 rounded-full bg-white px-8 py-3 font-semibold text-slate-700 transition hover:bg-slate-100">
                Explore Skills
              </button>
            </div>
          </section>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default AboutUsPage;

