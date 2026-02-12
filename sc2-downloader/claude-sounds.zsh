# Claude Code sound notifications
# Plays sounds when Claude starts/completes tasks via file watchers

# Configuration - all can be overridden via environment variables
CLAUDE_DIR="$HOME/.claude"

export CLAUDE_SOUNDS_DIR="${CLAUDE_SOUNDS_DIR:-$HOME/.claude/sounds}"
export CLAUDE_SOUND_VOLUME="${CLAUDE_SOUND_VOLUME:-0.3}"  # 0-1 multiplier, 1 = full volume

# Trigger files (created by Claude hooks)
export CLAUDE_DONE_FILE="${CLAUDE_DONE_FILE:-$CLAUDE_DIR/.claude-done}"
export CLAUDE_START_FILE="${CLAUDE_START_FILE:-$CLAUDE_DIR/.claude-start}"
export CLAUDE_PROMPT_FILE="${CLAUDE_PROMPT_FILE:-$CLAUDE_DIR/.claude-prompt}"
export CLAUDE_PRECOMPACT_FILE="${CLAUDE_PRECOMPACT_FILE:-$CLAUDE_DIR/.claude-compact}"
export CLAUDE_PERMISSION_FILE="${CLAUDE_PERMISSION_FILE:-$CLAUDE_DIR/.claude-permission}"
export CLAUDE_QUESTION_FILE="${CLAUDE_QUESTION_FILE:-$CLAUDE_DIR/.claude-question}"

# Sound directories
export CLAUDE_DONE_SOUNDS="${CLAUDE_DONE_SOUNDS:-$CLAUDE_SOUNDS_DIR/done}"
export CLAUDE_START_SOUNDS="${CLAUDE_START_SOUNDS:-$CLAUDE_SOUNDS_DIR/start}"
export CLAUDE_PROMPT_SOUNDS="${CLAUDE_PROMPT_SOUNDS:-$CLAUDE_SOUNDS_DIR/userpromptsubmit}"
export CLAUDE_PRECOMPACT_SOUNDS="${CLAUDE_PRECOMPACT_SOUNDS:-$CLAUDE_SOUNDS_DIR/precompact}"
export CLAUDE_PERMISSION_SOUNDS="${CLAUDE_PERMISSION_SOUNDS:-$CLAUDE_SOUNDS_DIR/permission}"
export CLAUDE_QUESTION_SOUNDS="${CLAUDE_QUESTION_SOUNDS:-$CLAUDE_SOUNDS_DIR/question}"

CLAUDE_WATCHER_PID_FILE="$HOME/.claude_watcher.pid"
CLAUDE_SOUNDS_ENABLED_FILE="$HOME/.claude_sounds_enabled"

