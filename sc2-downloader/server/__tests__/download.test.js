import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';

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
      if (event === 'end') chain._endCb = cb;
      return chain;
    }),
    pipe: vi.fn().mockImplementation((res) => {
      // Write fake MP3 data directly to the response
      process.nextTick(() => {
        res.write(Buffer.from('fake-mp3-content'));
        res.end();
      });
      return res;
    }),
  };
  return vi.fn(() => chain);
}

beforeEach(async () => {
  tempHome = createTempHome();
  vi.stubGlobal('fetch', vi.fn());
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

describe('GET /api/download', () => {
  it('returns 400 when url param is missing', async () => {
    const res = await request(app).get('/api/download');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/URL/i);
  });

  it('sets Content-Disposition with provided filename', async () => {
    const audioData = Buffer.from('fake-ogg-data');
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)),
    });

    const res = await request(app).get('/api/download?url=http://example.com/x.ogg&filename=my-sound.mp3');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('my-sound.mp3');
    expect(res.headers['content-type']).toMatch(/audio\/mpeg/);
  });

  it('uses default filename when none provided', async () => {
    const audioData = Buffer.from('fake-ogg-data');
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)),
    });

    const res = await request(app).get('/api/download?url=http://example.com/x.ogg');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('audio.mp3');
  });
});
