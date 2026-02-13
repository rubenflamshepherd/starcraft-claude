import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';
import { join } from 'path';
import { writeFileSync, existsSync, readdirSync } from 'fs';

let tempHome;
let app;

function createMockFfmpeg() {
  const chain = {
    inputFormat: vi.fn().mockReturnThis(),
    audioCodec: vi.fn().mockReturnThis(),
    audioBitrate: vi.fn().mockReturnThis(),
    format: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation(function(event, cb) {
      if (event === 'error') chain._errorCb = cb;
      return chain;
    }),
    pipe: vi.fn().mockImplementation((passThrough) => {
      process.nextTick(() => {
        passThrough.write(Buffer.from('fake-mp3-data'));
        passThrough.end();
      });
      return passThrough;
    }),
  };
  return vi.fn(() => chain);
}

beforeEach(async () => {
  tempHome = createTempHome();

  const audioData = Buffer.from('fake-ogg-data');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)),
  }));

  vi.mock('os', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, homedir: () => tempHome };
  });
  vi.mock('fluent-ffmpeg', () => ({ default: createMockFfmpeg() }));
  vi.mock('child_process', () => ({ execSync: vi.fn() }));

  vi.resetModules();
  const mod = await import('../app.js');
  app = mod.default;
});

afterEach(() => {
  cleanupTempHome(tempHome);
  vi.restoreAllMocks();
});

describe('POST /api/save-to-sounds-all', () => {
  it('returns 400 for empty quotes', async () => {
    const res = await request(app)
      .post('/api/save-to-sounds-all')
      .send({ quotes: [] });
    expect(res.status).toBe(400);
  });

  it('downloads missing files to correct folders', async () => {
    const res = await request(app)
      .post('/api/save-to-sounds-all')
      .send({
        quotes: [
          { filename: 'q1.mp3', audioUrl: 'http://x/q1.ogg', folder: 'done' },
          { filename: 'q2.mp3', audioUrl: 'http://x/q2.ogg', folder: 'start' },
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(2);
    expect(res.body.skipped).toBe(0);
    expect(res.body.deleted).toBe(0);

    expect(existsSync(join(tempHome, '.claude', 'sounds', 'done', 'q1.mp3'))).toBe(true);
    expect(existsSync(join(tempHome, '.claude', 'sounds', 'start', 'q2.mp3'))).toBe(true);
  });

  it('skips files that already exist', async () => {
    // Pre-create an existing file
    writeFileSync(join(tempHome, '.claude', 'sounds', 'done', 'existing.mp3'), 'old-data');

    const res = await request(app)
      .post('/api/save-to-sounds-all')
      .send({
        quotes: [
          { filename: 'existing.mp3', audioUrl: 'http://x/e.ogg', folder: 'done' },
          { filename: 'new.mp3', audioUrl: 'http://x/n.ogg', folder: 'done' },
        ]
      });

    expect(res.body.skipped).toBe(1);
    expect(res.body.saved).toBe(1);
  });

  it('deletes orphaned files not in the setup', async () => {
    // Pre-create an orphan file
    writeFileSync(join(tempHome, '.claude', 'sounds', 'done', 'orphan.mp3'), 'orphan-data');

    const res = await request(app)
      .post('/api/save-to-sounds-all')
      .send({
        quotes: [
          { filename: 'keeper.mp3', audioUrl: 'http://x/k.ogg', folder: 'done' },
        ]
      });

    expect(res.body.deleted).toBe(1);
    expect(res.body.saved).toBe(1);
    expect(existsSync(join(tempHome, '.claude', 'sounds', 'done', 'orphan.mp3'))).toBe(false);
    expect(existsSync(join(tempHome, '.claude', 'sounds', 'done', 'keeper.mp3'))).toBe(true);
  });

  it('returns correct counts for mixed operations', async () => {
    // Pre-create: one to keep (existing), one orphan (to delete)
    writeFileSync(join(tempHome, '.claude', 'sounds', 'done', 'keep.mp3'), 'data');
    writeFileSync(join(tempHome, '.claude', 'sounds', 'done', 'orphan.mp3'), 'data');

    const res = await request(app)
      .post('/api/save-to-sounds-all')
      .send({
        quotes: [
          { filename: 'keep.mp3', audioUrl: 'http://x/k.ogg', folder: 'done' },
          { filename: 'new.mp3', audioUrl: 'http://x/n.ogg', folder: 'done' },
        ]
      });

    expect(res.body.saved).toBe(1);     // new.mp3
    expect(res.body.skipped).toBe(1);   // keep.mp3
    expect(res.body.deleted).toBe(1);   // orphan.mp3
    expect(res.body.failed).toBe(0);
  });
});
