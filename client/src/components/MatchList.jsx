import React from "react";
import { FiCalendar, FiClock, FiUser, FiMail, FiTag } from "react-icons/fi";

const MatchList = ({
  matches,
  handleScheduleSession,
  sendSessionRequest,
  setSessionDate,
  setSessionTime,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {matches.length > 0 ? (
        matches.map((match) => (
          <div
            key={match.user._id}
            className="rounded-xl border border-slate-200 bg-white p-6 text-slate-900 transition hover:border-slate-200 card-fx"
          >
            {/* User Info */}
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <span className="text-lg font-bold">
                  {match.user.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 truncate">
                  {match.user.name}
                </h3>
                <p className="flex items-center gap-1 text-sm text-slate-600 truncate">
                  <FiMail size={14} />
                  {match.user.email}
                </p>
              </div>
            </div>

            {/* Matched Skills */}
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h4 className="mb-2 text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <FiTag size={14} />
                Matched Skills
              </h4>
              {match.matchedSkills.length > 0 ? (
                <div className="space-y-2">
                  {match.matchedSkills.map((matchSkill, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg bg-slate-900/[0.04] px-3 py-2 text-sm"
                    >
                      <span className="text-slate-700 font-medium">
                        {matchSkill.teachSkill}
                      </span>
                      <span className="text-slate-500">→</span>
                      <span className="text-green-600">
                        {matchSkill.learnSkill}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No matched skills</p>
              )}
            </div>

            {/* Date & Time Inputs */}
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <FiCalendar size={14} />
                  Select Date
                </label>
                <input
                  type="date"
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <FiClock size={14} />
                  Select Time
                </label>
                <input
                  type="time"
                  onChange={(e) => setSessionTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-5 flex gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => sendSessionRequest(match.user._id)}
                className="flex-1 rounded-full bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700 active:scale-[0.97]"
              >
                Send Request
              </button>
              <button
                onClick={() => handleScheduleSession(match.user._id)}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Schedule
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-slate-100 p-4 mb-3">
            <FiUser size={24} className="text-slate-500" />
          </div>
          <p className="text-slate-600">No matches available at the moment.</p>
          <p className="text-sm text-slate-500">Try updating your skills to find better matches.</p>
        </div>
      )}
    </div>
  );
};

export default MatchList;