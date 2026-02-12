import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';
import { join } from 'path';
import { writeFileSync, readFileSync } from 'fs';

const mockExecSync = vi.hoisted(() => vi.fn());
const mockSpawn = vi.hoisted(() => vi.fn(() => ({ unref: vi.fn() })));

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, homedir: () => tempHome };
});
vi.mock('fluent-ffmpeg', () => ({ default: vi.fn() }));
vi.mock('child_process', () => ({
  execSync: mockExecSync,
  spawn: mockSpawn,
}));

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

describe('POST /api/toggle-sounds', () => {
  it('returns 400 when script is not installed', async () => {
    const res = await request(app).post('/api/toggle-sounds');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not installed/i);
  });

  it('stops watcher when running (PID exists and process is alive)', async () => {
    writeFileSync(join(tempHome, '.claude-sounds.zsh'), '#!/bin/zsh');
    writeFileSync(join(tempHome, '.claude_watcher.pid'), '12345');

    let stopped = false;
    mockExecSync.mockImplementation((cmd) => {
      if (cmd.includes('kill -0 12345')) {
        if (stopped) throw new Error('no such process');
        return '';
      }
      if (cmd.includes('claude_sound_watcher_stop')) {
        stopped = true;
        return '';
      }
      throw new Error(`unexpected: ${cmd}`);
    });

    const res = await request(app).post('/api/toggle-sounds');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.running).toBe(false);

    const enabled = readFileSync(join(tempHome, '.claude_sounds_enabled'), 'utf-8');
    expect(enabled).toBe('0');
  });

  it('starts watcher when not running', async () => {
    writeFileSync(join(tempHome, '.claude-sounds.zsh'), '#!/bin/zsh');

    mockExecSync.mockImplementation((cmd) => {
      if (cmd.includes('kill -0')) throw new Error('no such process');
      throw new Error(`unexpected: ${cmd}`);
    });

    const res = await request(app).post('/api/toggle-sounds');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const enabled = readFileSync(join(tempHome, '.claude_sounds_enabled'), 'utf-8');
    expect(enabled).toBe('1');
  });
});
