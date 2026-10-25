// src/pages/ProfileSettingsPage.jsx
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/slices/profileSlice";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import { FaEdit } from "react-icons/fa";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import defaultAvatar from "../assets/avatar.jpeg";
import Background from "../components/background/Background";
import "../components/background/Background.css";
import Footer from "../components/footer/Footer";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const ProfileSettingsPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    profilePicture: "",
    status: "",
    socials: { linkedin: "", facebook: "", twitter: "" },
    skillsToTeach: "",
    skillsToLearn: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
    currentPasswordVisible: false,
    newPasswordVisible: false,
    confirmNewPasswordVisible: false,
  });
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { "x-auth-token": token },
        });
        const data = res.data;
        setFormData({
          name: data.name || "",
          profilePicture: data.profilePicture || "",
          status: data.status || "",
          socials: data.socials || { linkedin: "", facebook: "", twitter: "" },
          skillsToTeach: data.skillsToTeach
            ? data.skillsToTeach.join(", ")
            : "",
          skillsToLearn: data.skillsToLearn
            ? data.skillsToLearn.join(", ")
            : "",
        });
        if (data.profilePicture) {
          setImagePreview(
            `${API_URL}/uploads/profile-pictures/${data.profilePicture}`,
          );
        }
      } catch {
        setMessage("Failed to load profile data.");
      }
    };
    fetchProfile();
  }, []);

  // Determine which avatar to show
  const avatarSrc = imagePreview
    ? imagePreview
    : formData.profilePicture
      ? `${API_URL}/uploads/profile-pictures/${formData.profilePicture}`
      : defaultAvatar;

  // Handle profile update

  const handleUpdate = async () => {
    const payload = new FormData();
    payload.append("name", formData.name);
    payload.append("status", formData.status);

    // Add each skill as a separate field in FormData
    const skillsToTeachArray = formData.skillsToTeach
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== ""); // Create an array of skills
    const skillsToLearnArray = formData.skillsToLearn
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== ""); // Create an array of skills

    // Append each skill separately to FormData
    skillsToTeachArray.forEach((skill, index) => {
      payload.append("skillsToTeach[]", skill); // The '[]' syntax will ensure they are treated as an array
    });

    skillsToLearnArray.forEach((skill, index) => {
      payload.append("skillsToLearn[]", skill); // Same for skillsToLearn
    });

    // Add socials and profile picture as usual
    payload.append("socials[linkedin]", formData.socials.linkedin);
    payload.append("socials[facebook]", formData.socials.facebook);
    payload.append("socials[twitter]", formData.socials.twitter);

    if (formData.profilePicture instanceof File) {
      payload.append("profilePicture", formData.profilePicture);
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`${API_URL}/api/users/profile`, payload, {
        headers: {
          "x-auth-token": token,
          "Content-Type": "multipart/form-data",
        },
      });
      dispatch(setUser(res.data));
      setMessage("Profile updated successfully!");
      navigate("/profile");
    } catch {
      setMessage("Update failed. Please try again.");
    }
  };
  // Handle password change
  const handlePasswordChange = async () => {
    if (passwords.newPassword !== passwords.confirmNewPassword) {
      setMessage("Passwords don't match!");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/users/change-password`,
        {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
        { headers: { "x-auth-token": token } },
      );
      setMessage("Password updated successfully!");
    } catch {
      setMessage("Password update failed. Please try again.");
    }
  };

  // Handle image upload & preview
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, profilePicture: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="relative min-h-dvh bg-[#FFFEFC] text-slate-900 flex flex-col font-sans">
      {/* Background layer */}
      <Background />

      {/* Foreground content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar />

        <div className="mx-auto my-8 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl sm:p-8">
          <h2 className="mb-4 text-2xl font-bold text-slate-900 tracking-tight">Edit Profile</h2>
          {message && (
            <div className="mb-4 rounded-xl border border-slate-300 bg-slate-100 p-3 text-sm text-slate-700">
              {message}
            </div>
          )}

          {/* Avatar + Upload */}
          <div className="mb-6 flex justify-center">
            <label htmlFor="profilePicture" className="cursor-pointer">
              <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-slate-300 bg-slate-100 shadow-lg shadow-slate-900/10">
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
                <div className="absolute top-0 right-0 m-1">
                  <FaEdit className="cursor-pointer rounded-full bg-white/90 p-1.5 text-teal-700 transition hover:bg-slate-600" />
                </div>
              </div>
            </label>
            <input
              type="file"
              id="profilePicture"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Form fields */}
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-1 block font-semibold text-slate-700"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="mb-1 block font-semibold text-slate-700"
              >
                Status
              </label>
              <input
                id="status"
                type="text"
                placeholder="Status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* LinkedIn URL */}
            <div>
              <label
                htmlFor="linkedin"
                className="mb-1 block font-semibold text-slate-700"
              >
                LinkedIn URL
              </label>
              <input
                id="linkedin"
                type="text"
                placeholder="LinkedIn URL"
                value={formData.socials.linkedin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socials: { ...formData.socials, linkedin: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Facebook URL */}
            <div>
              <label
                htmlFor="facebook"
                className="mb-1 block font-semibold text-slate-700"
              >
                Facebook URL
              </label>
              <input
                id="facebook"
                type="text"
                placeholder="Facebook URL"
                value={formData.socials.facebook}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socials: { ...formData.socials, facebook: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Twitter URL */}
            <div>
              <label
                htmlFor="twitter"
                className="mb-1 block font-semibold text-slate-700"
              >
                Twitter URL
              </label>
              <input
                id="twitter"
                type="text"
                placeholder="Twitter URL"
                value={formData.socials.twitter}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    socials: { ...formData.socials, twitter: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Skills You Can Teach */}
            <div>
              <label
                htmlFor="skillsToTeach"
                className="mb-1 block font-semibold text-slate-700"
              >
                Skills You Can Teach (comma-separated)
              </label>
              <input
                id="skillsToTeach"
                type="text"
                placeholder="e.g. JavaScript, Design"
                value={formData.skillsToTeach}
                onChange={(e) =>
                  setFormData({ ...formData, skillsToTeach: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Skills You Want to Learn */}
            <div>
              <label
                htmlFor="skillsToLearn"
                className="mb-1 block font-semibold text-slate-700"
              >
                Skills You Want to Learn (comma-separated)
              </label>
              <input
                id="skillsToLearn"
                type="text"
                placeholder="e.g. Go, Machine Learning"
                value={formData.skillsToLearn}
                onChange={(e) =>
                  setFormData({ ...formData, skillsToLearn: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>

          <button
            onClick={handleUpdate}
            className="mt-6 w-full rounded-lg bg-slate-800 py-3 font-semibold text-white transition hover:bg-teal-700"
          >
            Save Changes
          </button>

          {/* Change Password */}
          <div className="mt-8 space-y-6 border-t border-slate-200 pt-6">
            {[
              {
                key: "currentPassword",
                placeholder: "Current Password",
                visibleKey: "currentPasswordVisible",
                label: "Current Password",
                id: "currentPassword",
              },
              {
                key: "newPassword",
                placeholder: "New Password",
                visibleKey: "newPasswordVisible",
                label: "New Password",
                id: "newPassword",
              },
              {
                key: "confirmNewPassword",
                placeholder: "Confirm New Password",
                visibleKey: "confirmNewPasswordVisible",
                label: "Confirm New Password",
                id: "confirmNewPassword",
              },
            ].map(({ key, placeholder, visibleKey, label, id }) => (
              <div key={key} className="relative">
                <label
                  htmlFor={id}
                  className="mb-1 block font-semibold text-slate-700"
                >
                  {label}
                </label>
                <input
                  id={id}
                  type={passwords[visibleKey] ? "text" : "password"}
                  placeholder={placeholder}
                  value={passwords[key]}
                  onChange={(e) =>
                    setPasswords((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-slate-100 p-3 text-slate-900 placeholder:text-slate-500 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
                <div
                  className="absolute right-3 top-10 cursor-pointer text-slate-600 transition hover:text-slate-700"
                  onClick={() =>
                    setPasswords((prev) => ({
                      ...prev,
                      [visibleKey]: !prev[visibleKey],
                    }))
                  }
                >
                  {passwords[visibleKey] ? (
                    <AiOutlineEyeInvisible />
                  ) : (
                    <AiOutlineEye />
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={handlePasswordChange}
              className="w-full rounded-lg bg-rose-600 py-3 font-semibold text-white transition hover:bg-rose-500"
            >
              Change Password
            </button>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
