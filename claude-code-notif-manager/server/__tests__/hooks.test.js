import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';
import { join } from 'path';
import { writeFileSync, readFileSync, mkdirSync } from 'fs';

let tempHome;
let app;

beforeEach(async () => {
  tempHome = createTempHome();
  vi.stubGlobal('fetch', vi.fn());
  vi.mock('os', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, homedir: () => tempHome };
  });
  vi.mock('fluent-ffmpeg', () => ({ default: vi.fn() }));
  vi.mock('child_process', () => ({ execSync: vi.fn() }));
  vi.resetModules();
  const mod = await import('../app.js');
  app = mod.default;
});

afterEach(() => {
  cleanupTempHome(tempHome);
  vi.restoreAllMocks();
});

function settingsPath() {
  return join(tempHome, '.claude', 'settings.json');
}

function writeSettings(obj) {
  writeFileSync(settingsPath(), JSON.stringify(obj, null, 2));
}

function readSettings() {
  return JSON.parse(readFileSync(settingsPath(), 'utf-8'));
}

describe('GET /api/hooks-status', () => {
  it('reports all false when settings.json is missing', async () => {
    const res = await request(app).get('/api/hooks-status');
    expect(res.status).toBe(200);
    expect(res.body.allConfigured).toBe(false);
    for (const val of Object.values(res.body.hooks)) {
      expect(val).toBe(false);
    }
  });

  it('reports allConfigured when all hooks are present', async () => {
    writeSettings({
      hooks: {
        SessionStart: [{ matcher: 'startup|clear', hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-start' }] }],
        UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-prompt' }] }],
        Stop: [{ hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-done' }] }],
        PreCompact: [{ hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-compact' }] }],
        Notification: [
          { matcher: 'permission_prompt', hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-permission' }] },
          { matcher: 'elicitation_dialog', hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-question' }] },
        ],
      }
    });

    const res = await request(app).get('/api/hooks-status');
    expect(res.status).toBe(200);
    expect(res.body.allConfigured).toBe(true);
    expect(res.body.hooks.SessionStart).toBe(true);
    expect(res.body.hooks.PermissionPrompt).toBe(true);
    expect(res.body.hooks.Question).toBe(true);
  });

  it('reports partial when only some hooks are configured', async () => {
    writeSettings({
      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-done' }] }],
      }
    });

    const res = await request(app).get('/api/hooks-status');
    expect(res.body.allConfigured).toBe(false);
    expect(res.body.hooks.Stop).toBe(true);
    expect(res.body.hooks.SessionStart).toBe(false);
  });

  it('identifies hooks by their specific triggerFile, not generic prefix', async () => {
    // Only the permission hook under Notification — question should still be false
    writeSettings({
      hooks: {
        Notification: [
          { matcher: 'permission_prompt', hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-permission' }] },
        ],
      }
    });

    const res = await request(app).get('/api/hooks-status');
    expect(res.body.hooks.PermissionPrompt).toBe(true);
    expect(res.body.hooks.Question).toBe(false);
  });
});

describe('POST /api/setup-hooks', () => {
  it('creates settings.json with all hooks when none exist', async () => {
    const res = await request(app).post('/api/setup-hooks');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.added).toHaveLength(6);
    expect(res.body.skipped).toHaveLength(0);

    const settings = readSettings();
    expect(settings.hooks.SessionStart).toHaveLength(1);
    expect(settings.hooks.Notification).toHaveLength(2);
  });

  it('skips already-configured hooks', async () => {
    writeSettings({
      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-done' }] }],
      }
    });

    const res = await request(app).post('/api/setup-hooks');
    expect(res.body.skipped).toContain('Stop');
    expect(res.body.added).not.toContain('Stop');
    expect(res.body.added).toHaveLength(5);
  });

  it('merges into existing settings and preserves non-hook keys', async () => {
    writeSettings({
      theme: 'dark',
      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-done' }] }],
      }
    });

    const res = await request(app).post('/api/setup-hooks');
    expect(res.status).toBe(200);

    const settings = readSettings();
    expect(settings.theme).toBe('dark');
    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.SessionStart).toHaveLength(1);
  });

  it('appends multiple entries under the same Notification event key', async () => {
    const res = await request(app).post('/api/setup-hooks');
    const settings = readSettings();

    expect(settings.hooks.Notification).toHaveLength(2);
    const commands = settings.hooks.Notification.map(n => n.hooks[0].command);
    expect(commands).toContain('touch ~/.claude/.claude-permission');
    expect(commands).toContain('touch ~/.claude/.claude-question');
  });
});
