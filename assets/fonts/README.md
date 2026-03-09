# Fonts

Self-hosted **.woff2** only (no CDN — app must work offline).

## Suggested (Art Studio / GCU)

- **Display:** Baloo 2, Fredoka One, or Lilita One — headers, titles.
- **Body:** Nunito or Quicksand — instructions, journal.

Place font files here and preload in `index.html`:

```html
<link rel="preload" href="assets/fonts/baloo-2.woff2" as="font" type="font/woff2" crossorigin>
```

Then reference in `core/layout/base.css` via `@font-face`. Until then, the app uses `var(--font-display)` and `var(--font-body)` which fall back to `system-ui`.
