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