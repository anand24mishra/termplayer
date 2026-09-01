# Task Execution Checklist: CLI Music Player v2

> For the build agent (Antigravity / Gemini / any AI coding agent): execute phases **in order**.
> Within a phase, tasks may be done in the listed order or in parallel if they touch disjoint files.
> Do not start a task whose "Depends on" isn't checked off. After each task, run the tests named in
> it before moving on. Every file path below is exact and matches `architecture.md §3` — do not
> deviate from these paths.
>
> Legend: ✅ = must produce a passing `node:test` for this before moving on. No ✅ = manual/structural
> task, still required, no automated test expected.

---

## Phase 0 — Project Setup
- [ ] **T0.0 — RELEASE GATE, do first, do not skip.** Create `docs/COMPLIANCE.md` and complete the
      Jamendo compliance note per `architecture.md §2.2` / `features.md` F14, *before* implementing
      F6/F7 for real. If a human reviewer isn't available yet to complete this note, the build agent
      should still create the file with a `## Jamendo — STATUS: PENDING REVIEW` placeholder and
      proceed with the rest of Phase 0–3, but must hardcode `ENABLE_TRACK_CACHING` to default
      `false` in `config.js` (T3.1) until this file's status changes to `REVIEWED`. Do not mark F7
      "done" while the status is `PENDING REVIEW`.
      *Depends on:* nothing.
- [ ] **T0.1** Initialize `package.json` (if not already present) with `"type": "commonjs"`, `name:
      "termplayer"`, `version: 2.0.0`, `bin: { "termplayer": "./bin/termplayer.js" }`.
      *Depends on:* nothing.
- [ ] **T0.2** Add dependencies: `dotenv`, `music-metadata`, `commander`. Do not add axios — use
      native `fetch`.
      *Depends on:* T0.1.
- [ ] **T0.3** Create `.gitignore` containing at minimum `.env`, `.cache/`, `node_modules/`.
      *Depends on:* nothing.
- [ ] **T0.4** Create `.env.example` with `JAMENDO_CLIENT_ID=` and a comment pointing to
      `https://devportal.jamendo.com`.
      *Depends on:* nothing.
- [ ] **T0.5** Create the directory skeleton exactly as in `architecture.md §3` (`bin/`, `src/`,
      `src/library/`, `src/playback/`, `src/cache/`, `src/state/`, `src/ui/`, `src/utils/`, `docs/`).
      *Depends on:* nothing.
- [ ] **T0.6** Implement `bin/termplayer.js` using `commander` per `architecture.md §12`
      (`--songs-dir`, `--clear-cache`, `--no-online`, `--help`, `--version` all working).
      *Depends on:* T0.2, T0.5.

## Phase 1 — Core Refactor (migrate v1 logic into new structure, no new features yet)
- [ ] **T1.1** Move VLC spawn/kill/poll logic from `src/lab_3.js` into `src/playback/vlcController.js`
      as an exported module (`{ play(pathOrUrl), pause(), resume(), stop(), onStatus(cb) }`), with
      no behavior change. ✅ (test: mock child_process, assert spawn args shape)
      *Depends on:* T0.5.
- [ ] **T1.2** Extract VLC binary resolution (currently assumed on PATH) into
      `src/playback/vlcLocator.js` per `architecture.md §9`. ✅ (test: resolution order given fake
      env/PATH)
      *Depends on:* T0.5.
- [ ] **T1.3** Move local scan logic into `src/library/localScanner.js`, exporting
      `scanLocal(songsDir) -> Track[]` per the Track shape in `architecture.md §4.1`. ✅
      *Depends on:* T0.5.
- [ ] **T1.4** Move render/keymap logic into `src/ui/render.js` and `src/ui/keymap.js`, preserving
      the exact v1 layout in `PRD.md` (v1) §4.
      *Depends on:* T0.5.
