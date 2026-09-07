# 🎧 TermPlayer

<p align="center">
  <strong>A modern, keyboard-driven terminal music player with a built-in DJ deck, live spectrum visualizer, and online streaming.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=flat-square&logo=node.js" alt="Node Version">
  <img src="https://img.shields.io/badge/Engine-VLC%20Dual--Deck-orange?style=flat-square&logo=vlc-media-player" alt="VLC Powered">
  <img src="https://img.shields.io/badge/Tests-55%20Passing-success?style=flat-square" alt="Tests">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
</p>

---

```text
--- TermPlayer ---                      
Controls: [Up/Down] Navigate | [Enter] Play | [Space] Pause | [s] Stop | [/] Search | [1-4] Cues | [l] Loop | [</>] Pitch | [f] LPF | [v] Viz | [a] Auto-Mix | [+/-] Vol | [c] X-Fade: 3s | [Ctrl+C] Exit
                                                                                    
> Tokyo Waits — Energy Music (Tokyo Waits)
  SWMM - Welcome to Tokyo — SWMM
  Bonobo — Kong (Black Sands)                                ☁ cached


Now Playing: Tokyo Waits — Energy Music (Tokyo Waits)                                   ⚡ 161 BPM 
[███████-----------------------] 0:23 / 1:44 (Playing)   Vol:  50%   

                                               ╭────────────────╮
                                               │   ⚡ 161 BPM    │
   ▃▆███▅▂    ▂▄▄▄▄▃▄▄▅▄▄▂     ▄▇██▆▃    ▂▂▄   ╰────────────────╯
[Cue 1: 0:15]  |  🔁 Loop: ON (0:15 - 0:19)  |  🤖 Auto-Mix: ON
```

---

## ✨ Features

### 🎛️ DJ Vibe & Performance Deck
- **Dual-Deck Crossfader:** Seamlessly blends between consecutive tracks with configurable fade durations (`0s`, `2s`, `3s`, `5s`) powered by two synchronized VLC deck processes.
- **Hot Cues & Seamless Looping:** Set, jump to, and overwrite 4 instantaneous cue points (`1-4`). Toggle 4-second instant loops (`l`) on any drop or phrase.
- **Tempo & Pitch Control:** Nudge playback speed on the fly from **70% to 130%** in 5% increments without interrupting audio (`<` / `>`), or reset to normal anytime (`r` / `0`).
- **Auto-Mix Continuous Queue Mode:** Automatically triggers smooth crossfading transitions as the current track approaches its end (`a`), continuously looping the playlist.
- **Low-Pass Filter & EQ Sweeps:** 10-band equalizer cutoffs (`f`) cycling *Mild LPF* (-12dB highs), *Deep LPF* (muffled bass), and *Sub-Only*, plus animated sweep transitions (`Shift+f`).

### 📊 Real-Time Visualizer & BPM
- **Dynamic 3-Row Spectrum Equalizer:** Colorful real-time dancing frequency bars responding organically to kicks, mids, and treble sizzle in neon pink, electric gold, and cyan.
- **Live ASCII Waveform Mode:** Toggle between Graphic Spectrum Bars and an animated scrolling Waveform display (`v`).
- **Automatic BPM Detection & Framed Counter:** Instant ID3 BPM tag extraction with fallback to energy-flux autocorrelation peak beat-detection over FFmpeg PCM. Displayed in a bold framed DJ console box on the right.

