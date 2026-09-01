# Architecture: TermPlayer v2

> Binding for implementation. File paths, module names, and function signatures here are exact —
> do not rename or restructure without updating this document first.
>
> **Project name:** TermPlayer (formerly referred to generically as "CLI Music Player" in earlier
> drafts). Package name, `bin` entry, and all user-facing strings should say `termplayer`.

---

## 1. Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js >= 18 | native `fetch`, `AbortController` |
| Language | JavaScript (CommonJS) | matches existing `src/lab_3.js` style; no TS migration in v2 |
| Playback engine | VLC (external process, `--extraintf http`) | unchanged from v1 |
| Local file scan | `fs` (`readdirSync`, `statSync`) | unchanged from v1 |
| ID3 tag reading | `music-metadata` (npm) | lightweight, no native bindings |
| Online provider | Jamendo API v3.0 (`https://api.jamendo.com/v3.0/`) | `client_id` query-param auth only — subject to the License Verification Gate, §2.2 |
| HTTP client | native `fetch` | no axios dependency needed on Node 18+ |
| CLI argument parsing | `commander` (npm) | flags like `--songs-dir`, `--clear-cache`; see §12 |
| Config / secrets | `dotenv` + `.env` (gitignored) | `JAMENDO_CLIENT_ID` |
| Local persistence | flat JSON files under `.cache/` (via `fs`) | no DB dependency; see §4 |
| Logging | custom minimal logger, `src/utils/logger.js` | writes to `.cache/logs/app.log`, never to stdout during raw-mode UI |
| Packaging | `package.json` `bin` field | enables `npm i -g` / `npx` |
| Testing | `node:test` (built-in) + `node:assert` | no extra test framework dependency |

## 2. Why Jamendo (and not X) — provisional, pending §2.2

Jamendo is selected as the **initial** online provider because its API exposes catalog metadata and
audio endpoints intended for integration — not because its terms have been independently confirmed
to permit everything this app does. That confirmation is a separate, blocking step (§2.2). Other
options considered:

- **Spotify Web API / Apple Music API:** return metadata and playback *control* for their own
  clients, not a raw audio URL a third-party CLI can pipe into VLC. Rejected — would violate ToS and
  can't satisfy "play the actual audio" requirement.
- **YouTube (yt-dlp):** technically capable, huge catalog, but extraction of audio streams for
  playback is a ToS gray area and brittle (breaks on YouTube-side changes). Rejected for a
  "production, anyone can use it" deliverable.
- **Jamendo:** Creative Commons catalog, `client_id`-only auth for reads, and its `/tracks` endpoint
  returns both an `audio` field (stream URL) and an `audiodownload` field (download URL) as
  first-class parts of the public API response, plus a per-track `license_ccurl` field naming the
  specific CC license that track was published under. This is the technical basis for F7
  (stream-to-cache). Selected as the initial provider, **contingent on §2.2 passing.**

### 2.1 Jamendo integration facts (verified, do not re-derive differently)
- Base URL: `https://api.jamendo.com/v3.0/`
- Auth: append `client_id=<JAMENDO_CLIENT_ID>` as a query parameter on every request. No OAuth
  needed for the read-only search/stream/download use case this app implements.
- Track search: `GET /tracks/?client_id=...&format=json&limit=<n>&search=<query>`
- Each result object includes `audio` (streamable URL, default low-bitrate mp3, override with
  `audioformat=mp32|mp31|ogg|flac`) and `audiodownload` (download URL) plus `name`, `artist_name`,
  `album_name`, `duration` (seconds), `id`.
- No request signing beyond the `client_id` param; standard rate limits apply — the provider module
  must handle non-200s and empty `results` arrays without throwing.
- Each track result includes `license_ccurl`: a URL to the specific Creative Commons license that
  track was published under. Licenses vary per track (e.g. some permit commercial use and
  redistribution, some are non-commercial or no-derivatives) — this field must be read and respected
  per track, not assumed uniform across the catalog.

