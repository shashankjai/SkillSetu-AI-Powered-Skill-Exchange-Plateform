# SkillSetu: Peer-to-Peer Skill Exchange Platform

> Teach what you know. Learn what you want.

SkillSetu is a full-stack MERN application where people exchange skills with each other instead of paying for courses. You list what you can teach and what you want to learn; AI finds people whose skills fit yours; you book a session, chat, meet by video and rate each other afterwards.

## Features

| Area | What it does |
| --- | --- |
| Accounts | Register / login with JWT, hashed passwords (bcrypt), role-based access (user, admin), blocked accounts are refused |
| AI skill matching | Compares skills by meaning (Gemini embeddings), ranks candidates, shows a compatibility score and a short reason |
| AI learning roadmaps | Generates a phase-by-phase plan (topics, exercises, projects, capstone) for a chosen skill; saved per user |
| AI learning assistant | RAG chatbot: answers from a knowledge base (platform guide + learning material), shows its sources, streams the answer |
| Sessions | Request, accept, reschedule, complete or cancel; both people can rate (1 to 5) and leave feedback |
| Chat and video | Private chat per session (text, image, video, audio) and WebRTC video calls for accepted sessions |
| Notifications | Real-time notifications for requests, acceptances, reminders, cancellations and feedback |
| Reports and admin | Users can report a session partner; admins manage users, skills, sessions, reports and see analytics |

## Tech stack

- **Frontend:** React 18, Vite 6, Tailwind CSS v4, Redux Toolkit, React Router, Framer Motion, Socket.io client
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, bcryptjs, Multer
- **AI:** Google Gemini (`@google/generative-ai`): chat model + embeddings

## Run it locally

Requirements: Node.js 18+, a MongoDB instance, and a Google AI Studio API key.

```bash
# 1. backend
cd backend
cp .env.example .env        # then fill in MONGO_URI, JWT_SECRET, GOOGLE_AI_API_KEY and the ADMIN_* values
npm install
npm start                   # http://localhost:5000

# 2. frontend (new terminal)
cd client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

On first start the backend creates the admin account from the `ADMIN_*` variables and, in the background, builds the AI assistant's knowledge base (set `RAG_AUTO_SEED=false` to skip). To rebuild it manually: `npm run seed:knowledge` (or `POST /api/admin/knowledge/reseed` as admin).

### Scripts

| Where | Command | Purpose |
| --- | --- | --- |
| backend | `npm start` | start the API |
| backend | `npm test` | run the Jest tests |
| backend | `npm run seed:knowledge` | (re)build the RAG knowledge base |
| client | `npm run dev` | development server |
| client | `npm run build` | production build |

## Project structure

```
backend/
  controllers/   request handlers (auth, user, sessions, match, roadmap, chatbot, admin, reports ...)
  services/      aiService (Gemini), ragService (retrieval), chatbotService, matchingService, roadmapService
  models/        Mongoose schemas
  data/          starter knowledge-base documents
  middlewares/   JWT auth, role check, uploads
  tests/         Jest tests
client/src/
  pages/         Home, Login, Register, Profile, Explore (skill matching), Roadmap, Chat, AI Assistant, Admin ...
  components/    navbar, footer, chat, session, video, admin, common helpers (Reveal, Typewriter, ...)
  redux/         auth, notifications, admin, profile slices
  index.css      design system (colour palette, cards, animations)
```

## How the AI assistant works (RAG)

1. The question is embedded (`RETRIEVAL_QUERY`) and compared with the stored knowledge chunks (`RETRIEVAL_DOCUMENT` embeddings) by cosine similarity, combined with a keyword score. If the embedding API is unavailable, keyword retrieval still works.
2. The best chunks are placed in a prompt that tells the model to answer only from that material, and to treat the user's text and the chat history as data, not instructions.
3. The answer streams back as Server-Sent Events (`POST /api/chatbot/message/stream`) and is saved with its sources.

Models and retrieval settings are configurable through environment variables (see `backend/.env.example`).

## Security notes

- Every API route except login/register requires a valid JWT; admin routes also check the role.
- Session chat, video calls, notifications, reports and roadmaps are limited to their participants/owners.
- Inputs are validated (types, lengths, ids, rating range); passwords are 6 to 72 characters; failed logins are rate limited per email and IP; profile links must be http(s).
- Uploaded files are not committed (`backend/uploads` is git-ignored).

## Design

Colour palette: paper `#FFFEFC`, ink `#111111`, muted `#484848`, lines `#DADADA`, blue `#2166F3`. Fonts: Fredoka (headings), Inter (text), JetBrains Mono (labels). The palette lives in `client/src/index.css`; changing it there re-themes the whole app. Animations respect `prefers-reduced-motion`.

See `CHANGELOG.md` for the list of changes made in the redesign and audit.
