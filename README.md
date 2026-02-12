# StarCraft Sounds for Claude Code

Play StarCraft II unit sounds during your Claude Code workflow. Hear Protoss units react when you submit prompts, when Claude finishes tasks, and more.

## How It Works

Claude Code [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) trigger shell commands at key moments in the workflow. This project uses hooks to create trigger files, which a background watcher detects and responds to by playing a random sound from the appropriate folder.

**Supported events:**
- `SessionStart` - Claude Code session begins
- `UserPromptSubmit` - You submit a prompt
- `Stop` - Claude finishes responding
- `PreCompact` - Context compaction is about to happen

## Prerequisites

- Node.js 18+

## Setup

### 1. Install dependencies

```bash
brew install fswatch ffmpeg
```

### 2. Download StarCraft sounds

```bash
cd sc2-downloader
npm run install:all
npm run dev
```

Open http://localhost:5173, browse units, and select quotes. Use the dropdown to pick which event folder to save to, then click **Save to Sounds**. Files are saved directly to `~/.claude/sounds/<folder>/`.

| Folder | Event |
|--------|-------|
| `done` | Claude finishes responding |
| `start` | Session starts |
| `userpromptsubmit` | You submit a prompt |
| `precompact` | Before context compaction |

### 3. Enable the sound watcher

Add to your `~/.zshrc`:

```bash
source /path/to/starcraft-claude/.claude-sounds.zsh
```

Restart your terminal or run `source ~/.zshrc`.

## Usage

The watcher starts automatically when you open a new terminal. Use these commands to manage it:

```bash
cst                           # Toggle sounds on/off (remembers preference)
claude_sound_watcher_status   # Check if running
claude_sound_watcher_stop     # Stop the watcher
claude_sound_watcher_start    # Start the watcher
claude_sound_watcher_restart  # Restart the watcher
```

The `cst` alias (claude sounds toggle) is the quickest way to turn sounds on or off. Your preference persists across terminal sessions.

## Configuration

Override defaults via environment variables:

```bash
export CLAUDE_SOUNDS_DIR="$HOME/.claude/sounds"  # Sound files location
export CLAUDE_SOUND_VOLUME=50                     # Volume 0-100 (macOS only)
```

## Sound Suggestions

| Event | Suggested Unit Quotes |
|-------|----------------------|
| Session start | Probe "I am ready", Zealot "My life for Aiur" |
| Prompt submit | Stalker "I'm ready to go", Sentry "Yes commander" |
| Task complete | Archon "The merging is complete", Carrier "Carrier has arrived" |
| Pre-compact | Void Ray "Channel the void", High Templar "My mind is clear" |

## Testing

Run the server API tests:

```bash
cd sc2-downloader/server
npm test
```

For watch mode during development:

```bash
cd sc2-downloader/server
npm run test:watch
```

## Project Structure

```
starcraft-claude/
├── .claude-sounds.zsh   # Watcher script (source in .zshrc)
└── sc2-downloader/      # Web app to browse/download SC2 sounds
    ├── frontend/        # React + Vite UI
    ├── server/          # Express backend for MP3 conversion
    └── scripts/         # Wiki scraper
```
