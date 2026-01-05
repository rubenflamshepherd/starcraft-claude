# Sound Toggle Design

Add a toggle switch to the React app homepage that mirrors the `cst` shell command functionality.

## Frontend (LandingPage.jsx)

Add a toggle switch to the status bar area, next to the existing Hooks/Sounds/Listener indicators.

- Style: Sliding toggle switch (green when on, gray when off)
- State: Reflects `listenerStatus.running`
- Disabled when: `!listenerStatus.scriptInstalled`
- Action: Calls `POST /api/toggle-sounds`, then refreshes status

## Backend (server/index.js)

New endpoint: `POST /api/toggle-sounds`

Behavior:
1. Check if watcher is running via PID file (`~/.claude_watcher.pid`)
2. If running: kill process group, write `0` to `~/.claude_sounds_enabled`
3. If not running: call zsh to start watcher, write `1` to enabled file
4. Return `{ running: boolean }` with new state

Implementation: Shell out to zsh to call the existing `claude_sounds_toggle` function from `~/.claude-sounds.zsh`, keeping behavior identical to the `cst` command.
