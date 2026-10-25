import { FaLinkedin, FaTwitter, FaInstagram, FaGlobe } from "react-icons/fa";
import { FiMapPin } from "react-icons/fi";

export default function ProfileCard({ user }) {
  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

  return (
    <div className="w-full max-w-xs sm:w-80 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-900">
      {/* Profile Image */}
      <div className="relative inline-block">
        <img
          className="mx-auto h-28 w-28 rounded-full border-2 border-slate-300 object-cover"
          src={
            user?.profilePicture
              ? `${API_URL}/uploads/profile-pictures/${user.profilePicture}`
              : "/default-avatar.png"
          }
          alt={user?.name || "User"}
        />
        {user?.status && (
          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-200 bg-green-500"></span>
        )}
      </div>

      {/* User Info */}
      <h3 className="mt-4 text-xl font-semibold text-slate-900">
        {user?.name || "User"}
      </h3>
      
      {user?.title && (
        <p className="mt-1 text-sm text-slate-700">{user.title}</p>
      )}
      
      {user?.location && (
        <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-600">
          <FiMapPin size={12} />
          {user.location}
        </p>
      )}

      {/* Bio */}
      {user?.bio && (
        <p className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-700">
          {user.bio}
        </p>
      )}

      {/* Skills */}
      {user?.skills && user.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 border-t border-slate-200 pt-3">
          {user.skills.slice(0, 5).map((skill, index) => (
            <span
              key={index}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
            >
              {skill}
            </span>
          ))}
          {user.skills.length > 5 && (
            <span className="rounded-full bg-slate-900/[0.04] px-2.5 py-0.5 text-xs text-slate-600">
              +{user.skills.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Social Icons */}
      {(user?.socials?.linkedin || 
        user?.socials?.twitter || 
        user?.socials?.instagram ||
        user?.website) && (
        <div className="mt-4 flex justify-center gap-4 border-t border-slate-200 pt-4">
          {user.socials?.linkedin && (
            <a
              href={user.socials.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 transition hover:text-slate-700"
            >
              <FaLinkedin size={18} />
            </a>
          )}
          {user.socials?.twitter && (
            <a
              href={user.socials.twitter}
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 transition hover:text-slate-700"
            >
              <FaTwitter size={18} />
            </a>
          )}
          {user.socials?.instagram && (
            <a
              href={user.socials.instagram}
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 transition hover:text-pink-600"
            >
              <FaInstagram size={18} />
            </a>
          )}
          {user?.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noreferrer"
              className="text-slate-600 transition hover:text-slate-900"
            >
              <FaGlobe size={18} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}