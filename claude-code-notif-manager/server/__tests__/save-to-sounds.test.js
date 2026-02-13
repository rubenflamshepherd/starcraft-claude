import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { PassThrough } from 'stream';

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
      // Write fake MP3 data and end the stream
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

describe('POST /api/save-to-sounds', () => {
  it('returns 400 for invalid folder', async () => {
    const res = await request(app)
      .post('/api/save-to-sounds')
      .send({ folder: 'invalid', quotes: [{ filename: 'test.mp3', audioUrl: 'http://x' }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid folder/);
  });

  it('returns 400 for empty quotes', async () => {
    const res = await request(app)
      .post('/api/save-to-sounds')
      .send({ folder: 'done', quotes: [] });
    expect(res.status).toBe(400);
  });

  it('saves MP3 files to the correct folder', async () => {
    const res = await request(app)
      .post('/api/save-to-sounds')
      .send({
        folder: 'done',
        quotes: [
          { filename: 'quote1.mp3', audioUrl: 'http://example.com/q1.ogg' },
          { filename: 'quote2.mp3', audioUrl: 'http://example.com/q2.ogg' },
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.saved).toBe(2);
    expect(res.body.failed).toBe(0);

    // Verify files exist on disk
    const targetDir = join(tempHome, '.claude', 'sounds', 'done');
    expect(existsSync(join(targetDir, 'quote1.mp3'))).toBe(true);
    expect(existsSync(join(targetDir, 'quote2.mp3'))).toBe(true);
  });

  it('reports correct saved/failed counts on partial failure', async () => {
    let callCount = 0;
    globalThis.fetch.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const res = await request(app)
      .post('/api/save-to-sounds')
      .send({
        folder: 'start',
        quotes: [
          { filename: 'good.mp3', audioUrl: 'http://example.com/good.ogg' },
          { filename: 'bad.mp3', audioUrl: 'http://example.com/bad.ogg' },
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.saved).toBe(1);
    expect(res.body.failed).toBe(1);
  });
});
