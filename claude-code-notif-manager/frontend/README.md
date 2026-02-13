# Frontend (Game Sounds Browser)

React UI for browsing game quotes and managing Claude Code sound lists.

## Stack

- React 19
- Vite
- Tailwind CSS
- `@dnd-kit` for drag-and-drop

## Run

From `claude-code-notif-manager/frontend`:

```bash
npm install
npm run dev
```

App runs on `http://localhost:5173`.

This frontend expects the API server at `http://localhost:3001`.

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
npm run test:watch
```

## Key Features

- Browse quotes by game, faction, unit, and category
- Quote search across currently loaded sections
- Audio preview and MP3 download via backend API
- Multi-select quote actions:
  - Download selected quotes as ZIP
  - Save selected quotes to `~/.claude/sounds/<folder>`
- Recommended setup view:
  - Multiple named lists
  - Drag-and-drop ordering per hook
  - Move quotes between hook groups
  - Import/export setup JSON (`{ "hooks": [...] }`)
  - Sync active list to `~/.claude/sounds`
- Landing page setup controls:
  - Install Claude hooks
  - Install listener script in shell config
  - Toggle sounds and notification hooks

## Data Files

- Game registry: `src/data/games.json`
- Quote datasets: `src/data/games/sc2.json`, `src/data/games/wc2.json`, `src/data/games/aoe3.json`
- Default recommended setup: `src/data/recommendedSetup.json`
