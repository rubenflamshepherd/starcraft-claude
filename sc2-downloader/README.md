# SC2 Protoss Quotes Browser

Browse and download StarCraft II Protoss unit quotations. Audio sourced from the StarCraft Wiki.

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

1. Browse units in the left sidebar
2. Click a unit to see its dialogue categories
3. Click the play button (▶) to preview audio
4. Click the download button (⬇) to download as MP3

## Project Structure

```
sc2-downloader/
├── frontend/          # React + Vite + Tailwind
├── server/            # Express backend for MP3 conversion
├── scripts/           # Wiki scraper
└── package.json       # Root scripts
```

## Updating Data

To re-scrape the wiki for updated quotations:

```bash
npm run scrape
```

## Development

```bash
# Frontend only (port 5173)
npm run dev:frontend

# Backend only (port 3001)
npm run dev:server
```
