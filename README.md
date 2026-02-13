# StarCraft Sounds for Claude Code

Use game voice lines as Claude Code sound cues. The app lets you browse quotes from multiple games, curate hook-specific sound lists, and sync MP3s into `~/.claude/sounds` so Claude events play random sounds.

## What This Repo Contains

- `claude-code-notif-manager/frontend`: React + Vite UI for browsing quotes and managing lists
- `claude-code-notif-manager/server`: Express API for audio proxying, OGG->MP3 conversion, sync, and setup
- `claude-code-notif-manager/claude-sounds.zsh` / `claude-code-notif-manager/claude-sounds.bash`: shell watcher scripts
- `claude-code-notif-manager/scripts`: scrapers that generate `frontend/src/data/games/*.json`

## Hook Events and Folders

Claude hooks write trigger files under `~/.claude`, and the watcher plays a random file from the matching folder:

| Hook Event | Trigger File | Sounds Folder |
| --- | --- | --- |
| `SessionStart` | `~/.claude/.claude-start` | `~/.claude/sounds/start` |
| `UserPromptSubmit` | `~/.claude/.claude-prompt` | `~/.claude/sounds/userpromptsubmit` |
| `Stop` | `~/.claude/.claude-done` | `~/.claude/sounds/done` |
| `PreCompact` | `~/.claude/.claude-compact` | `~/.claude/sounds/precompact` |
| `PermissionPrompt` | `~/.claude/.claude-permission` | `~/.claude/sounds/permission` |
| `Question` | `~/.claude/.claude-question` | `~/.claude/sounds/question` |

## Prerequisites

- Node.js 18+
- `ffmpeg` (audio conversion)
- `fswatch` (watcher triggers)
- macOS audio tools (`afplay`/`osascript`) for local playback + system notification commands

```bash
brew install ffmpeg fswatch
```

## Quick Start

```bash
cd claude-code-notif-manager
npm run install:all
npm run dev
```

Open `http://localhost:5173`.

Then use **One-Click Setup** on the landing page. It runs:

1. `POST /api/setup-hooks` (installs Claude hook commands in `~/.claude/settings.json`)
2. Syncs default recommended sounds to `~/.claude/sounds`
3. Installs `~/.claude-sounds.zsh` or `~/.claude-sounds.bash` and updates shell config

Restart your terminal after first setup.

## Core Features

- Browse quotes from StarCraft II, Warcraft II, and Age of Empires III
- Preview audio via backend proxy (`/api/audio`)
- Download individual quotes as MP3 (`/api/download`)
- Batch-download selected quotes as ZIP (`/api/download-batch`)
- Save selected quotes directly to a target hook folder (`/api/save-to-sounds`)
- Sync full active list to `~/.claude/sounds` with orphan cleanup (`/api/save-to-sounds-all`)
- Manage multiple lists (create/rename/delete/switch active list)
- Drag to reorder recommendations within a hook and move between hooks
- Import/export list setup JSON (`{ "hooks": [...] }`)
- Toggle watcher and Claude system notifications from the landing page

## Shell Commands

After the listener script is sourced, these are available:

```bash
cst                           # Toggle sounds on/off (persists state)
claude_sound_watcher_status   # Show running status
claude_sound_watcher_start    # Start watcher
claude_sound_watcher_stop     # Stop watcher
claude_sound_watcher_restart  # Restart watcher
```

## Configuration

Environment overrides:

```bash
export CLAUDE_SOUNDS_DIR="$HOME/.claude/sounds"
export CLAUDE_SOUND_VOLUME=0.3
```

`CLAUDE_SOUND_VOLUME` is a multiplier used by `afplay -v` (`0.0` to `1.0`).

## Development

```bash
cd claude-code-notif-manager
npm run dev            # frontend + server
npm run dev:frontend   # frontend only (:5173)
npm run dev:server     # server only (:3001)
npm run build          # frontend production build
```

## Tests

```bash
cd claude-code-notif-manager/frontend && npm test
cd claude-code-notif-manager/server && npm test
```

Watch mode:

```bash
cd claude-code-notif-manager/frontend && npm run test:watch
cd claude-code-notif-manager/server && npm run test:watch
```
