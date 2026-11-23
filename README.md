# TermPlayer

A keyboard-driven music player for your terminal. Play local files, stream Bollywood and Hindi live radio, search free online music, and mix with DJ tools, all in a full-screen interface whose colours follow the time of day. Audio is handled by [VLC](https://www.videolan.org/).

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

```text
 ◉ T E R M P L A Y E R   ▶ PLAYING  ─────────────────────────────  ☾ Night · 23:41
╭─ LIBRARY · 3/14 ───────────────╮╭─ NOW PLAYING ───────────────────────────────╮
│   Midnight City            M83 ││ ♫ Strobe                                     │
│ ▁ Strobe              deadmau5 ││   deadmau5 · For Lack of a Better Name       │
│ ▸ Breathe         Telepopmusik ││   ████▇████▄     ▃████▃   ▁█▇█     ▂▃        │
│   Kids ☁                  MGMT ││ 2:14 ━━━━━━━━━━━━━━●───════════────────── 4:03│
│                                ││ ⚡ 128 BPM   VOL ▮▮▮▮▯▯ 70   ⟳ AUTO-MIX       │
╰────────────────────────────────╯╰──────────────────────────────────────────────╯
 ↑↓ browse  ⏎ play  ␣ pause  / search  b radio  n random  1-4 cues  l loop  ? help
```

## Features

- **Living interface** - colours blend through dawn, day, golden hour, dusk and night, and pulse with the beat. No UI library, just a small custom renderer.
- **Bollywood and Hindi radio** - browse live stations by genre, see the song currently on air.
- **Local library** - scans a folder of `mp3`, `flac`, `wav`, `ogg` and `m4a` files and reads their tags.
- **Online search** - stream free Creative Commons music from [Jamendo](https://www.jamendo.com/).
- **DJ tools** - four hot cues, loops, low-pass filter, BPM detection, auto-mix queue.
- **Random pick** - play something random from your library.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- [VLC](https://www.videolan.org/) (`brew install vlc`, `sudo apt install vlc`, or the Windows installer)
- Optional: `ffmpeg` for BPM detection, a free [Jamendo client ID](https://devportal.jamendo.com) for online search

## Install and run

From npm (needs Node 18+ and VLC):

```bash
npm install -g @anand24/termplayer
termplayer
```

Or try it without installing: `npx @anand24/termplayer`

From source:

```bash
git clone https://github.com/anand24mishra/termplayer.git
cd termplayer
npm install
npm start
```

Put your music in a `songs/` folder next to where you run it (or pass `--songs-dir`). Radio works without any files.

Run `npm run doctor` if something does not work. It checks VLC, your music folder, the API key and the network.

## Keys

| Key | Action |
|---|---|
| `↑` `↓` / `Enter` | Browse / play |
| `Space` | Pause / resume |
| `s` | Stop |
| `+` `-` | Volume |
| `b` | Bollywood radio browser |
| `/` | Search online (needs a Jamendo key) |
| `n` | Play a random song |
| `1`-`4` | Set or jump to a hot cue (`Shift` + number overwrites) |
| `l` | Loop on / off |
| `f` / `F` | Low-pass filter / filter sweep |
| `v` | Visualizer: bars, waveform, off |
| `a` | Auto-mix: continue with the next track |
| `t` | Theme: auto, dawn, day, golden, dusk, night |
| `?` | Help |
| `Ctrl+C` | Quit |

In the radio browser: type to filter, `←` `→` change genre, `Enter` tunes in, `Tab` picks a random station, `Esc` closes. Cues and loops are not available on live radio.

## Options

```text
termplayer [options]

  -d, --songs-dir <path>  folder with your music (default: ./songs)
  --theme <name>          auto, dawn, day, golden, dusk or night
  --no-anim               static frames, lower CPU
  --no-online             disable online search
  --clear-cache           delete .cache/ before starting
  --doctor                check the setup and exit
```

For online search, copy `.env.example` to `.env` and set `JAMENDO_CLIENT_ID`. Environment variables `SONGS_DIR`, `TERMPLAYER_THEME`, `TERMPLAYER_NO_ANIM` and `NO_COLOR` are also supported.

## How it works

```text
Keypress -> Action -> Store (reducer) -> State -> Renderer -> Terminal
                          |
                          +-> Mixer -> VLC (HTTP interface, polled every second)
```

- `src/state` - Redux-style store; all state changes go through one reducer.
- `src/ui` - key handling and the renderer: a cell buffer that only writes changed cells each frame.
- `src/dj` - VLC control, cues and loops, filter, BPM detection, auto-mix.
- `src/library` - local scanner and index, Jamendo search, Radio Browser client.

## Development

```bash
npm test
```

The tests cover the store, key handling, rendering at several terminal sizes, the radio client (with a mocked network) and the playback state logic.

## Data sources and licensing

- Online music comes from Jamendo's Creative Commons catalogue. Saving streamed tracks to disk is **off by default** (`ENABLE_TRACK_CACHING`) and only allowed for licences listed in [docs/COMPLIANCE.md](docs/COMPLIANCE.md).
- Radio stations come from the free [Radio Browser](https://www.radio-browser.info/) directory. TermPlayer only plays each station's public stream and never records or stores it. Broadcast rights belong to the stations.
- Commercial streaming services without an open public API (for example JioSaavn) are deliberately not used.

## License

[MIT](LICENSE)