- [ ] **T1.5** Create `src/state/store.js` with a single state object and
      `update(state, action) -> state` reducer covering the state machine in `architecture.md §6`
      (v1 states only for now: IDLE/LOADING/PLAYING/PAUSED). ✅
      *Depends on:* T0.5.
- [ ] **T1.6** Wire it all together in `src/index.js` + `bin/termplayer.js`; confirm the app
      plays local files identically to v1 before proceeding. Manual smoke test required.
      *Depends on:* T1.1–T1.5.
- [ ] **T1.7** Delete/retire `src/lab_3.js` and old `src/index.js` v1 file once T1.6 is verified
      working (keep in git history, just remove from the active tree).
      *Depends on:* T1.6.

## Phase 2 — Offline Library Index (F5)
- [ ] **T2.1** Implement `src/library/libraryIndex.js`: `loadOrBuildIndex(songsDir, cacheTracksDir)`
      returning the merged Track[] per `architecture.md §4.2`, including the `songsDirHash`
      invalidation logic. ✅ (test: hash changes trigger rebuild; unchanged hash reuses cache;
      corrupt JSON triggers rebuild not crash)
      *Depends on:* T1.3, T1.7.
- [ ] **T2.2** Integrate `music-metadata` tagging into the index build step so Track objects get
      `artist`/`album`/accurate `duration`. ✅ (test: tagged fixture file produces expected fields;
      untagged file falls back gracefully)
      *Depends on:* T2.1.
- [ ] **T2.3** Wire `libraryIndex.js` into `index.js` startup, replacing the raw `localScanner.js`
      call from Phase 1. Verify F5 acceptance criteria in `features.md`.
      *Depends on:* T2.2.

## Phase 3 — Online Provider & Fallback (F6, F7, F8)
- [ ] **T3.1** Implement `src/config.js`: loads `.env` via `dotenv`, merges CLI opts from
      `bin/termplayer.js` (T0.6) over `.env` over defaults, exposes
      `{ jamendoClientId, songsDir, cacheDir, onlineEnabled, trackCachingEnabled }`. Never throws on
      missing key. `trackCachingEnabled` must default to `false` and only read `true` from an
      explicit `ENABLE_TRACK_CACHING=true` env var — cross-check `docs/COMPLIANCE.md`'s status (T0.0)
      is `REVIEWED` before this is ever set `true` in a real deployment; the code itself doesn't
      parse that file, but a code comment here must point back to `architecture.md §2.2`. ✅
      *Depends on:* T0.2, T0.4, T0.0.
- [ ] **T3.2** Implement `src/library/onlineProvider.js`:
      `searchTracks(query, { signal }) -> Track[]` hitting the exact Jamendo endpoint in
      `architecture.md §2.1`, mapping results to the Track shape (`source: 'online-stream'`,
      `streamUrl` set from the `audio` field). Handle non-200, empty `results`, and network errors
      by throwing `ProviderError` (never a bare throw). ✅ (test: mocked fetch — success, empty
      results, 500, network reject — all produce expected outcomes, never uncaught)
      *Depends on:* T3.1.
- [ ] **T3.3** Add `src/utils/errors.js` with `ConfigError`, `ProviderError`, `PlaybackError` classes
      if not already created in an earlier task.
      *Depends on:* nothing (can be done anytime before T3.2, listed here for order clarity).
- [ ] **T3.4** Add the `/` search UI mode to `src/ui/keymap.js` and `src/ui/render.js`: text input,
      results list with `☁` marker, `Esc` to cancel (aborts in-flight request via
      `AbortController`), `Enter` on a result dispatches `PLAY` with that Track. Gate entry into this
      mode on `config.jamendoClientId` being set (F6 acceptance criteria).
      *Depends on:* T3.2, T3.3.
- [ ] **T3.5** Extend `store.js`'s state machine to add `SEARCHING` per `architecture.md §6`.
      *Depends on:* T1.5, T3.4.
