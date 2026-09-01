# Product Requirements Document (v2.0): TermPlayer

> **Status:** Active build spec. This document is the single source of truth for scope and intent.
> Companion docs: `architecture.md` (how it's built), `features.md` (detailed per-feature spec),
> `tasks.md` (ordered execution checklist), `README.md` (end-user facing).
> **This doc supersedes the v1.0 PRD.** Anything in v1.0 not restated here is still valid; anything
> that conflicts, this document wins.

---

## 1. Introduction

### 1.1 Purpose
Define the requirements for **TermPlayer v2**, a production-grade, terminal-based, fully
keyboard-driven music player built on Node.js. v2 adds an indexed offline library, an online
fallback source (Jamendo API) for tracks not present locally, local caching of streamed tracks for
true future offline playback, and the packaging/hardening needed for public, unattended use by
strangers on the internet — not just the original author.

### 1.2 Target Audience
- Developers and terminal-first power users who want a GUI-free music player.
- Users with a local `songs/` folder of music who occasionally want to play a track they don't have,
  without leaving the terminal.
- Contributors and AI coding agents extending this codebase (see §1.4).

### 1.3 Scope (v2)
In scope:
- Everything in v1 (local scan, playback controls, progress bar, raw-mode keyboard nav).
- Persistent offline library index (fast startup, ID3 metadata).
- Online track resolution via the Jamendo API when a searched track isn't in the local library.
- Local caching (real audio file, not just a URL) of any track streamed from Jamendo, so it becomes
  a first-class offline track on next launch.
- API key configuration flow (`.env`, first-run setup, validation, graceful degradation when absent).
- Volume control.
- Production hardening: structured logging, error boundaries, cross-platform VLC discovery,
  automated tests, npm packaging for global install (`npm i -g`).

Out of scope (v2):
- GUI/TUI beyond the existing terminal render loop (no `blessed`/`ink` framework migration).
- Paid/DRM-restricted streaming services (Spotify, Apple Music, etc.) — see `architecture.md §2` for
  why these were rejected.
- Mobile or web clients.
- User accounts / multi-user profiles.
- Playlist sharing or social features.

### 1.4 Audience note for AI coding agents
If you (an AI agent, e.g. Antigravity/Gemini or similar) are implementing this: treat
`architecture.md` and `tasks.md` as binding. Do not invent alternate libraries, endpoints, or file
layouts not named in those documents. If a requirement here is ambiguous, prefer the narrowest
interpretation consistent with `features.md`'s acceptance criteria, and leave a `// TODO(spec):`
comment rather than guessing silently.

---

## 2. Goals & Success Criteria

| Goal | Success signal |
|---|---|
| Zero-friction local playback | `npx termplayer` in a folder with mp3s plays music with no config |
| Never a dead end when a song is missing locally | Missing track triggers an online search prompt automatically |
| Offline-first, online-optional | App is 100% functional with `songs/` only and no API key set |
| Anyone can run it | Clear install docs, one env var for the optional feature, works on macOS/Linux/Windows (WSL) |
| An AI agent can build/extend it without hallucinating | `architecture.md` + `tasks.md` fully specify file paths, function signatures, and data shapes |

## 3. Non-Goals
- We are not building a music *discovery* platform. Online search exists to backfill a missing
  track, not to be a Spotify clone.
- We are not attempting to legally clear or proxy copyrighted commercial catalogs. Jamendo was
  chosen specifically because its catalog is Creative Commons and its `/tracks` endpoint legally
  returns downloadable audio (see `architecture.md §2.3`).

## 4. Users & Use Cases
1. **The power user** — has a curated `songs/` folder, wants keyboard-only playback with a progress
   bar. (v1, unchanged.)
2. **The incomplete-library user** — is browsing their playlist, picks a song they thought they had,
   it's not there. Instead of an error, the app offers to find it online and play it.
3. **The offline commuter** — previously streamed a Jamendo track; wants it to "just be there" next
   time, without internet. The cache-on-stream behavior handles this.
4. **The new contributor / AI agent** — clones the repo, needs to understand scope and constraints
   fast without spelunking through code. These five docs are that entry point.

## 5. Feature Summary (detail in `features.md`)
- F1 Local File Discovery *(v1, retained)*
- F2 Keyboard Navigation *(v1, retained)*
- F3 Playback Controls: Play/Pause/Resume/Stop *(v1, retained)*
- F4 Progress Bar & elapsed/duration display *(v1, retained)*
- F5 Persistent Offline Library Index *(new)*
- F6 Online Fallback Search & Playback via Jamendo *(new)*
- F7 Stream-to-Cache (online tracks become permanent offline tracks) *(new)*
- F8 API Key Setup & Management *(new)*
- F9 Volume Control *(promoted from v1 roadmap)*
- F10 ID3 Metadata Display (artist/album) *(promoted from v1 roadmap)*
- F11 Structured Error Handling & Logging *(new, production requirement)*
- F12 Cross-Platform VLC Discovery *(new, production requirement)*
- F13 npm Packaging & Global Install *(new, production requirement)*
- F14 License Compliance Gate *(new, release-blocking — governs whether F7 is enabled)*

## 6. Constraints & Assumptions
- VLC remains the playback engine (`--extraintf http`), per v1. This is unchanged in v2 — no native
  audio library migration (that stays a documented future item, not built now).
- Jamendo's free tier client_id is sufficient, *technically*, for catalog reads (search +
  stream/download URL retrieval). No OAuth2 user login is required for this app's feature set —
  OAuth is only needed for writing to a *user's* Jamendo account (favorites/playlists), which is
  explicitly out of scope. **This is a technical assumption only — it is not a substitute for the
  licensing/terms confirmation required below.**
