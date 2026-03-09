# Audio Assets

All sounds should be **.mp3** (under ~50KB each) for iOS WKWebView.

## Placeholders (add real files when ready)

| Key | Filename | Use |
|-----|----------|-----|
| `chime` | chime.mp3 | Match success, small celebration |
| `splat` | splat.mp3 | Paint blob dropped in well |
| `celebrate` | celebrate.mp3 | Mission complete, large celebration |

The app runs without these; `AudioManager` simply skips playback if a sound isn't loaded.
