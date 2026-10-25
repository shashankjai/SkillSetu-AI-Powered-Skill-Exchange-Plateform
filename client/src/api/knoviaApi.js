// client/src/api/knoviaApi.js
// Single axios client for the Knovia endpoints. Uses the same VITE_API_URL and
// x-auth-token convention as the rest of the app. Secrets (Gemini keys) never
// live in the browser; all AI calls go through the backend.
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

const client = axios.create({ baseURL: `${API_URL}/api/knovia`, timeout: 120000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers["x-auth-token"] = token;
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

/** Human-readable message from any axios/server error. */
export const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
  if (err?.response?.data?.msg) return err.response.data.msg;
  if (err?.code === "ECONNABORTED") return "The request timed out. Please try again.";
  if (err?.message === "Network Error") return "Cannot reach the server. Check your connection.";
  return fallback;
};

export const knoviaApi = {
  // documents
  listDocuments: () => client.get("/documents").then((r) => r.data),
  uploadDocument: (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    return client
      .post("/documents", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data);
  },
  reprocessDocument: (id) => client.post(`/documents/${id}/reprocess`).then((r) => r.data),
  deleteDocument: (id) => client.delete(`/documents/${id}`).then((r) => r.data),
  // The file route needs the auth header, so fetch as a blob and open an object URL.
  openDocument: async (id) => {
    const res = await client.get(`/documents/${id}/file`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  // ask
  ask: (payload) => client.post("/ask", payload).then((r) => r.data),
  listConversations: () => client.get("/conversations").then((r) => r.data),
  getConversation: (id) => client.get(`/conversations/${id}`).then((r) => r.data),
  deleteConversation: (id) => client.delete(`/conversations/${id}`).then((r) => r.data),

  // quizzes
  generateQuiz: (payload) => client.post("/quizzes", payload).then((r) => r.data),
  listQuizzes: () => client.get("/quizzes").then((r) => r.data),
  getQuiz: (id) => client.get(`/quizzes/${id}`).then((r) => r.data),
  deleteQuiz: (id) => client.delete(`/quizzes/${id}`).then((r) => r.data),
  submitAttempt: (id, answers) => client.post(`/quizzes/${id}/attempts`, { answers }).then((r) => r.data),
  listAttempts: () => client.get("/quiz-attempts").then((r) => r.data),
  getAttempt: (id) => client.get(`/quiz-attempts/${id}`).then((r) => r.data),

  // study plans
  generatePlan: (payload) => client.post("/study-plans", payload).then((r) => r.data),
  listPlans: () => client.get("/study-plans").then((r) => r.data),
  getPlan: (id) => client.get(`/study-plans/${id}`).then((r) => r.data),
  setTask: (planId, taskId, completed) =>
    client.patch(`/study-plans/${planId}/tasks/${taskId}`, { completed }).then((r) => r.data),
  deletePlan: (id) => client.delete(`/study-plans/${id}`).then((r) => r.data),

  // progress
  getProgress: () => client.get("/progress").then((r) => r.data),
};
