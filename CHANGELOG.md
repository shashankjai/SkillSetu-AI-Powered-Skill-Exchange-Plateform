# SkillSetu changelog (redesign + RAG/AI fixes)

## UI
- Light theme across all pages (final colours: see Colours below) (replaced the dark/blue theme in 34 files). Video call modal stays dark on purpose.
- New design system in `client/src/index.css`: Fredoka headings, Inter body, JetBrains Mono labels, pill buttons, `.card-fx` cards (lift, top line, cursor glow, 3D tilt), dot-grid, blobs, reveal/stagger/typewriter/marquee animations, reduced-motion support.
- `utils/spot.js` + `installGlobalSpot()` give every `.card-fx` its glow/tilt without per-component handlers.
- Home page rebuilt with the new hero illustration (right side), skills marquee, how-it-works and feature cards, CTA band.
- Navbar: scroll progress bar, desktop layout from `lg` (9 links did not fit at 768px). New Footer with CTA card, link columns, socials, back-to-top.
- Login/Register: photo replaced by the text panel `components/auth/AuthSidePanel.jsx`.
- Admin Analytics: photos replaced by icons.
- Every route fades in (`AnimatedRoutes` in `App.jsx`).
- New `NotFoundPage` (unknown routes no longer redirect to `/`).
- Removed unused/heavy assets (`loginReg.png`, `hero-img.png`, `users.jpg`, `sessions.jpg`, `reports.jpg`, `react.svg`, `vite.svg`, `temp.jsx`) and 35 test files from `backend/uploads`. About photo converted to webp (1.9 MB -> 45 KB). Added `.gitignore`.

## Colours (final): same palette as the portfolio
- Paper `#FFFEFC` / `#FAFAF8`, ink `#111111`, muted `#484848`, lines `#DADADA`, electric blue `#2166F3`, blue wash `#EEF4FF`.
- Done in one place: `client/src/index.css` re-points Tailwind's `slate` and `teal` scales to those colours, so every existing class (`text-slate-600`, `bg-slate-100`, `hover:bg-teal-700`, ...) follows the portfolio theme. Change the palette there to re-theme the whole app.
- Hero uses the blue illustration again (`public/images/hero-skillsetu.webp`).

## Roadmap page (redesigned)
- Layout: the generator form and the saved-roadmaps list sit side by side on top; the roadmap below uses the full width. Before, a tall right column ran down the page while the left column ended early.
- Phase explorer: a curriculum navigator on the left (numbered phases, duration, progress bar per phase, Previous/Next) and ONE phase at a time on the right, in two columns. The page stays short however many phases a roadmap has.
- Capstone section uses the portfolio colours instead of an amber gradient.
- Bug: the Generate button had white text on a white background (a gradient flattened by the restyle script). Fixed. The first click on an open phase also did nothing before; the accordion is gone, so that is moot.

## Home page: hero illustration
- New illustration (a transparent PNG converted to WebP with alpha). It is cropped tightly to its content: the original canvas was mostly empty on the left, which made the hero tall with a big gap. The hero padding was reduced too.
- Because the picture is truly transparent, there is no box around it any more (the earlier opaque image hid the blob/glow behind it and left a visible edge). The grey blob behind the hero is now blue.
- The picture moves slightly with the cursor and floats up and down. Section underlines draw themselves when the section scrolls into view.

## Project files
- `README.md` rewritten (features, stack, setup, scripts, RAG, security) and `.env.example` files added for backend and client.

## Home page
- The dark "Teach one skill. Learn another." card appeared twice at the bottom (once on the page, once in the footer). It now appears once, in the footer.
- New bento feature section (AI matching, roadmaps, assistant, chat, video calls, ratings), an FAQ accordion, and a cursor-following glow in the hero. Every statement was checked against the code.
- Removed claims I could not verify in the code or README ("free", "in a minute").

## Explore page
- The rating now sits next to the person's name as a star badge. Users without ratings show "New" instead of a made-up "5.0". Compatibility is a labelled bar, and "Teaches / Matches your goal" chips replace the old Compatibility/Rating box.

## Navbar and accent colour
- Navbar rebuilt in the portfolio's style: wordmark left, text links with a growing underline, one dark call-to-action on the right (Find a match / Get Started), bordered drop-down menu on mobile, scroll progress bar.
- Blue (`#2166F3`, the portfolio brand colour; via the `teal-*` classes) is the accent: eyebrow labels, icons, active/hover states, the shimmer gradient, scroll bar, card top line and glow, primary-button hover, focus ring and text selection.

## Responsive
- `min-h-screen`/`h-screen`/`vh` heights -> `dvh` (mobile browser bars no longer cut the layout).
- ProfileCard no longer overflows 320px screens; Roadmap level buttons stack on small screens; AI chat thread height adapts to the viewport and its input bar is sticky with safe-area padding.

## Bugs fixed
- 17 className template literals where a class was glued to the next one (e.g. `shadow-md${...}`), which silently disabled styles (AI assistant bubbles, notifications, profile, roadmap, chat, admin).
- Expired JWT is dropped on startup; any 401 on a protected call logs out and redirects to login (`api/setupAxios.js`).
- Toasts use the light theme.

