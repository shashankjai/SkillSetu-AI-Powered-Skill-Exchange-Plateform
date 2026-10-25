# SkillSetu x Knovia — Audit & Implementation Plan

_Audit of the supplied `SkillSetu-FullStack-main` ZIP (Phase 1)._

## Stack as found
- **Backend:** Express 5, Mongoose 8, JWT in the `x-auth-token` header, Socket.IO (`/sessions`, `/notifications` namespaces), Multer 1.x, `@google/generative-ai`, Jest 30.
- **Frontend:** React 18 + Vite 6, Tailwind 4 (via `@tailwindcss/postcss`), Redux Toolkit (auth, skills, notifications, admin, profile), React Router 7, Axios called inline with `VITE_API_URL`, lucide-react icons, Framer Motion, react-toastify.
- **Visual language:** an established **dark navy** theme (`#0B1220` / `#111B2B` / `#172338`, accent `#3478F6`). The brief's palette is light; the existing system was **refined and kept**, not replaced (see "Design decisions").

## Feature checklist (what exists)
| Area | State | Notes |
|---|---|---|
| Auth (register/login/JWT, admin seed, blocked users) | Exists | Registration has no server-side validation (commented-out `validationResult`); tokens expire in 1h. Not changed. |
| Profile + skills (teach/learn as `[String]`) | Exists | Skills are free-text strings, no proficiency level in the model. |
| Semantic skill matching | Exists | `matchingService` + cached `SkillEmbedding`; falls back to exact match without an API key. |
| Skill-exchange sessions, chat, notifications, video call, reports, admin | Exist | Large `ChatPage` (37 KB) covers sessions + messaging. Not modified. |
| Roadmaps (AI) | Exists | Persisted `Roadmap` model (phases). **No progress persistence per phase** (`Roadmap` has no completion fields). |
| Chatbot (RAG) | Exists | Retrieves from **public, seeded `KnowledgeChunk`s only**. |
| Dashboard page | **Missing** | `/` is the landing page; no `/dashboard`. |
| PDF upload / study docs / quizzes / study plans / progress | **Missing** | This is the Knovia work. |
| Tests | Exist | 6 Jest suites in `backend/tests` (security, chatbot, matching, rag models/services, roadmap). Not runnable in the authoring sandbox (no network, no `node_modules`). |

## Findings that shape the implementation
1. **The existing "vector search" is not a vector index.** `ragService` loads up to 150 public chunks and computes cosine similarity in Node. That is fine for ~dozens of seeded public chunks but is not the right design for per-user PDFs. Knovia uses a separate `DocumentChunk` collection with an **owner-filtered MongoDB Atlas `$vectorSearch`** path and a clearly-labelled in-process cosine fallback. The existing chatbot is untouched.
2. **`server.js` serves the entire `backend/uploads/` directory publicly** (`express.static`). Private study PDFs are therefore stored in `backend/storage/study-documents/` (outside any static mount) and only streamed through an authenticated, ownership-checked route.
3. `middlewares/upload.js` has **no file-type or size limits** (used for avatars/message media). Left as-is to avoid breaking existing flows; Knovia uses its own strict uploader. Flagged for follow-up.
4. `aiService.js` comments say 768-dim but the real constant is **3072** (`gemini-embedding-001`). Knovia validates 3072 explicitly.
5. `aiService`/`aiConstants` reference model IDs `gemini-3.1-flash-lite` and `gemini-3.8-flash`. **I could not verify these IDs against the live API from the sandbox.** Knovia reuses them through `aiService` (single place to change) rather than introducing a second provider config.
6. Existing embeddings are generated **without a `taskType`**. Knovia adds optional `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` task types through a backward-compatible parameter.
7. Rate limiting is **in-memory per process** (three copy-pasted implementations). Knovia adds one shared limiter with the same limitation (documented; use Redis for multi-instance deployments).
8. Error responses use `{ msg }`. Knovia keeps that shape for consistency with the current frontend.

## Design decisions
- Knovia ships as `/api/knovia/*` and `/knovia/*` — **additive**; no existing route removed or renamed.
- Roadmap vs Study Plan: a **Roadmap** is a skill-acquisition curriculum (phases, topics, projects). A **Study Plan** is a time-boxed, document-grounded task list with trackable completion. They are different artifacts; the plan UI links to roadmaps rather than duplicating the generator.
- Quiz answers/explanations are **never sent to the client until an attempt is submitted**; scoring is server-side.
- Progress is **derived at read time from persisted attempts and task completions** — no stored counters, no streaks, no placeholder charts.

## Phases
1. Audit (this document) ✔
2. Design tokens + shell → incremental, Knovia workspace first
3. Existing AI UX polish (not started — see README "Known limitations")
4. Knovia document + RAG pipeline
5. Quizzes, study plans, progress
6. Integration (routes, navbar)
7. Tests
8. Documentation