- [ ] **T3.6** Confirm `vlcController.play()` (T1.1) works unmodified against an `http(s)://` stream
      URL, not just local file paths — VLC treats both the same via argv, but verify with a real
      Jamendo URL manually since this can't be meaningfully mocked in a unit test.
      *Depends on:* T3.4.

## Phase 4 — Stream-to-Cache (F7, gated by F14 / T0.0)
- [x] **T4.1** Implement `src/cache/trackCache.js`: `downloadTrack(track) -> Promise<filePath>` that,
      before downloading anything, (a) checks `config.trackCachingEnabled` — no-op if `false` — and
      (b) checks the track's `license_ccurl` against the allow-list defined in
      `docs/COMPLIANCE.md` (T0.0) — no-op if not on the allow-list. Only then streams the Jamendo
      `audiodownload` URL to `.cache/tracks/<id>.mp3`, deleting any partial file on failure (never
      leaves a corrupt file registered). ✅ (test: mocked fetch stream — success writes file when
      both gates pass; either gate false results in a documented no-op, not a silent download;
      abort/error mid-stream cleans up, does not resolve)
      *Depends on:* T3.2, T0.0.
- [x] **T4.2** On successful `PLAY` of an `online-stream` track, kick off `trackCache.downloadTrack`
      in the background (do not await before starting playback) — it will itself no-op per T4.1's
      gates when caching isn't permitted for that track/provider. On success, call
      `libraryIndex`'s upsert to persist it as `online-cached` with the real `filePath`,
      `license_ccurl`, and attribution string if the license requires one.
      *Depends on:* T4.1, T2.1, T3.6.
- [ ] **T4.3** Manual verification: play an online track, let it finish downloading, restart the app
      fully offline (network disabled), confirm the track now appears and plays from the local list.

## Phase 5 — Production Hardening (F9, F10, F11, F12, F13)
- [ ] **T5.1** F9 Volume control: `+`/`-` keybinds, `vlcController.setVolume(pct)` mapping 0–100 to
      VLC's 0–320 scale, display current volume in now-playing panel.
      *Depends on:* T1.6.
- [ ] **T5.2** F10 verify metadata display uses T2.2's tagged fields with correct fallback to
      filename; add the `(Album)` suffix to the now-playing render when present.
      *Depends on:* T2.2, T1.4.
- [ ] **T5.3** F11 Wrap `index.js`'s dispatch loop in try/catch using the error classes from T3.3;
      add `src/utils/logger.js` (file-based, `.cache/logs/app.log`); add
      `process.on('uncaughtException', ...)` restoring terminal raw mode before rethrow/exit. ✅
      (test: logger writes expected line format; does not throw if `.cache/logs/` doesn't exist yet)
      *Depends on:* T3.3.
- [ ] **T5.4** F12 Finish `vlcLocator.js` per-OS fallback paths and actionable error messages exactly
      as specified in `architecture.md §9` / `features.md` F12.
      *Depends on:* T1.2.
- [ ] **T5.5** F13 Finalize `package.json` (`bin`, `files`/`.npmignore`), run `npm pack` locally,
      install the resulting tarball globally in a scratch directory, and verify `termplayer`
      launches correctly against a `songs/` folder there.
      *Depends on:* everything above.

## Phase 6 — Documentation Sync
- [ ] **T6.1** Update `README.md` (already drafted, see companion doc) if any implementation detail
      diverged from spec during build — README must reflect actual shipped behavior, not aspiration.
      *Depends on:* T5.5.
- [ ] **T6.2** Add a short `CHANGELOG.md` entry for v2.0.0 summarizing F5–F13.
      *Depends on:* T5.5.

---

## Definition of Done (whole project)
- [ ] Every checkbox above is checked.
- [ ] `node --test` passes with zero failures.
- [ ] Manual smoke test: local-only playback works with no `.env` present at all.
- [ ] Manual smoke test: with a valid `JAMENDO_CLIENT_ID`, `/`-search → play → offline replay
      (T4.3) works end to end.
- [ ] `npm pack` + global install smoke test (T5.5) passes.