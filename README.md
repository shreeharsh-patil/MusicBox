# Harmonia - Glassmorphic Music Player

A modern, high-fidelity music streaming application with live chart streaming, glassmorphic UI, dynamic distortion effects, and real-time song search.

---

## Features

- **Live Music Streaming**: High-quality 320kbps audio streaming powered by NepoTune and JioSaavn APIs.
- **Dynamic Glassmorphism**: Interactive SVG turbulence displacement and specular highlights that respond to mouse physics.
- **Real-Time Search**: Instant live song and artist lookup with debounced queries and fast fallback.
- **Top Trending Charts**: Official live trending tracks and playlists loaded dynamically.
- **Fully Configurable via `.env`**: Zero hardcoded API keys, domains, or endpoints.

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open the app:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

See [`.env.example`](.env.example) for all configurable environment variables:
- `NEPOTUNE_API_URL`
- `JIOSAAVN_API_URL`
- `JIOSAAVN_DES_KEY`
- `LRCLIB_API_URL`
- `NEXT_PUBLIC_APP_NAME`
