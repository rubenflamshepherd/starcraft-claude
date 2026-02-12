import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';
import { join } from 'path';

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

describe('GET /api/sounds-info', () => {
  it('returns all six folders with exists=true when pre-created', async () => {
    const res = await request(app).get('/api/sounds-info');
    expect(res.status).toBe(200);

    const expectedFolders = ['done', 'start', 'userpromptsubmit', 'precompact', 'permission', 'question'];
    expect(res.body.baseDir).toBe(join(tempHome, '.claude', 'sounds'));
    expect(res.body.folders).toHaveLength(6);

    for (const folder of res.body.folders) {
      expect(expectedFolders).toContain(folder.name);
      expect(folder.exists).toBe(true);
      expect(folder.path).toBe(join(tempHome, '.claude', 'sounds', folder.name));
    }
  });

  it('reports exists=false for missing folders', async () => {
    // Remove one folder
    const { rmSync } = await import('fs');
    rmSync(join(tempHome, '.claude', 'sounds', 'done'), { recursive: true });

    const res = await request(app).get('/api/sounds-info');
    const doneFolder = res.body.folders.find(f => f.name === 'done');
    expect(doneFolder.exists).toBe(false);

    const startFolder = res.body.folders.find(f => f.name === 'start');
    expect(startFolder.exists).toBe(true);
  });
});
