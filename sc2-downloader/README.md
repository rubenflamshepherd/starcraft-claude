# Game Sounds Browser

Browse unit quotes from StarCraft II, Warcraft II, and Age of Empires III, then map them to Claude Code hook events and sync them into `~/.claude/sounds`.

## Tech Stack

- Frontend: React 19 + Vite + Tailwind + `@dnd-kit`
- Backend: Express + `fluent-ffmpeg` + `archiver`
- Scrapers: Node + Cheerio

## Prerequisites

- Node.js 18+
- `ffmpeg` for OGG->MP3 conversion
- `fswatch` for the shell listener scripts

```bash
# macOS
brew install ffmpeg fswatch
```

## Install and Run

```bash
npm run install:all
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

## Frontend Capabilities

- Game switcher with lazy-loaded datasets (`sc2`, `wc2`, `aoe3`)
- Unit/category browsing and quote search
- Inline quote preview via `/api/audio`
- Single MP3 download via `/api/download`
- Multi-select action bar for:
  - ZIP batch download via `/api/download-batch`
  - Save selected quotes to one hook folder via `/api/save-to-sounds`
- Recommended view with:
  - Multiple named lists
  - Drag-and-drop hook ordering
  - Move recommendations between hooks
  - Import/export JSON (`{ "hooks": [...] }`)
  - Full sync to Claude sounds via `/api/save-to-sounds-all`
- Landing page controls for:
  - One-click setup (`setup-hooks`, `save-to-sounds-all`, `setup-listener`)
  - Watcher toggle
  - Claude system notification toggles

## Backend API Summary

- `GET /api/health`
- `GET /api/audio`
- `GET /api/download`
- `POST /api/download-batch`
- `POST /api/save-to-sounds`
- `POST /api/save-to-sounds-all`
- `GET /api/sounds-info`
- `GET /api/hooks-status`
- `POST /api/setup-hooks`
- `GET /api/listener-status`
- `POST /api/setup-listener`
- `GET /api/notification-status`
- `POST /api/toggle-notifications`
- `GET /api/system-notification-hooks-status`
- `POST /api/toggle-system-notification-hook`
- `POST /api/toggle-sounds`

## Dev Scripts

```bash
npm run dev            # frontend + server
npm run dev:frontend   # frontend only
npm run dev:server     # server only
npm run build          # frontend build
npm run scrape         # refresh all game JSON datasets
```

Scraper output is written to `frontend/src/data/games/*.json`.

## Tests

```bash
cd frontend && npm test
cd server && npm test
```

Watch mode:

```bash
cd frontend && npm run test:watch
cd server && npm run test:watch
```
