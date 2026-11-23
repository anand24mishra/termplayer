# Compliance Notes: Online Providers

> This file is the record required by `architecture.md §2.2` and `features.md` F14. No provider's
> local-caching path (F7) should be enabled by default until its section here is marked `REVIEWED`.
> This is a human sign-off document — an AI build agent should create/maintain its structure but
> should not mark a section `REVIEWED` on its own authority.

---

## Jamendo

**Status: PENDING REVIEW**

- API terms reviewed: _not yet — link + date to be filled in here_
- Streaming playback (client-side, via the `audio` field) permitted for this app's use case:
  _pending_
- Local persistence of downloaded audio (`audiodownload` field, F7) permitted: _pending — note
  whether this is uniform across the catalog or varies by each track's `license_ccurl`_
- Attribution required: _pending — if yes, specify the exact format required and where in the app
  it must be surfaced (F10 now-playing panel)_
- Per-track license allow-list (once reviewed, list which `license_ccurl` values F7 may cache
  against, e.g. specific CC-BY / CC-BY-SA variants; exclude ND/NC as appropriate to the finding
  above): _pending_

**Until this section reads `REVIEWED` with the fields above completed, `ENABLE_TRACK_CACHING` must
remain `false` by default in `config.js`, per `tasks.md` T0.0 / T3.1.**

---

## Radio Browser (Bollywood / Hindi radio)

**Status: PENDING REVIEW**

- API terms reviewed: _not yet_ — directory: https://www.radio-browser.info/ (community-run, free, no API
  key; asks clients to send a descriptive `User-Agent` and to call `/json/url/<uuid>` when a station is
  played, both of which TermPlayer does).
- Streaming playback permitted: _pending_ — TermPlayer only plays each station's own public stream URL
  through VLC; it does not re-host, record or transform the audio. Each station is responsible for its own
  broadcast rights.
- Local persistence permitted: **not applicable** — radio is never downloaded or cached to disk (live
  streams have no `audiodownload`, so `trackCache.downloadTrack` returns null). Only the station *list*
  (names, URLs, bitrates) is cached in `.cache/radio-stations.json` for 24 h.
- Attribution required: _pending_
- Per-track/catalog license allow-list: _not applicable_ (no per-track licences; live broadcasts)

**Considered and rejected:** unofficial JioSaavn / Gaana wrappers. JioSaavn's API policy
(https://www.jiosaavn.com/corporate/api-policy) states its APIs are private and not open to the public,
whether documented or not.

---

## Adding a new provider

Copy the template below for any additional online provider (see `PRD.md §9` roadmap). Compliance
does not carry over from Jamendo or any other existing entry — each provider is reviewed
independently.

```
## <Provider Name>

**Status: PENDING REVIEW**

- API terms reviewed: 
- Streaming playback permitted: 
- Local persistence permitted: 
- Attribution required: 
- Per-track/catalog license allow-list: 
```