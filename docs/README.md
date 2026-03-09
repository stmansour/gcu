# Grandpa's Creative Universe (GCU)

Run and test **in the browser first**. Same code later runs on iPad/iPhone via Capacitor.

## Run locally (browser)

```bash
cd gcu
npm install
npm start
```

Then open **http://localhost:3000** in your browser. You’ll get the Hub → tap **Art Studio** → Enter Studio → journal → mission (drag paint blobs into the well).

- **Port 3000** — If something else is using 8080, we use 3000 here to avoid conflicts.
- **Single `index.html`** — The app is one HTML entry point plus JS/CSS. No build step. What you run locally is what you’ll wrap in Capacitor for iOS later.

## iPad/iPhone later

From the same `gcu` folder:

```bash
npx cap add ios    # once
npx cap sync ios
npx cap open ios
```

Then build/run from Xcode. The `gcu` folder is the web root for the app.
