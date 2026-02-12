import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const SOUND_FOLDERS = ['done', 'start', 'userpromptsubmit', 'precompact', 'permission', 'question'];

/**
 * Creates a fresh temp home directory with ~/.claude/sounds/<folder>/ pre-created.
 * Returns the temp home path.
 */
export function createTempHome() {
  const tempHome = mkdtempSync(join(tmpdir(), 'sc2-test-'));
  const soundsDir = join(tempHome, '.claude', 'sounds');
  for (const folder of SOUND_FOLDERS) {
    mkdirSync(join(soundsDir, folder), { recursive: true });
  }
  return tempHome;
}

/**
 * Removes the temp home directory.
 */
export function cleanupTempHome(tempHome) {
  rmSync(tempHome, { recursive: true, force: true });
}
