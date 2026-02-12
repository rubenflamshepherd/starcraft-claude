# Game Sounds Browser

Browse and download unit quotations from StarCraft II, Warcraft II, and Age of Empires III. Curate custom sound lists for Claude Code hooks.

## Prerequisites

- Node.js 18+
- ffmpeg (for MP3 conversion)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend
npm run dev
```

Then open http://localhost:5173

## Usage

1. Select a game from the dropdown in the sidebar
2. Browse units by faction
3. Click a unit to see its dialogue categories
4. Click the play button to preview audio
5. Use "+Hook" buttons to add sounds to your active list
6. Switch to the recommended view to manage your lists

### Custom Lists

Create multiple named sound configurations and switch between them:

- **Create** - Click the "+" button in the recommended view header
- **Switch** - Use the dropdown to select a different list
- **Rename** - Click the pencil icon
- **Delete** - Click the trash icon (default list cannot be deleted)

### Syncing to Claude Code

Click **Sync to .claude** to download sounds from your active list to `~/.claude/sounds/`, organized by hook folder.

## Testing

```bash
# Frontend unit tests
cd frontend && npm test

# Server API tests
cd server && npm test
```

## Development

```bash
# Frontend only (port 5173)
npm run dev:frontend

# Backend only (port 3001)
npm run dev:server
```

## Updating Data

To re-scrape the wiki for updated quotations:

```bash
npm run scrape
```

## Project Structure

```
sc2-downloader/
├── frontend/          # React + Vite + Tailwind
│   └── src/
│       ├── utils/     # List management logic
│       └── __tests__/ # Frontend unit tests
├── server/            # Express backend for MP3 conversion
│   └── __tests__/     # Server API tests
├── scripts/           # Wiki scraper
└── package.json       # Root scripts
```