### 🎵 Local Library & Online Streaming
- **Instant Local Indexing:** Scans `songs/` with fast cached hash indexing in `.cache/library-index.json` — launches in milliseconds without re-scanning.
- **Online Fallback via Jamendo:** Search millions of free Creative-Commons tracks directly in the terminal (`/`).
- **Automatic Offline Caching:** Streamed tracks can be automatically saved locally to `.cache/tracks/` so they play instantly offline.
- **Zero Configuration:** Works right out of the box with zero setup for local playback.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js 18 or newer**
- **VLC media player** installed and available on your system `PATH`:
  - **macOS:** `brew install vlc`
  - **Linux:** `sudo apt install vlc` (or `pacman -S vlc` / `dnf install vlc`)
  - **Windows:** Download from [videolan.org](https://www.videolan.org/vlc/)

### 2. Run Directly (No Install Required)
```bash
npx termplayer
```

Or install globally:
```bash
npm install -g termplayer
termplayer
```

### 3. Add Music
Drop audio files (`.mp3`, `.wav`, `.flac`, `.ogg`, `.m4a`) into a `songs/` folder in your working directory (or specify a custom path with `--songs-dir`). Launch TermPlayer, navigate with `↑`/`↓`, and hit `Enter` to mix!

---

## ⌨️ Keyboard Reference

### Basic Playback & Navigation
| Key | Action |
|---|---|
| `↑` / `↓` | Move cursor through playlist |
| `Enter` | Play highlighted track |
| `Space` | Pause / Resume playback |
| `s` | Stop playback |
| `+` / `-` | Volume up / down (0% – 100%) |
| `/` | Search & stream online tracks (Jamendo) |
| `Esc` | Cancel search & return to playlist |
| `Ctrl + C` | Clean exit (terminates VLC processes cleanly) |

### DJ Deck Controls
| Key | Action |
|---|---|
| `1` – `4` | Set or jump to Hot Cue points 1 to 4 |
| `Shift + 1-4` (`!`, `@`, `#`, `$`) | Overwrite Hot Cue with current playback time |
| `l` / `L` | Toggle 4-second seamless loop |
| `<` / `,` | Nudge tempo/pitch down (-5% speed) |
| `>` / `.` | Nudge tempo/pitch up (+5% speed) |
| `r` / `0` | Reset tempo to 1.0x (100% normal speed) |
| `c` / `C` | Cycle crossfade duration (`0s (OFF)`, `2s`, `3s`, `5s`) |
| `a` / `A` | Toggle Auto-Mix continuous queue mode |

### Audio Visualizer & Filter Effects
| Key | Action |
|---|---|
| `v` / `V` | Cycle Visualizer mode (`Spectrum Bars` → `Waveform` → `OFF`) |
| `f` | Cycle Low-Pass Filter (`OFF` → `Mild LPF` → `Deep LPF` → `Sub-Only`) |
| `Shift + F` | Trigger animated DJ filter sweep build-up |

---

## 🌐 Online Search Setup (Optional)

TermPlayer includes built-in streaming from Jamendo's Creative-Commons catalog:

1. Get a free API Client ID at [devportal.jamendo.com](https://devportal.jamendo.com) (instant, no approval needed).
2. Create a `.env` file in the project directory (or copy `.env.example`):
   ```env
   JAMENDO_CLIENT_ID=your_client_id_here
   ```
3. Restart TermPlayer. Press `/` to search and play tracks online.

> **Offline Persistence:** Streamed tracks can be cached to `.cache/tracks/` for offline replay. See [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) and set `ENABLE_TRACK_CACHING=true` in `.env` to enable permanent local caching.

---

## 🛠️ CLI Flags & Options

```bash
termplayer [options]

Options:
  --songs-dir <path>    Path to local songs directory (default: ./songs)
  --cache-dir <path>    Path to cache directory (default: ./.cache/tracks)
  --clear-cache         Wipe local library index and BPM cache before starting
  --no-online           Disable online search even if JAMENDO_CLIENT_ID is set
  --help                Show command line options
  --version             Show TermPlayer version
```

### Environment Variables
| Variable | Default | Purpose |
|---|---|---|
| `JAMENDO_CLIENT_ID` | *unset* | Jamendo API Client ID for online search |
| `SONGS_DIR` | `./songs` | Directory containing local audio files |
| `VLC_PATH` | *auto-detected* | Custom path to VLC binary |
| `ENABLE_TRACK_CACHING` | `false` | Enable saving streamed online tracks to disk |

---

## 🏗️ Architecture & How It Works

TermPlayer runs a lightweight, fully reactive terminal user interface (TUI) with a Redux-like unidirectional store:

```text
┌─────────────────────────────────────────────────────────┐
│                    TermPlayer TUI                       │
│    [Keypress] ──> [Action] ──> [Store / State] ──> Render │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      ┌───────────────┐           ┌───────────────┐
      │    Deck A     │           │    Deck B     │
      │  (Port 8080)  │ <───────> │  (Port 8081)  │
      │ VLC HTTP JSON │ Crossfade │ VLC HTTP JSON │
      └───────────────┘           └───────────────┘
```

- **Dual-Deck Mixer (`src/dj/mixer.js`):** VLC does not natively decode two audio streams in one process. TermPlayer coordinates two lightweight VLC instances (Deck A on port 8080, Deck B on port 8081) over local HTTP JSON-RPC to execute smooth equal-power crossfades.
- **Autocorrelation BPM Detector (`src/dj/bpmDetector.js`):** Combines ID3 tag inspection with an energy-flux autocorrelation peak beat-detector over FFmpeg PCM extraction with persistent JSON caching.
- **Audio Equalizer (`src/dj/effects.js`):** Directly controls VLC's native 10-band equalizer DSP module for smooth hardware/software filter sweeps.

---

## 🧪 Testing

Run the automated test suite covering all playback, keybinding, library, DJ mixer, cues, equalizer, and visualizer modules:

```bash
npm test
```

```text
▶ Auto-Mix Queue Mode module (4 tests)
▶ BPM detection & display module (5 tests)
▶ Hot Cues & Loops module (4 tests)
▶ Simple effects (Low-Pass Filter & EQ) module (5 tests)
▶ Keymap and store state transitions (3 tests)
▶ libraryIndex caching and metadata (5 tests)
▶ Logger writes expected line format (1 test)
▶ DJ Mixer & Crossfader module (6 tests)
▶ onlineProvider.searchTracks (4 tests)
▶ Tempo / Pitch Control module (3 tests)
▶ Live Waveform / Spectrum Visualizer module (7 tests)

ℹ tests 55
ℹ suites 2
ℹ pass 55
ℹ fail 0
```

---

## 🧹 Cache Management

Cached library indexes, tracks, and logs are stored safely under `.cache/`:
```bash
rm -rf .cache/tracks      # Clear cached online downloads
rm -rf .cache/bpm-cache.json # Reset detected BPM cache
rm -rf .cache             # Full reset (index + cached tracks + logs)
```

---
