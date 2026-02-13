import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTempHome, cleanupTempHome } from './setup.js';
import request from 'supertest';
import { Readable } from 'stream';
import { createUnzip } from 'zlib';

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

describe('POST /api/download-batch', () => {
  it('returns 400 for empty quotes', async () => {
    const res = await request(app)
      .post('/api/download-batch')
      .send({ quotes: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No quotes/);
  });

  it('returns 400 for missing quotes', async () => {
    const res = await request(app)
      .post('/api/download-batch')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns a ZIP file with correct content-type', async () => {
    const res = await request(app)
      .post('/api/download-batch')
      .send({
        quotes: [
          {
            filename: 'ready.mp3',
            audioUrl: 'http://example.com/ready.ogg',
            unitName: 'Marine',
            categoryName: 'Ready',
          },
        ]
      })
      .parse((res, cb) => {
        // Collect raw binary response
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/zip/);
    expect(res.headers['content-disposition']).toContain('sc2-quotes.zip');

    // Verify it's a valid ZIP (starts with PK signature)
    expect(res.body[0]).toBe(0x50); // P
    expect(res.body[1]).toBe(0x4b); // K
  });

  it('includes correct folder structure in ZIP', async () => {
    const res = await request(app)
      .post('/api/download-batch')
      .send({
        quotes: [
          {
            filename: 'ready.mp3',
            audioUrl: 'http://example.com/ready.ogg',
            unitName: 'Marine',
            categoryName: 'Ready',
          },
          {
            filename: 'attack.mp3',
            audioUrl: 'http://example.com/attack.ogg',
            unitName: 'Zealot',
            categoryName: 'Attack',
          },
        ]
      })
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);

    // ZIP central directory contains filenames — search for them in the raw buffer
    const zipContent = res.body.toString('binary');
    expect(zipContent).toContain('Marine/Ready/ready.mp3');
    expect(zipContent).toContain('Zealot/Attack/attack.mp3');
  });
});
