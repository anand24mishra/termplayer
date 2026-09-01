# Feature Specifications: CLI Music Player v2

> Each feature has: description, keybinds/UI, acceptance criteria, and edge cases. Acceptance
> criteria are written to be directly checkable — an implementation is "done" when every bullet
> under it is true.

---

## F1 — Local File Discovery *(retained from v1)*
**Description:** On startup, scan `songs/` for audio files and list them.
**Acceptance criteria:**
- [ ] App reads `songs/` relative to CWD (or `SONGS_DIR` env override) using `fs.readdirSync`.
- [ ] Non-audio files (anything not `.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a`) are filtered out.
- [ ] If `songs/` doesn't exist, app creates it and shows an empty-library message instead of
      crashing.
- [ ] Files are also merged with anything in `.cache/tracks/` (F7 cached online tracks) into one
      unified list, sorted alphabetically by title.

## F2 — Keyboard Navigation *(retained from v1)*
**Keybinds:** `↑`/`↓` move cursor, `Enter` play selected, `Space` pause/resume, `s` stop, `Ctrl+C`
exit, **new:** `/` open online search (F6), `+`/`-` volume (F9).
**Acceptance criteria:**
- [ ] `process.stdin` is set to raw mode on start and restored to normal mode on every exit path
      (including uncaught-error paths).
- [ ] Cursor cannot move above the first item or below the last (no wraparound, to match v1 UX
      unless changed intentionally — if changed, document it in this file).

## F3 — Playback Controls *(retained from v1)*
**Acceptance criteria:**
- [ ] Play spawns VLC via `spawn` (never `exec`) with `-I dummy --extraintf http` plus the file path
      or stream URL as argv.
- [ ] Pause/Resume toggles VLC's pause via its HTTP status endpoint.
- [ ] Stop kills the VLC child process and resets state to `IDLE`.
- [ ] Starting a new track while one is playing first stops/kills the previous VLC process — no two
      VLC processes ever run concurrently.

## F4 — Progress Bar *(retained from v1)*
**Acceptance criteria:**
- [ ] Polls VLC's `status.json` on a 1s interval while `PLAYING`.
- [ ] Renders `[████------] mm:ss / mm:ss (Playing|Paused)`.
- [ ] Polling interval is cleared on stop/pause/exit — no leaked timers.

## F5 — Persistent Offline Library Index *(new)*
**Description:** Avoid re-scanning and re-tagging every file on every launch.
**Acceptance criteria:**
- [ ] `.cache/library-index.json` is read on startup; if its stored `songsDirHash` matches the
      current directory contents, it's used as-is (no re-tagging).
- [ ] If the hash differs (files added/removed/renamed), the app re-scans, re-tags with
      `music-metadata`, and rewrites the index file.
- [ ] Corrupt or unreadable index file is treated as a cache miss (rebuild), not a crash.
- [ ] Index rebuild does not block the first render for more than ~1s on a library of a few hundred
      files (may render "Loading library…" if it will take longer).

## F6 — Online Fallback Search & Playback (Jamendo) *(new)*
**Description:** When a user wants a track not present locally, search and play it from Jamendo.
**UI:** `/` opens a text input at the bottom of the screen; typing filters/queries; `Enter` on a
result plays it; `Esc` cancels back to the playlist view.
**Acceptance criteria:**
- [ ] `/` is only wired to online search if `JAMENDO_CLIENT_ID` is configured; if not, pressing `/`
      shows `"Set JAMENDO_CLIENT_ID to enable online search — see README.md"` and does not attempt
      a request.
- [ ] Query calls `GET https://api.jamendo.com/v3.0/tracks/?client_id=...&format=json&limit=10&search=<query>`.
- [ ] Results render as a temporary list (title — artist) with source marked distinctly (e.g. a `☁`
      prefix) from local tracks.
- [ ] Selecting a result plays it by pointing VLC at the Jamendo `audio` stream URL directly — no
      wait for download to complete before playback starts.
- [ ] Empty results, network failure, or non-200 response all render a single-line, human-readable
      error and return the user to normal browsing — never an uncaught exception.
- [ ] A search request in flight is cancelable (pressing `Esc` aborts it via `AbortController`).

## F7 — Stream-to-Cache (online tracks become permanent offline tracks) *(new, gated by F14)*
**Description:** Any track played via F6 is downloaded in the background so it's available offline
afterward — **only when F14's compliance gate for that track's license permits it.**
**Acceptance criteria:**
- [ ] Caching is controlled by a config flag `ENABLE_TRACK_CACHING`, default `false`, until
      `docs/COMPLIANCE.md` (F14) has a completed provider-level note. Streaming playback (F6) works
      regardless of this flag — only local persistence is gated.
- [ ] When enabled, on selecting an online result, `trackCache.js` first checks the track's
      `license_ccurl` against the allow-list defined in `docs/COMPLIANCE.md` (F14) before
      downloading. If the license isn't on the allow-list, caching is skipped for that track and it
      remains stream-only (F6) every time it's played — this is expected behavior, not an error.
- [ ] For an allowed track, `trackCache.js` downloads the `audiodownload` URL to
      `.cache/tracks/<id>.mp3` concurrently with playback (does not delay playback start).
