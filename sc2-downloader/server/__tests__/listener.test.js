import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';

const mockExecSync = vi.hoisted(() => vi.fn());

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, homedir: () => tempHome };
});
vi.mock('fluent-ffmpeg', () => ({ default: vi.fn() }));
vi.mock('child_process', () => ({ execSync: mockExecSync }));

let tempHome;
let app;
let originalShell;

beforeEach(async () => {
  tempHome = createTempHome();
  originalShell = process.env.SHELL;
  process.env.SHELL = '/bin/zsh';
  vi.stubGlobal('fetch', vi.fn());
  vi.resetModules();
  const mod = await import('../app.js');
  app = mod.default;
});

afterEach(() => {
  cleanupTempHome(tempHome);
  process.env.SHELL = originalShell;
  vi.restoreAllMocks();
});

describe('GET /api/listener-status', () => {
  it('reports scriptInstalled=false when script is not in home', async () => {
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });

    const res = await request(app).get('/api/listener-status');
    expect(res.status).toBe(200);
    expect(res.body.scriptInstalled).toBe(false);
    expect(res.body.inShellConfig).toBe(false);
    expect(res.body.running).toBe(false);
  });

  it('reports scriptInstalled=true when script exists', async () => {
    writeFileSync(join(tempHome, '.claude-sounds.zsh'), '#!/bin/zsh');
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });

    const res = await request(app).get('/api/listener-status');
    expect(res.body.scriptInstalled).toBe(true);
  });

  it('reports inShellConfig=true when .zshrc has source line', async () => {
    writeFileSync(join(tempHome, '.claude-sounds.zsh'), '#!/bin/zsh');
    writeFileSync(join(tempHome, '.zshrc'), 'source ~/.claude-sounds.zsh');
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });

    const res = await request(app).get('/api/listener-status');
    expect(res.body.inShellConfig).toBe(true);
    expect(res.body.shellConfigs.zshrc).toBe(true);
  });

  it('reports fswatchInstalled=true when which succeeds', async () => {
    mockExecSync.mockImplementation((cmd) => {
      if (cmd === 'which fswatch') return '/usr/local/bin/fswatch';
      throw new Error('not found');
    });

    const res = await request(app).get('/api/listener-status');
    expect(res.body.fswatchInstalled).toBe(true);
  });

  it('reports running=true when PID file exists and process is alive', async () => {
    writeFileSync(join(tempHome, '.claude_watcher.pid'), '12345');
    mockExecSync.mockImplementation((cmd) => {
      if (cmd === 'which fswatch') throw new Error('not found');
      if (cmd === 'kill -0 12345') return '';
      throw new Error('not found');
    });

    const res = await request(app).get('/api/listener-status');
    expect(res.body.running).toBe(true);
  });

  it('reports running=false when PID file exists but process is dead', async () => {
    writeFileSync(join(tempHome, '.claude_watcher.pid'), '99999');
    mockExecSync.mockImplementation((cmd) => {
      if (cmd === 'kill -0 99999') throw new Error('no such process');
      throw new Error('not found');
    });

    const res = await request(app).get('/api/listener-status');
    expect(res.body.running).toBe(false);
  });
});

describe('POST /api/setup-listener', () => {
  it('copies script and adds source line to shell config', async () => {
    const appDir = join(import.meta.dirname, '..');
    const scriptSource = join(appDir, '..', 'claude-sounds.zsh');

    writeFileSync(join(tempHome, '.zshrc'), '# existing config\n');
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });

    const res = await request(app).post('/api/setup-listener');

    if (!existsSync(scriptSource)) {
      expect(res.status).toBe(404);
      return;
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.scriptInstalled).toBe(true);
    expect(res.body.addedToConfig).toBe(true);

    expect(existsSync(join(tempHome, '.claude-sounds.zsh'))).toBe(true);

    const config = readFileSync(join(tempHome, '.zshrc'), 'utf-8');
    expect(config).toContain('.claude-sounds.zsh');
  });

  it('skips adding source line if already present', async () => {
    writeFileSync(join(tempHome, '.zshrc'), 'source ~/.claude-sounds.zsh\n');
    mockExecSync.mockImplementation(() => { throw new Error('not found'); });

    const appDir = join(import.meta.dirname, '..');
    const scriptSource = join(appDir, '..', 'claude-sounds.zsh');

    const res = await request(app).post('/api/setup-listener');
    if (!existsSync(scriptSource)) {
      expect(res.status).toBe(404);
      return;
    }

    expect(res.body.addedToConfig).toBe(false);
  });
});
