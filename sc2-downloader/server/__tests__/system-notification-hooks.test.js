import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, homedir: () => tempHome };
});
vi.mock('fluent-ffmpeg', () => ({ default: vi.fn() }));

let tempHome;
let app;

beforeEach(async () => {
  tempHome = createTempHome();
  vi.stubGlobal('fetch', vi.fn());
  vi.resetModules();
  const mod = await import('../app.js');
  app = mod.default;
});

afterEach(() => {
  cleanupTempHome(tempHome);
  vi.restoreAllMocks();
});

describe('GET /api/system-notification-hooks-status', () => {
  it('returns all hooks disabled by default', async () => {
    const res = await request(app).get('/api/system-notification-hooks-status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      permissionPrompt: false,
      question: false,
      stop: false,
    });
  });
});

describe('POST /api/toggle-system-notification-hook', () => {
  it('toggles permissionPrompt on and off', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json');

    const enableRes = await request(app)
      .post('/api/toggle-system-notification-hook')
      .send({ hook: 'permissionPrompt' });
    expect(enableRes.status).toBe(200);
    expect(enableRes.body.enabled).toBe(true);

    let settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    const permissionEntries = settings.hooks.Notification.filter(e => e.matcher === 'permission_prompt');
    expect(permissionEntries.some(e => e.hooks?.some(h => h.command?.includes('Claude needs permission')))).toBe(true);

    const disableRes = await request(app)
      .post('/api/toggle-system-notification-hook')
      .send({ hook: 'permissionPrompt' });
    expect(disableRes.status).toBe(200);
    expect(disableRes.body.enabled).toBe(false);

    settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    const updatedPermissionEntries = settings.hooks.Notification.filter(e => e.matcher === 'permission_prompt');
    expect(updatedPermissionEntries.some(e => e.hooks?.some(h => h.command?.includes('Claude needs permission')))).toBe(false);
  });

  it('preserves non-notification hooks when toggling off', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json');
    writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        Notification: [
          {
            matcher: 'permission_prompt',
            hooks: [
              { type: 'command', command: 'touch ~/.claude/.claude-permission' },
              { type: 'command', command: `osascript -e 'display notification "Claude needs permission" with title "Claude Code"'` },
            ],
          },
        ],
      },
    }, null, 2));

    const res = await request(app)
      .post('/api/toggle-system-notification-hook')
      .send({ hook: 'permissionPrompt' });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);

    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    const hooks = settings.hooks.Notification[0].hooks;
    expect(hooks.some(h => h.command === 'touch ~/.claude/.claude-permission')).toBe(true);
    expect(hooks.some(h => h.command?.includes('Claude needs permission'))).toBe(false);
  });

  it('supports toggling stop notifications', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json');

    const enableRes = await request(app)
      .post('/api/toggle-system-notification-hook')
      .send({ hook: 'stop' });
    expect(enableRes.status).toBe(200);
    expect(enableRes.body.enabled).toBe(true);

    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    const stopEntries = settings.hooks.Stop || [];
    expect(stopEntries.some(e => e.hooks?.some(h => h.command?.includes('Claude finished responding')))).toBe(true);
  });

  it('returns 400 for unknown hook names', async () => {
    const res = await request(app)
      .post('/api/toggle-system-notification-hook')
      .send({ hook: 'unknown' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid hook/i);
  });
});