### 2.2 License Verification Gate — RELEASE BLOCKING, not an implementation task

**TermPlayer must only cache and play tracks where the provider's current API terms and the
applicable track-level license permit the intended use. Licensing/terms compliance is a release
gate, not an assumption baked into the architecture.**

This is binding on both the human maintainer and any build agent:

- Before F6/F7 (online search, and especially local caching of downloaded audio) ship in any build
  that reaches real users, a human must read Jamendo's current Developer/API Terms of Use and
  confirm, in writing (a short note in `docs/COMPLIANCE.md`, create it if absent), that:
  1. Client-side playback of the `audio` stream URL is permitted for this app's use case (a
     personal/general-purpose CLI player).
  2. Local persistence of the `audiodownload` file (F7's whole premise) is permitted, and whether
     that permission is universal or varies per track's `license_ccurl`.
  3. Whether any attribution requirement exists (many CC licenses require crediting the artist) —
     if so, F10 (metadata display) must render that attribution, not just artist/title for flavor.
- **No build agent should treat "the API returns a download URL" as, by itself, proof that
  downloading and retaining that file is permitted for every track and every use case.** The
  endpoint being technically callable is not the same as the use being licensed. §2's reasoning
  above about *why Jamendo was chosen* is a technical/product rationale, not a legal clearance.
- If a track's `license_ccurl` indicates a restrictive license (e.g. no-derivatives, non-commercial,
  or unclear), `trackCache.js` (F7) must skip persisting that specific track and fall back to
  stream-only playback (F6) for it, rather than silently caching everything uniformly. See
  `features.md` F14 for the acceptance criteria this implies.
- This gate re-triggers if the provider is ever changed or added to (§9 roadmap item: additional CC
  providers) — each new provider gets its own compliance note in `docs/COMPLIANCE.md`, it does not
  inherit Jamendo's.
- Until `docs/COMPLIANCE.md` exists with a completed note, F7 (caching) should be built but shipped
  **disabled by default** behind a config flag (`ENABLE_TRACK_CACHING`, default `false`), so the
  online *streaming* feature (F6) can ship independently of the caching question. This directly
  affects `tasks.md` Phase 4 — see the added gate task there.

## 3. Module / File Layout

```
termplayer/
├── bin/
│   └── termplayer.js              # shebang entry, commander flag parsing (§12), calls src/index.js(opts)
├── src/
│   ├── index.js                   # boot: load config, build state, start UI loop, register SIGINT
│   ├── config.js                  # loads .env, exposes { jamendoClientId, songsDir, cacheDir }
│   ├── library/
│   │   ├── localScanner.js        # readdirSync songsDir -> [{ id, title, artist, filePath, duration, source: 'local' }]
│   │   ├── libraryIndex.js        # persistent cache of scanned+tagged metadata (F5)
│   │   └── onlineProvider.js      # Jamendo client: searchTracks(query), resolveStreamUrl(track)
│   ├── playback/
│   │   ├── vlcController.js       # spawn/kill VLC, HTTP status polling (unchanged logic from lab_3.js)
│   │   └── vlcLocator.js          # cross-platform VLC binary discovery (F12)
│   ├── cache/
│   │   └── trackCache.js          # downloads+stores audiodownload URL to .cache/tracks/<id>.mp3 (F7)
│   ├── state/
│   │   └── store.js               # single mutable state object + reducer-style update(state, action)
│   ├── ui/
│   │   ├── render.js              # clears console, draws playlist/now-playing/progress bar
│   │   └── keymap.js              # raw-mode keypress -> action dispatch table
│   └── utils/
│       ├── logger.js              # file logger, never writes to stdout mid-render
│       └── errors.js              # AppError classes: PlaybackError, ProviderError, ConfigError
├── songs/                         # user's local library (existing v1 convention, untouched)
├── .cache/
│   ├── library-index.json         # F5 persistent index
│   └── tracks/                    # F7 downloaded online tracks, treated as local once cached
├── .env.example
├── .gitignore                     # must include .env and .cache/
├── package.json                   # "bin": { "termplayer": "./bin/termplayer.js" }
├── docs/
│   └── COMPLIANCE.md              # required before F7 ships enabled by default, see §2.2
└── README.md
```