- [ ] On successful download, `libraryIndex.js` upserts the track into the persistent index with
      `source: 'online-cached'`, a real `filePath` pointing at the cached file, and the recorded
      `license_ccurl` + artist attribution string (for F10 display, if the license requires
      attribution).
- [ ] On next app launch, a cached track appears in the normal local playlist — no distinction in
      playback behavior from a manually-added file, and no network access is needed to play it.
- [ ] Failed/partial downloads do not corrupt the index — a partial file is deleted, not registered.
- [ ] Cache directory size is never silently unbounded from the user's perspective: README documents
      how to clear it (`rm -rf .cache/tracks` is safe and documented).

## F14 — License Compliance Gate *(new, release-blocking)*
**Description:** TermPlayer must only cache and play tracks where the provider's current API terms
and the applicable track-level license permit the intended use. This is a release gate, not an
assumption made once at design time.
**Acceptance criteria:**
- [ ] `docs/COMPLIANCE.md` exists and, for each enabled online provider (Jamendo initially),
      documents: (a) whether client-side streaming playback is permitted, (b) whether local
      persistence of downloaded audio is permitted and under what license conditions, (c) any
      attribution requirement, with a link/date to the terms version reviewed.
- [ ] `ENABLE_TRACK_CACHING` defaults to `false` until that provider's note in `docs/COMPLIANCE.md`
      is marked complete — this is enforced in code (`config.js` default), not just documentation.
- [ ] Per-track gating: even once caching is enabled generally, `trackCache.js` checks each track's
      individual `license_ccurl` against the allow-list in `docs/COMPLIANCE.md` before persisting —
      a provider-level "yes" does not blanket-approve every track if licenses vary per track.
- [ ] If an attribution requirement is documented, the cached/now-playing UI (F10) surfaces artist
      attribution for that track, not just as flavor text but as the specific string the license
      requires (if the license specifies a format).
- [ ] Adding a second online provider (roadmap, `PRD.md` §9) requires its own `docs/COMPLIANCE.md`
      entry before its caching path is enabled — compliance does not carry over between providers.
- [ ] This gate is re-checked (manually, by a human) whenever Jamendo's terms could plausibly have
      changed — e.g. before any release that bumps the provider integration — not just once at
      initial build time.

## F8 — API Key Setup & Management *(new)*
**Description:** First-run friendly configuration for the optional Jamendo key.
**Acceptance criteria:**
- [ ] `.env.example` ships in the repo with `JAMENDO_CLIENT_ID=` and a comment linking to
      `https://devportal.jamendo.com` for obtaining a free client_id.
- [ ] `config.js` loads `.env` via `dotenv` and never throws if it's absent — `jamendoClientId` is
      simply `undefined`, and every online-touching module checks for that before acting (F6).
- [ ] App never logs or prints the key value itself, even in debug logs (log `"Jamendo key: set"` /
      `"Jamendo key: not set"`, never the raw value).

## F9 — Volume Control *(promoted from v1 roadmap)*
**Keybinds:** `+` increases volume, `-` decreases, in fixed steps (e.g. 10%), clamped 0–100%.
**Acceptance criteria:**
- [ ] Volume changes call VLC's HTTP `status.json?command=volume&val=<0-320>` (VLC's native 0–320
      scale, mapped from the app's 0–100% display).
- [ ] Current volume is shown somewhere in the now-playing panel.
- [ ] Volume level persists across track changes within a session (not reset to default each play).

## F10 — ID3 Metadata Display *(promoted from v1 roadmap)*
**Acceptance criteria:**
- [ ] Local and cached files are tagged via `music-metadata` during indexing (F5); artist/album are
      stored on the Track object.
- [ ] Now-playing panel shows `Title — Artist (Album)` when available, falling back to filename when
      tags are missing, exactly as it already falls back for untagged files.

## F11 — Structured Error Handling & Logging *(new, production requirement)*
**Acceptance criteria:**
- [ ] Every module throws one of the typed errors from `src/utils/errors.js`, never a bare `Error`
      or string throw.
- [ ] `index.js`'s main loop wraps all action dispatches in try/catch; caught errors render as a
      one-line status message and are appended to `.cache/logs/app.log`, and the app keeps running.
- [ ] An uncaught exception anywhere still triggers terminal-mode restoration (raw mode off) before
      the process exits, via a top-level `process.on('uncaughtException', ...)` safety net.

## F12 — Cross-Platform VLC Discovery *(new, production requirement)*
**Acceptance criteria:**
- [ ] Resolution order implemented exactly as `architecture.md §9` specifies.
- [ ] If VLC isn't found, the printed message names the specific install command for the detected
      OS (`brew install vlc` / `sudo apt install vlc` / link to videolan.org) rather than a generic
      "VLC not found."

## F13 — npm Packaging & Global Install *(new, production requirement)*
**Acceptance criteria:**
- [ ] `package.json` has a `bin` field making `cli-music-player` available after `npm i -g`.
- [ ] `npx cli-music-player` works from a directory containing a `songs/` folder without any
      global install step.
- [ ] `files` field (or `.npmignore`) excludes `.cache/`, `.env`, and test files from the published
      package.
- [ ] `README.md` install section is verified against a clean `npm pack` + local install, not just
      described from memory.