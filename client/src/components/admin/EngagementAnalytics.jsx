import React, { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchEngagementStats } from "../../redux/slices/adminSlice";
import { FaFacebookF, FaTwitter, FaLinkedinIn } from "react-icons/fa";

// Helper to turn zero-based index into ordinal label
// Helper to turn zero-based index into ordinal label
const getOrdinal = (i) => {
  const n = i + 1;
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
};

const UserCardInner = ({ user, rank }) => {
  const {
    name,
    email,
    skillsToTeach,
    skillsToLearn,
    role,
    profilePicture,
    socials,
    status,
    sessionCount,
  } = user;

  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
  const defaultAvatar = "/default-avatar.png";

  // Memoize computed values for performance
  const ordinal = useMemo(() => getOrdinal(rank), [rank]);
  const pictureUrl = useMemo(
    () =>
      profilePicture
        ? `${API_URL}/uploads/profile-pictures/${profilePicture}`
        : defaultAvatar,
    [profilePicture],
  );
  const teachSkills = useMemo(
    () =>
      skillsToTeach.map((skill, i) => (
        <span
          key={i}
          className="text-xs bg-slate-600 text-slate-700 px-2 py-1 rounded-full"
        >
          {skill}
        </span>
      )),
    [skillsToTeach],
  );
  const learnSkills = useMemo(
    () =>
      skillsToLearn.map((skill, i) => (
        <span
          key={i}
          className="text-xs bg-slate-600 text-slate-700 px-2 py-1 rounded-full"
        >
          {skill}
        </span>
      )),
    [skillsToLearn],
  );

  return (
    <div className="relative bg-white border border-slate-300 rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-200 mb-6">
      {/* Golden Ribbon */}
      <div className="absolute top-0 left-0">
        <span className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-3 py-1 rounded-br-lg">
          #{ordinal}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center px-6 py-4 bg-slate-100 text-slate-900">
        <img
          className="h-14 w-14 rounded-full object-cover border-2 border-white"
          src={pictureUrl}
          alt={`${name}'s avatar`}
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = defaultAvatar;
          }}
        />
        <div className="ml-4">
          <h3 className="text-xl font-semibold">{name}</h3>
          <p className="text-sm opacity-90">{email}</p>
        </div>
        <span className="ml-auto bg-white text-slate-700 text-sm font-medium px-3 py-1 rounded">
          {sessionCount} session{sessionCount !== 1 && "s"}
        </span>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-4 text-left">
        <div className="flex flex-wrap gap-8 text-slate-700 justify-start">
          <div>
            <h4 className="font-medium">Role</h4>
            <p className="mt-1">{role}</p>
          </div>
          <div>
            <h4 className="font-medium">Status</h4>
            <p className="mt-1">{status || "—"}</p>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-slate-700">Skills To Teach</h4>
          <div className="flex flex-wrap gap-2 mt-1 justify-start">
            {skillsToTeach.length ? (
              teachSkills
            ) : (
              <span className="text-xs text-gray-500">None</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-slate-700">Skills To Learn</h4>
          <div className="flex flex-wrap gap-2 mt-1 justify-start">
            {skillsToLearn.length ? (
              learnSkills
            ) : (
              <span className="text-xs text-gray-500">None</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-slate-700">Socials</h4>
          <div className="flex space-x-4 mt-1">
            {socials.facebook && (
              <a
                href={socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook profile"
                className="text-slate-700 hover:text-slate-700 transition-colors"
              >
                <FaFacebookF size={20} />
              </a>
            )}
            {socials.twitter && (
              <a
                href={socials.twitter}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter profile"
                className="text-slate-700 hover:text-slate-700 transition-colors"
              >
                <FaTwitter size={20} />
              </a>
            )}
            {socials.linkedin && (
              <a
                href={socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn profile"
                className="text-slate-700 hover:text-slate-700 transition-colors"
              >
                <FaLinkedinIn size={20} />
              </a>
            )}
            {!socials.facebook && !socials.twitter && !socials.linkedin && (
              <span className="text-gray-500 text-sm">No links</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const UserCard = React.memo(UserCardInner, (prevProps, nextProps) => {
  const p = prevProps.user || {};
  const n = nextProps.user || {};
  // Shallow compare the important fields that affect rendering
  return (
    prevProps.rank === nextProps.rank &&
    p.userId === n.userId &&
    p.profilePicture === n.profilePicture &&
    p.sessionCount === n.sessionCount &&
    p.name === n.name &&
    p.email === n.email &&
    p.role === n.role &&
    p.status === n.status &&
    (p.skillsToTeach ? p.skillsToTeach.length : 0) ===
      (n.skillsToTeach ? n.skillsToTeach.length : 0) &&
    (p.skillsToLearn ? p.skillsToLearn.length : 0) ===
      (n.skillsToLearn ? n.skillsToLearn.length : 0)
  );
});

const EngagementAnalytics = () => {
  const dispatch = useDispatch();
  const hasFetchedRef = useRef(false);
  const { engagementStats, engagementLoading, engagementError } = useSelector(
    (state) => state.admin,
  );

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    dispatch(fetchEngagementStats());
  }, [dispatch]);

  const users = useMemo(
    () => engagementStats?.mostActiveUsers || [],
    [engagementStats],
  );
  const userCards = useMemo(
    () =>
      users.map((user, idx) => (
        <UserCard key={user.userId || idx} user={user} rank={idx} />
      )),
    [users],
  );

  if (engagementLoading) return <p className="p-6 text-gray-600">Loading...</p>;
  if (engagementError)
    return <p className="p-6 text-red-600">Error: {engagementError}</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-700 mb-6">
        Most Active Users
      </h1>
      <div>
        {users.length ? (
          userCards
        ) : (
          <p className="text-gray-500">No active user data available.</p>
        )}
      </div>
    </div>
  );
};

export default EngagementAnalytics;