Legacy files `src/lab_3.js` and `src/index.js` (v1) are superseded by the layout above; `tasks.md`
covers the migration order so nothing regresses mid-refactor.

## 4. Data Model

### 4.1 Track object (canonical shape, used everywhere)
```js
{
  id: string,            // local: hash of filePath; online: `jamendo:<jamendo_id>`
  title: string,
  artist: string | null,
  album: string | null,
  duration: number,      // seconds
  source: 'local' | 'online-cached' | 'online-stream',
  filePath: string | null,   // set for 'local' and 'online-cached'
  streamUrl: string | null,  // set for 'online-stream' only, transient, never persisted
}
```

### 4.2 `.cache/library-index.json`
```js
{
  "version": 1,
  "songsDirHash": "sha1 of sorted file list + mtimes",
  "tracks": [ /* Track objects, source: 'local' | 'online-cached' */ ]
}
```
Invalidation rule: on startup, recompute `songsDirHash`; if it differs, re-scan `songs/` and
`.cache/tracks/`, re-tag with `music-metadata`, and rewrite the index. This keeps startup fast
(no re-parsing ID3 tags every launch) while staying correct when files are added/removed.

## 5. Core Flows

### 5.1 Startup
1. `config.js` loads `.env` (if present). Missing `JAMENDO_CLIENT_ID` is **not** fatal — online
   features are simply disabled and the UI shows a one-line hint instead of the online option.
2. `vlcLocator.js` resolves the VLC binary; if not found, print actionable per-OS install
   instructions and exit non-zero (playback is a hard requirement, unlike the online extra).
3. `libraryIndex.js` loads or rebuilds the index (§4.2), merging `songs/` and `.cache/tracks/` as
   one unified local list.
4. `store.js` initializes state; `render.js` draws the first frame; `keymap.js` starts listening on
   `process.stdin` in raw mode.

### 5.2 Playing a track that exists locally
Unchanged from v1: cursor selects, `Enter` dispatches `PLAY`, `vlcController.js` spawns VLC against
the local `filePath`, polling drives the progress bar.

### 5.3 Track not found locally → online fallback (F6)
1. User presses `/` to open search mode (new keybind, see `features.md` F6), types a query.
2. If no local match and `JAMENDO_CLIENT_ID` is set: `onlineProvider.searchTracks(query)` hits
   Jamendo, returns up to N candidates as `source: 'online-stream'` Track objects (no `filePath`,
   has `streamUrl`).
3. User selects a result → `PLAY` action → `vlcController.js` spawns VLC directly against
   `streamUrl` (VLC can stream an HTTP mp3 URL exactly like a local file path).
4. In parallel (non-blocking), `trackCache.js` downloads the `audiodownload` URL into
   `.cache/tracks/<id>.mp3`. On success, `libraryIndex.js` upserts that track with
   `source: 'online-cached'` and a real `filePath` — from then on it behaves as fully local (F7).
5. If `JAMENDO_CLIENT_ID` is unset or the request fails: show `"Not found locally. Set
   JAMENDO_CLIENT_ID to enable online search."` or `"Online search failed: <reason>"` — never throw
   up to the process level.

### 5.4 Shutdown
`Ctrl+C` handler (unchanged intent from v1, now centralized in `index.js`): stop polling interval,
kill the VLC child process if running, flush `libraryIndex.js` if dirty, restore terminal mode,
exit 0.

## 6. State Machine
```
IDLE ──Enter──> LOADING ──ok──> PLAYING ──Space──> PAUSED ──Space──> PLAYING
  ^                                 │                                  │
  │                                 └────────s / track-end─────────────┘
  └──────────────────s──────────────────────────────────────────────────
SEARCHING (entered via '/', local-miss) ──result selected──> LOADING
SEARCHING ──no results / no key / error──> IDLE (with inline message)
```

