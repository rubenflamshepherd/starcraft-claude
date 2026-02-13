# StarCraft Sounds for Claude Code

Play game unit sounds during your Claude Code workflow. Browse quotes from StarCraft II, Warcraft II, and Age of Empires III, then hear units react when you submit prompts, when Claude finishes tasks, and more.

## How It Works

Claude Code [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) trigger shell commands at key moments in the workflow. This project uses hooks to create trigger files, which a background watcher detects and responds to by playing a random sound from the appropriate folder.

**Supported events:**
- `SessionStart` - Claude Code session begins
- `UserPromptSubmit` - You submit a prompt
- `Stop` - Claude finishes responding
- `PreCompact` - Context compaction is about to happen
- `PermissionPrompt` - Claude needs permission to use a tool
- `Question` - Claude asks the user a question

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

Open http://localhost:5173, and select "One Click Setup" to quickly get up and running. From there you can browse units from multiple games, and curate your sounds.

**Custom Lists** - Create multiple named sound configurations (e.g., "All Protoss", "Zerg Only", "Chill Mode") and switch between them. The app ships with a default "Recommended" list. Use the dropdown in the recommended view to switch lists, and the +/pencil/trash buttons to create, rename, or delete lists.

**Adding sounds** - Browse a unit's quotes, then use the "+Hook" buttons to add sounds to hooks on your active list. Drag to reorder, or move sounds between hooks.

**Syncing** - Click **Sync to .claude** to download the active list's sounds to `~/.claude/sounds/`. Files are organized by hook folder:

| Folder | Event |
|--------|-------|
| `start` | Session starts |
| `userpromptsubmit` | You submit a prompt |
| `done` | Claude finishes responding |
| `precompact` | Before context compaction |
| `permission` | Permission prompt |
| `question` | Claude asks a question |

**Import/Export** - Export your active list as JSON to share or back up. Import a JSON file to replace the active list's sounds. The export format is backward compatible across versions.

### 3. Enable the sound watcher

The app's landing page has a one-click **Setup** button that handles this automatically — it copies the watcher script and adds a `source` line to your shell config.

To set it up manually instead, add to your `~/.zshrc`:

```bash
source /path/to/starcraft-claude/sc2-downloader/claude-sounds.zsh
```

Then restart your terminal or run `source ~/.zshrc`.

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

## Troubleshooting Notifications

If Claude events are not showing macOS banners, check notification permissions in **System Settings -> Notifications**:

- Enable notifications for your terminal app (`Terminal` or `iTerm`)
- Enable notifications for `Script Editor` (notifications triggered via `osascript` may be attributed there)

## Configuration

Override defaults via environment variables:

```bash
export CLAUDE_SOUNDS_DIR="$HOME/.claude/sounds"  # Sound files location
export CLAUDE_SOUND_VOLUME=50                     # Volume 0-100 (macOS only)
```

## Testing

```bash
# Frontend unit tests (list management)
cd sc2-downloader/frontend
npm test

# Server API tests
cd sc2-downloader/server
npm test
```

For watch mode during development:

```bash
cd sc2-downloader/frontend
npm run test:watch

cd sc2-downloader/server
npm run test:watch
```

## Supported Games

- **StarCraft II** - Protoss, Terran, Zerg
- **Warcraft II** - Alliance, Horde
- **Age of Empires III** - European

Switch between games using the dropdown in the sidebar.

## Project Structure

```
starcraft-claude/
└── sc2-downloader/        # Web app to browse/download game sounds
    ├── claude-sounds.zsh  # Watcher script (source in .zshrc)
    ├── frontend/          # React + Vite UI
    │   └── src/
    │       ├── utils/     # List management logic
    │       └── __tests__/ # Frontend unit tests
    ├── server/            # Express backend for MP3 conversion
    │   └── __tests__/     # Server API tests
    └── scripts/           # Wiki scraper
```
