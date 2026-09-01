# TermPlayer

A fast, keyboard-only, terminal-based music player. Play your local library, and when a track
you want isn't in your folder, search and play it from Jamendo's free/Creative-Commons catalog —
no browser, no GUI.

```
--- TermPlayer ---
Controls: [Up/Down] Navigate | [Enter] Play | [Space] Pause/Resume | [s] Stop | [/] Search online | [+/-] Volume | [Ctrl+C] Exit

  song1.mp3
> Bonobo — Kong (Black Sands)          ☁ cached
  song3.mp3

--- Now Playing ---
Bonobo — Kong (Black Sands)

[██████████--------------------] 1:23 / 3:45 (Playing)  Vol: 70%
```

## Features
- Local library scan with persistent index (instant startup after first run)
- Full keyboard navigation, no mouse, no config files required to get started
- Play / Pause / Resume / Stop / Volume, all driven through VLC
- ID3 tag display (artist / album) when available
- **Online fallback:** if a track isn't in your local library, search and stream it from Jamendo
- **Automatic offline caching:** any track you stream from Jamendo is saved locally afterward, so
  it plays with zero internet the next time
- Works with **zero configuration** — the online features are entirely optional

## Prerequisites
- **Node.js 18 or newer**
- **VLC media player**, installed and available on your system `PATH`
  - macOS: `brew install vlc` (or download from videolan.org)
  - Linux: `sudo apt install vlc` (or your distro's equivalent)
  - Windows: download from [videolan.org](https://www.videolan.org/vlc/), the installer adds it to
    PATH by default

## Install

```bash
npm install -g termplayer
```

or run it without installing:

```bash
npx termplayer
```

## Quick Start
1. Create a `songs/` folder in the directory you'll run the app from (or set `SONGS_DIR` to point
   elsewhere), and drop some audio files in it (`.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a`).
2. Run `termplayer` (or `npx termplayer`).
3. Navigate with the arrow keys, hit `Enter` to play. That's it — no config needed for local
   playback.

## Enabling Online Search (optional)
Online search/playback via Jamendo needs a free `client_id`:
1. Get one at [https://devportal.jamendo.com](https://devportal.jamendo.com) (free, instant signup).
2. Copy `.env.example` to `.env` in the project directory.
3. Set `JAMENDO_CLIENT_ID=your_client_id_here` in `.env`.
4. Restart the app. Press `/` to search and play anything in Jamendo's catalog.

Without a key set, the app works exactly the same for your local library — the `/` search key just
shows a short hint instead of erroring.

Tracks you stream online are automatically cached to `.cache/tracks/` and appear as normal local
tracks on your next launch — no repeat downloads, no internet needed after the first play.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `↑` / `↓` | Move cursor through the playlist |
| `Enter` | Play the highlighted track |
| `Space` | Pause / Resume |
| `s` | Stop playback |
| `/` | Search and play online (requires `JAMENDO_CLIENT_ID`) |
| `Esc` | Cancel search, return to playlist |
| `+` / `-` | Volume up / down |
| `Ctrl+C` | Exit (and stop playback cleanly) |

## CLI Flags

```bash
termplayer --songs-dir ./my-music   # use a different local library folder
termplayer --clear-cache            # wipe the local index/cache before starting
termplayer --no-online              # force online search off even if a key is set
termplayer --help
termplayer --version
```

## Configuration Reference

| Env var / flag | Required | Default | Purpose |
|---|---|---|---|
| `JAMENDO_CLIENT_ID` | No | unset | Enables online search/playback |
| `SONGS_DIR` / `--songs-dir` | No | `./songs` | Where local audio files are read from |
| `VLC_PATH` | No | auto-detected | Override VLC binary location |
| `ENABLE_TRACK_CACHING` | No | `false` | Persist streamed online tracks locally — off by default until Jamendo's terms have been reviewed for this app's use, see `docs/COMPLIANCE.md` |

> **Note on online tracks:** streaming an online track (`/` search) always works once you have an
> API key, but *caching* it for offline replay is gated behind a compliance check
> (`docs/COMPLIANCE.md`) and disabled by default. See `docs/architecture.md §2.2` if you're
> maintaining this project and want to enable it.

## Managing the Local Cache
Cached online tracks live in `.cache/tracks/`; the library index lives in
`.cache/library-index.json`. Both are safe to delete at any time — they'll be rebuilt / re-downloaded
as needed:
```bash
rm -rf .cache/tracks       # clear cached online tracks (they'll need re-streaming to get back)
rm -rf .cache               # full reset (index + cache + logs)
```

## Troubleshooting
- **"VLC not found"** — install VLC (see Prerequisites) and make sure it's on your PATH, or set
  `VLC_PATH` explicitly.
- **`/` search does nothing** — you haven't set `JAMENDO_CLIENT_ID` yet (see above); this is by
  design, not a bug.
- **Logs** — check `.cache/logs/app.log` for details on any error shown in the UI.

## For Contributors & AI Coding Agents
This project's build spec lives in `docs/`:
- [`docs/PRD.md`](docs/PRD.md) — product requirements and scope
- [`docs/architecture.md`](docs/architecture.md) — exact module layout, data model, technical
  decisions (binding — do not restructure without updating this file)
- [`docs/features.md`](docs/features.md) — per-feature acceptance criteria
- [`docs/tasks.md`](docs/tasks.md) — ordered, checkable implementation checklist

If you're an AI agent implementing or extending this codebase, `architecture.md` and `tasks.md` are
authoritative for file paths and structure — treat anything not specified there as undefined rather
than inventing it.