## Backend audit: security and logic bugs fixed
- `GET /api/sessions/message/:sessionId`: any logged-in user could read any session's chat. Now only the two participants (or an admin).
- `POST /api/sessions/schedule`: any user could reschedule any session. Now participants only, with id/date validation.
- Video calls: anyone could read call details, end someone else's call, or read another user's call history. Now participants only (history: yourself or admin).
- `POST /api/notifications/send`: any user could send any message/type to any user. Now: valid existing recipient, message 1-300 chars, only `session_request` and `video_call_request` for normal users, 20 per minute limit (admins exempt).
- Removed `/api/notifications/send-reminder` and `/send-new-meeting-scheduled`: they mounted internal helpers `(session, message)` as Express handlers `(req, res)`, so they could never work.
- Session requests: recipient id/date/skill validated, cannot request yourself, recipient must exist.
- Completing/canceling a session: `status` is validated (any other value used to cancel the session), rating must be an integer 1-5, feedback max 500 chars, validators now run on update.
- Sessions never closed after both users gave feedback (the check read the old document and never saved the flag). Fixed.
- Auth: the routes declared express-validator rules but the controller never read the result (the check was commented out), so validation did nothing. Now enforced; name/email/password must be text (blocks `{ "$gt": "" }` NoSQL-injection payloads), password 6-72 chars, emails are lower-cased (old mixed-case accounts still match), 10 failed logins per email+IP per 15 min returns 429, and the admin login no longer answers differently from a normal wrong password.
- Profile update (`PUT /api/users/profile`): every field was overwritten even when not sent (a partial update wiped skills), the response contained the password hash, links were not checked (`javascript:` URLs), and users could set their own status to "blocked". All fixed.
- Change password: new password is validated (6-72 chars, must differ from the current one).
- Reports: the reporter came from the request body (anyone could report in someone else's name). Now it is the logged-in user, both people must be participants of the session, no self-reports, reason/description are validated, and raw error objects are no longer sent to the browser.
- Admin: user search text is regex-escaped (a raw regex could be slow or match everything); adding a user validates email/password/role; changing a user's email checks it is not taken; an admin can no longer delete, block or demote themselves; deleting a user also deletes their notifications, chatbot history and roadmaps (shared sessions are kept); report/skill ids are validated, report priority is checked against the model, skill names stay unique; admin password change needs 6-72 characters.
- Skill matching: blocked users no longer appear as matches, and at most 500 candidates are processed per request (`MATCH_MAX_CANDIDATES`).
- Privacy note, not changed because the UI shows it: match cards display every candidate's email address to every logged-in user. Consider hiding emails until a session is accepted.
- Chat: the "Start Video Call" button had white text on a white background and the mobile menu backdrop was fully white; both fixed.
- Removed debug `console.log` calls that printed whole session documents.
- CORS origins were already read from `FRONTEND_URL(S)`; nothing to change there.
- New tests: `tests/authorization.test.js`, `tests/auth.hardening.test.js`, `tests/admin.guards.test.js` and `tests/chatbot.stream.test.js` (not run here; the same checks were exercised with stubs and returned the expected 403/400).

## RAG / AI assistant
- Knowledge base is now seeded automatically on server start (background, idempotent, `RAG_AUTO_SEED=false` to disable), plus `npm run seed:knowledge` and `POST /api/admin/knowledge/reseed`.
- Embeddings use `taskType` (RETRIEVAL_DOCUMENT for stored text, RETRIEVAL_QUERY for questions).
- Hybrid retrieval: dense cosine + keyword overlap, keyword-only fallback if the embedding API fails, LRU cache for query embeddings; `RAG_TOP_K`, `RAG_SIMILARITY_THRESHOLD`, `RAG_MAX_CANDIDATES`, `RAG_KEYWORD_WEIGHT` env settings.
- The current user message no longer appears twice in the prompt (history excludes it).
- User text and history are wrapped in delimiters; forged delimiter tags are stripped; the prompt tells the model to ignore instructions inside them.
- Models come from env (`GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_EMBEDDING_MODEL`); one source of truth in `config/aiConstants.js`. Defaults were NOT checked against Google's docs.
- AI assistant page: Copy, Regenerate, 429 rate-limit countdown, sticky input.
- Streaming answers: new `POST /api/chatbot/message/stream` (Server-Sent Events: `token`, `done`, `error`). `aiService.generateTextStream` falls back to the secondary model only before the first piece of text. The page (`api/streamChat.js`) shows the answer as it is written and falls back to the old endpoint when the stream route returns 404. A failed turn now deletes the saved question, so "Retry" no longer leaves duplicate questions in the history.
- Knowledge base grew from 10 to 14 documents: session lifecycle, ratings and feedback, video calls/chat/notifications, AI assistant and roadmaps. Every statement was checked against the controllers and models.

## Preview
- `skillsetu-app-preview.html` (not part of the project) renders Home, About, Login, Register, Profile, Settings, Explore, Roadmap, Chat and AI Assistant with fake data (no backend). Admin pages are not in it. Streaming, video calls and sockets are replaced by stand-ins there.

## Not verified / not done
- Jest tests, MongoDB and the Gemini API were not available here: the new tests (`tests/rag.hybrid.test.js`) and the existing ones were not run. Backend files pass `node --check`; the whole client compiles with esbuild.
- A visual check of the logged-in pages in a real browser are still open.
