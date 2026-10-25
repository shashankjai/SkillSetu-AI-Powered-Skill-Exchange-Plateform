import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const SkillsManagement = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [newSkill, setNewSkill] = useState({ name: "", description: "" });

  const loadSkills = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/api/admin/skills`, {
        headers: { "x-auth-token": token },
      });
      setSkills(data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load skills.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const createSkill = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await axios.post(`${API_URL}/api/admin/skills`, newSkill, {
        headers: { "x-auth-token": token },
      });
      setNewSkill({ name: "", description: "" });
      loadSkills();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to add skill.");
    }
  };

  const deleteSkill = async (skillId) => {
    if (!window.confirm("Deactivate this skill?")) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${API_URL}/api/admin/skills/${skillId}`, {
        headers: { "x-auth-token": token },
      });
      loadSkills();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to deactivate skill.");
    }
  };

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_30px_-18px_rgba(15,23,42,0.25)]">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-teal-700 font-mono">
          Catalog
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-900">
          Skills Management
        </h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 card-fx">
        <h3 className="mb-4 text-xl font-bold text-slate-900">Add skill</h3>
        <form onSubmit={createSkill} className="grid gap-4 md:grid-cols-2">
          <input
            value={newSkill.name}
            onChange={(event) =>
              setNewSkill({ ...newSkill, name: event.target.value })
            }
            placeholder="Skill name"
            className="rounded-xl border border-slate-200 bg-slate-900/[0.04] px-3 py-2 text-slate-900 placeholder:text-slate-600"
            required
          />
          <input
            value={newSkill.description}
            onChange={(event) =>
              setNewSkill({ ...newSkill, description: event.target.value })
            }
            placeholder="Description"
            className="rounded-xl border border-slate-200 bg-slate-900/[0.04] px-3 py-2 text-slate-900 placeholder:text-slate-600"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-800 px-4 py-2 font-semibold text-white transition hover:bg-teal-700 md:col-span-2 active:scale-[0.97]"
          >
            Save skill
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 card-fx">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search skills..."
          className="w-full rounded-xl border border-slate-200 bg-slate-900/[0.04] px-3 py-2 text-slate-900 placeholder:text-slate-600"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-700">
          Loading skills...
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-[#FFFEFC]/40 p-8 text-center text-slate-700">
          No skills found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSkills.map((skill) => (
            <div
              key={skill._id}
              className="rounded-2xl border border-slate-200 bg-white p-4 card-fx"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">{skill.name}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${skill.active === false ? "bg-slate-200 text-slate-900" : "bg-emerald-500/20 text-emerald-700"}`}
                >
                  {skill.active === false ? "Inactive" : "Active"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">
                {skill.description || "No description"}
              </p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                <span>{skill.count || 0} users</span>
                <button
                  type="button"
                  onClick={() => deleteSkill(skill._id)}
                  className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white"
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkillsManagement;
