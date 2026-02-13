# Claude Code Notifications Manager

Use iconic sounds from Starcraft, Warcraft, AoE and more as Claude Code sound cues. Easily customize and manage Claude Code's audio and system notifications. One-click setup once you clone the and run the local web server.

## Prerequisites

- Node.js 18+
- `ffmpeg` (audio conversion)
- `fswatch` (watcher triggers)

```bash
brew install ffmpeg fswatch
```

## Quick Start

```bash
# From project root (claude-code-notif-manager/)
cd claude-code-notif-manager
npm run install:all
npm run dev
```

Open `http://localhost:5173`.

Then use **One-Click Setup** on the landing page. It runs:

1. Installs Claude hook commands in `~/.claude/settings.json`
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
