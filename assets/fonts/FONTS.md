# GCU Fonts

The app uses two self-hosted fonts. Download the .woff2 files and place them here.

## Required Fonts

### Baloo 2 (display / headings)
- Used for: titles, sign text, button labels, portal labels
- Source: https://fonts.google.com/specimen/Baloo+2
- Files needed:
  - `Baloo2-Regular.woff2`    (weight 400)
  - `Baloo2-Bold.woff2`       (weight 700)
  - `Baloo2-ExtraBold.woff2`  (weight 800)
- Download via: `npx google-fonts-helper` or manual download from Google Fonts

### Nunito (body / UI text)
- Used for: body copy, age labels, small UI text
- Source: https://fonts.google.com/specimen/Nunito
- Files needed:
  - `Nunito-Regular.woff2`    (weight 400)
  - `Nunito-SemiBold.woff2`   (weight 600)
  - `Nunito-Bold.woff2`       (weight 700)
  - `Nunito-ExtraBold.woff2`  (weight 800)

## After Downloading

Add this to `core/layout/base.css` (replacing the variable fallbacks):

```css
@font-face {
  font-family: 'Baloo 2';
  src: url('../../assets/fonts/Baloo2-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Baloo 2';
  src: url('../../assets/fonts/Baloo2-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: 'Baloo 2';
  src: url('../../assets/fonts/Baloo2-ExtraBold.woff2') format('woff2');
  font-weight: 800;
  font-display: swap;
}
@font-face {
  font-family: 'Nunito';
  src: url('../../assets/fonts/Nunito-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'Nunito';
  src: url('../../assets/fonts/Nunito-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: 'Nunito';
  src: url('../../assets/fonts/Nunito-ExtraBold.woff2') format('woff2');
  font-weight: 800;
  font-display: swap;
}
```

Note: Paths above are relative to where base.css lives (core/layout/).
Adjust if the font path changes.