## 7. Error Handling Strategy
- `src/utils/errors.js` defines `ConfigError`, `ProviderError`, `PlaybackError`. UI-facing code
  catches these at the top of `index.js`'s main loop and renders a one-line status message; it never
  lets an uncaught exception reach the default Node handler (which would corrupt the raw-mode
  terminal state).
- All errors are also written via `logger.js` to `.cache/logs/app.log` with timestamp + stack, so a
  user can attach that file to a bug report without it polluting the terminal UI.

## 8. Security
- `.env` holds `JAMENDO_CLIENT_ID` only; it is a public-catalog client_id (not a secret capable of
  account access), but is still kept out of source control per best practice and to allow per-user
  rate-limit isolation.
- `.gitignore` must include `.env` and `.cache/`.
- No user-supplied string is ever interpolated into a shell command (VLC is invoked via
  `child_process.spawn` with an argv array, never `exec`/string concatenation) — this was already
  true in v1 and must remain true.

## 9. Cross-Platform VLC Discovery (F12 detail)
`vlcLocator.js` checks, in order: `VLC_PATH` env override → `vlc` on `PATH` (via a `which`/`where`
style check per OS) → common install locations (`/Applications/VLC.app/Contents/MacOS/VLC` on
macOS, `C:\Program Files\VideoLAN\VLC\vlc.exe` on Windows, `/usr/bin/vlc` on Linux). First match
wins; if none, exit with OS-specific install instructions (`brew install vlc`, apt, or the VideoLAN
download page).

## 10. Testing Strategy
- Unit tests (`node:test`) for: `localScanner`, `libraryIndex` cache invalidation logic,
  `onlineProvider` response parsing (mocked fetch), `trackCache` path construction. No test spawns a
  real VLC process or hits the real network — `onlineProvider` and `vlcController` are tested
  against injected fakes.
- `tasks.md` specifies exactly which task adds which test file, so coverage grows alongside features
  rather than being bolted on at the end.

## 11. Packaging
`package.json` gets a `bin` entry pointing at `bin/termplayer.js`, which parses CLI flags (§12) and
then `require('../src/index.js')` with the parsed options. This makes `npm i -g termplayer` and
`npx termplayer` both work. `files` field in `package.json` restricts the published tarball to
`bin/`, `src/`, `README.md`, `.env.example` — never `.cache/` or a real `.env`.

## 12. CLI Argument Parsing (commander)

`bin/termplayer.js` uses `commander` to parse startup flags rather than hand-rolling `process.argv`
parsing. This keeps flag handling declarative and gives free `--help`/`--version` output, which
matters for "anyone can use it" production quality.

```js
#!/usr/bin/env node
const { Command } = require('commander');
const program = new Command();

program
  .name('termplayer')
  .version(require('../package.json').version)
  .option('-d, --songs-dir <path>', 'directory of local audio files', './songs')
  .option('--clear-cache', 'delete .cache/ before starting', false)
  .option('--no-online', 'disable online search even if JAMENDO_CLIENT_ID is set')
  .parse(process.argv);

require('../src/index.js')(program.opts());
```

- Flags map directly onto `config.js`'s options (overriding `.env`/defaults where given): `--songs-
  dir` overrides `SONGS_DIR`, `--no-online` forces online features off regardless of API key
  presence, `--clear-cache` wipes `.cache/` (index, cached tracks, logs) before the normal startup
  flow runs.
- `src/index.js`'s exported entry point becomes `module.exports = function start(cliOptions) {...}`
  so it can be invoked with parsed options instead of reading `process.argv` itself. `config.js`
  merges precedence as: CLI flag > `.env` > built-in default.
- `commander` is a runtime dependency (not devDependency) since it's required for `bin/termplayer.js`
  to run at all.