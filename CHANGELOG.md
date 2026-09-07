# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - Initial Release
### Added
- **F5: Offline Library Index:** Tracks are automatically scanned and indexed on startup, including ID3 metadata extraction for title, artist, album, and duration using `music-metadata`.
- **F6: Online Search & Stream:** Implemented a `/` command to dynamically search the Jamendo API and stream audio directly via VLC.
- **F7: Background Caching:** Tracks streamed online can be securely cached to the local file system subject to explicit license verification against the `COMPLIANCE.md` allow-list.
- **F8: Interactive UI & State Management:** Overhauled the keymap and display layer, routing playback status and searches through a structured Redux-like state store.
- **F9: Volume Control:** Added `+` and `-` commands mapping the terminal app's volume display (0-100) safely to VLC's internal volume system.
- **F10: Detailed Track Display:** Enhanced the console UI to display `Track Title — Artist (Album)` alongside playback states natively, falling back gracefully to filenames if tags are missing.
- **F11: Robust Error Handling:** Introduced structured error types (`ConfigError`, `ProviderError`), wrapped the main lifecycle loop in a resilient try-catch, and added file-based debugging to `.cache/logs/app.log`.
- **F12: Cross-Platform Support:** Upgraded the VLC launcher to safely auto-locate the executable on macOS (`/Applications/VLC.app/Contents/MacOS/VLC`) and Windows (`C:\Program Files\...`) alongside standard Linux fallback mechanisms.
- **F13: Production Packaging:** Polished `package.json` for global NPM installations (via `npm install -g`), filtering build assets securely via the `files` array.
