import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';

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

describe('GET /api/audio', () => {
  it('returns 400 when url param is missing', async () => {
    const res = await request(app).get('/api/audio');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/URL/i);
  });

  it('returns 404 when upstream returns non-ok', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false, status: 404 });

    const res = await request(app).get('/api/audio?url=http://example.com/missing.ogg');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 200 with audio buffer on success', async () => {
    const audioData = Buffer.from('fake-audio-data');
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength)),
    });

    const res = await request(app).get('/api/audio?url=http://example.com/sound.ogg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/audio\/ogg/);
    expect(Buffer.from(res.body).toString()).toBe('fake-audio-data');
  });
});
