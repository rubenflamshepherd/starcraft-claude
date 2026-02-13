import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';

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

describe('GET /api/notification-status', () => {
  it('returns enabled=true when preferredNotifChannel is unset', async () => {
    const res = await request(app).get('/api/notification-status');
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.preferredNotifChannel).toBe(null);
  });

  it('returns enabled=false when notifications are disabled', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json');
    writeFileSync(settingsPath, JSON.stringify({ preferredNotifChannel: 'notifications_disabled' }, null, 2));

    const res = await request(app).get('/api/notification-status');
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
    expect(res.body.preferredNotifChannel).toBe('notifications_disabled');
  });
});

describe('POST /api/toggle-notifications', () => {
  it('disables notifications and saves prior channel', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json');
    const previousChannelFile = join(tempHome, '.claude_prev_notif_channel');
    writeFileSync(settingsPath, JSON.stringify({ preferredNotifChannel: 'iterm2' }, null, 2));

    const res = await request(app).post('/api/toggle-notifications');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.enabled).toBe(false);
    expect(res.body.preferredNotifChannel).toBe('notifications_disabled');

    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(settings.preferredNotifChannel).toBe('notifications_disabled');
    expect(readFileSync(previousChannelFile, 'utf-8')).toBe('iterm2');
  });

  it('restores prior channel when re-enabling notifications', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json');
    const previousChannelFile = join(tempHome, '.claude_prev_notif_channel');
    writeFileSync(settingsPath, JSON.stringify({ preferredNotifChannel: 'notifications_disabled' }, null, 2));
    writeFileSync(previousChannelFile, 'terminal_bell');

    const res = await request(app).post('/api/toggle-notifications');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.enabled).toBe(true);
    expect(res.body.preferredNotifChannel).toBe('terminal_bell');

    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(settings.preferredNotifChannel).toBe('terminal_bell');
    expect(existsSync(previousChannelFile)).toBe(false);
  });

  it('removes preferredNotifChannel when the previous value was unset', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json');
    const previousChannelFile = join(tempHome, '.claude_prev_notif_channel');
    writeFileSync(settingsPath, JSON.stringify({ preferredNotifChannel: 'notifications_disabled' }, null, 2));
    writeFileSync(previousChannelFile, '__unset__');

    const res = await request(app).post('/api/toggle-notifications');
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.preferredNotifChannel).toBe(null);

    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(settings.preferredNotifChannel).toBeUndefined();
  });

  it('enables all three system notification hooks the first time master is turned on', async () => {
    const settingsPath = join(tempHome, '.claude', 'settings.json');
    writeFileSync(settingsPath, JSON.stringify({ preferredNotifChannel: 'notifications_disabled' }, null, 2));

    const res = await request(app).post('/api/toggle-notifications');
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);

    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    const notificationEntries = settings.hooks?.Notification || [];
    const stopEntries = settings.hooks?.Stop || [];

    expect(notificationEntries.some(e => e.matcher === 'permission_prompt' && e.hooks?.some(h => h.command?.includes('Claude needs permission')))).toBe(true);
    expect(notificationEntries.some(e => e.matcher === 'elicitation_dialog' && e.hooks?.some(h => h.command?.includes('Claude is waiting for your answer')))).toBe(true);
    expect(stopEntries.some(e => e.hooks?.some(h => h.command?.includes('Claude finished responding')))).toBe(true);
    expect(existsSync(join(tempHome, '.claude_system_notifs_initialized'))).toBe(true);
  });
});
