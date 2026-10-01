# EchoSphere

A Spotify-style music player that runs entirely in the browser: no build step, no server, no accounts.

## Run it

```bash
cd echosphere
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works in most browsers.

## What's beyond a typical streaming app

| Feature | Details |
| --- | --- |
| **Built-in music** | 14 demo songs (lo-fi, synthwave, deep house, ambient, future beats) are composed in the browser with the Web Audio API, so the app works offline with no files. |
| **True crossfade** | Two audio decks with equal-power crossfading (0–12 s, set in Sound Lab). |
| **Smooth controls** | Click-free fades when you pause, skip or seek. |
| **5-band EQ** | Presets plus a live frequency-response curve. |
| **Volume leveling** | A compressor keeps loud and quiet songs at a similar volume. |
| **Playback speed** | 0.75×–1.5× with pitch preserved. |
| **Immersive mode (F)** | Blurred artwork backdrop, beat-reactive artwork, and three visualizers (bars, orb, wave). Swipe the artwork to skip, or swipe down to close. |
| **Adaptive theme** | The accent color fades to match the artwork of each song. |
| **Smart shuffle** | Avoids playing two songs by the same artist back-to-back. |
| **Song radio** | Builds a station from songs with a similar mood and tempo. |
| **Command palette (Ctrl/⌘ K)** | Search songs and run any action from the keyboard. |
| **Your own music** | Drag and drop audio files anywhere. ID3 title, artist, album and cover art are read automatically. Files are stored privately in IndexedDB. |
| **Drag & drop** | Drag songs onto sidebar playlists. Reorder playlists and the queue. Multi-select with Shift/Ctrl. |
| **Queue** | Play next, add to queue, remove, and reorder, like Spotify. |
| **Sleep timer** | 5–60 minutes or end of song, with a gentle fade-out. |
| **Resume** | Picks up the song, queue and position after a reload. |
| **OS media keys** | Media Session API support for lock screen and hardware keys. |
| **Responsive** | Mobile layout with a bottom navigation bar and a mini player. |

## Keyboard shortcuts

`Space` play/pause · `←/→` seek 5 s · `Shift+←/→` previous/next · `↑/↓` volume · `L` like · `S` shuffle · `R` repeat · `M` mute · `Q` queue · `F` immersive mode · `/` search · `Ctrl K` command palette

## Code layout

- `js/synth.js`: procedural music engine (OfflineAudioContext, then WAV)
- `js/store.js`: library, playlists, likes, persistence, file import and ID3 parsing
- `js/player.js`: two-deck playback engine, crossfade, EQ, queue, sleep timer, media session
- `js/visuals.js`: generative cover art and visualizers
- `js/ui.js`: routing, views, queue panel, palette, menus, drag & drop, shortcuts