# Pick a random sound file from a directory
_claude_random_sound() {
  local dir="$1"
  local files=("$dir"/*.{mp3,wav,m4a,aiff,aac}(N))
  if [ ${#files[@]} -eq 0 ]; then
    return 1
  fi
  # Use /dev/urandom for reliable randomness in subshells
  local rand=$(od -An -tu4 -N4 /dev/urandom | tr -d ' ')
  echo "${files[rand % ${#files[@]} + 1]}"
}

# Generic file watcher that plays a random sound from directory when trigger file appears
_claude_watcher() {
  local watch_file="$1" sound_dir="$2"
  fswatch -o "$watch_file" 2>/dev/null | while read; do
    if [ -f "$watch_file" ]; then
      local sound_file=$(_claude_random_sound "$sound_dir")
      if [ -n "$sound_file" ]; then
        if [ -n "$CLAUDE_SOUND_VOLUME" ]; then
          afplay -v "$CLAUDE_SOUND_VOLUME" "$sound_file" &
        else
          afplay "$sound_file" &
        fi
      fi
      rm -f "$watch_file"
    fi
  done
}

_claude_validate() {
  # Check fswatch is installed
  if ! command -v fswatch &>/dev/null; then
    echo "claude-sounds: fswatch not installed (brew install fswatch)" >&2
    return 1
  fi

  # Warn about missing sound directories (non-fatal)
  local dirs=("$CLAUDE_DONE_SOUNDS" "$CLAUDE_START_SOUNDS" "$CLAUDE_PROMPT_SOUNDS" "$CLAUDE_PRECOMPACT_SOUNDS" "$CLAUDE_PERMISSION_SOUNDS" "$CLAUDE_QUESTION_SOUNDS")
  local names=("done" "start" "userpromptsubmit" "precompact" "permission" "question")
  for i in {1..6}; do
    if [ ! -d "${dirs[$i]}" ]; then
      echo "claude-sounds: warning - ${names[$i]} sounds dir not found: ${dirs[$i]}" >&2
    fi
  done

  return 0
}

claude_sound_watcher_start() {
  # Already running?
  if [ -f "$CLAUDE_WATCHER_PID_FILE" ] && kill -0 "$(cat "$CLAUDE_WATCHER_PID_FILE")" 2>/dev/null; then
    return 0
  fi

  # Validate dependencies
  _claude_validate || return 1

  # Start watchers in background
  (
    _claude_watcher "$CLAUDE_DONE_FILE" "$CLAUDE_DONE_SOUNDS" &
    _claude_watcher "$CLAUDE_START_FILE" "$CLAUDE_START_SOUNDS" &
    _claude_watcher "$CLAUDE_PROMPT_FILE" "$CLAUDE_PROMPT_SOUNDS" &
    _claude_watcher "$CLAUDE_PRECOMPACT_FILE" "$CLAUDE_PRECOMPACT_SOUNDS" &
    _claude_watcher "$CLAUDE_PERMISSION_FILE" "$CLAUDE_PERMISSION_SOUNDS" &
    _claude_watcher "$CLAUDE_QUESTION_FILE" "$CLAUDE_QUESTION_SOUNDS" &
    wait
  ) &
  echo $! > "$CLAUDE_WATCHER_PID_FILE"
  disown
}

claude_sound_watcher_stop() {
  # Kill by PID file if exists
  if [ -f "$CLAUDE_WATCHER_PID_FILE" ]; then
    local pid=$(cat "$CLAUDE_WATCHER_PID_FILE")
    kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null
    rm -f "$CLAUDE_WATCHER_PID_FILE"
  fi
  # Kill any orphaned fswatch processes watching claude files
  pkill -f "fswatch.*\.claude-" 2>/dev/null
}

claude_sound_watcher_restart() {
  claude_sound_watcher_stop
  claude_sound_watcher_start
}

claude_sound_watcher_status() {
  if [ -f "$CLAUDE_WATCHER_PID_FILE" ] && kill -0 "$(cat "$CLAUDE_WATCHER_PID_FILE")" 2>/dev/null; then
    echo "claude-sounds: running (PID $(cat "$CLAUDE_WATCHER_PID_FILE"))"
    return 0
  else
    echo "claude-sounds: not running"
    return 1
  fi
}

claude_sounds_toggle() {
  if [ -f "$CLAUDE_WATCHER_PID_FILE" ] && kill -0 "$(cat "$CLAUDE_WATCHER_PID_FILE")" 2>/dev/null; then
    claude_sound_watcher_stop
    echo "0" > "$CLAUDE_SOUNDS_ENABLED_FILE"
    echo "claude-sounds: OFF"
  else
    claude_sound_watcher_start
    echo "1" > "$CLAUDE_SOUNDS_ENABLED_FILE"
    echo "claude-sounds: ON"
  fi
}

# Short alias for quick toggling
alias cst='claude_sounds_toggle'

# Start watcher in background if enabled (default: on)
if [ ! -f "$CLAUDE_SOUNDS_ENABLED_FILE" ] || [ "$(cat "$CLAUDE_SOUNDS_ENABLED_FILE")" = "1" ]; then
  claude_sound_watcher_start
fi