- Node.js >= 18 (native `fetch`, no need for axios as a hard dependency, though it may still be used).
- CLI argument parsing uses `commander` (see `architecture.md §12`) rather than hand-rolled
  `process.argv` parsing, for `--songs-dir`, `--clear-cache`, `--no-online`, `--help`, `--version`.
- The app must run with **zero** internet access and **zero** API key configured, falling back to
  pure v1 behavior (local-only), with online features simply hidden/disabled, not erroring.
- **Licensing is a release gate, not an assumption.** Jamendo is selected as the *initial* online
  provider because its API exposes catalog metadata and audio endpoints intended for integration —
  but TermPlayer must only cache and play tracks where the provider's current API terms and the
  applicable per-track license (`license_ccurl`) permit the intended use. Local caching (F7) ships
  disabled by default until `docs/COMPLIANCE.md` documents a completed review; see
  `architecture.md §2.2` and `features.md` F14 for the binding detail. This gate applies to Jamendo
  now and to any additional provider added later (§9).

## 7. Non-Functional Requirements
- **Reliability:** VLC child process must always be reaped on exit (`Ctrl+C`, crash, song end). No
  zombie processes, no orphaned HTTP servers.
- **Resilience:** Jamendo API failures (network down, bad key, rate limit, 0 results) must never
  crash the app — always degrade to a visible in-UI message and return control to the playlist view.
- **Performance:** Library load (local scan + cached index read) must render in well under 1s for a
  library of a few hundred files.
- **Security:** API keys are never hardcoded, never logged, never committed (`.env` + `.gitignore`).
- **Portability:** Works on macOS, Linux, and Windows (via WSL or native, given VLC is on PATH).

## 8. Risks
| Risk | Mitigation |
|---|---|
| VLC not installed / not on PATH | Detect at startup, show actionable install instructions per OS (F12) |
| Jamendo API changes/downtime | Isolate all Jamendo calls behind one provider module; fail soft |
| Cached online tracks silently filling disk | Cache dir is bounded/documented, user can clear via CLI flag |
| AI build agent hallucinating file structure | `architecture.md` fixes exact paths/module boundaries |

## 9. Roadmap (post-v2, not built now)
- Native Node audio playback (drop VLC dependency).
- Playlists & shuffle/queue.
- Additional CC-licensed providers beyond Jamendo (Free Music Archive, etc.) behind the same
  provider interface defined in `architecture.md`.