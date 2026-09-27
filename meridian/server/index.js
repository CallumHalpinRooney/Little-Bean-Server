// Meridian server: serves the app and holds the secrets the browser must never see
// (Huawei OAuth client secret and tokens, Anthropic API key). No framework needed.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHuawei } from './huawei.js';
import { ask, askEnabled } from './ask.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '..', 'public');
const PORT = Number(process.env.PORT) || 5173;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const huawei = createHuawei({
  dataDir: path.join(here, '..', '.data'),
  clientId: process.env.HUAWEI_CLIENT_ID,
  clientSecret: process.env.HUAWEI_CLIENT_SECRET,
  redirectUri: `${BASE_URL}/api/huawei/callback`,
});

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
};

const json = (res, code, body) => res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(body));

async function readBody(req, limit = 200_000) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error('Body too large');
    chunks.push(c);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

async function serveStatic(req, res, pathname) {
  const file = path.normalize(path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'same-origin',
    }).end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE_URL);
  const p = url.pathname;
  try {
    if (p === '/api/status') {
      return json(res, 200, {
        server: true,
        ask: askEnabled(),
        huawei: { configured: huawei.configured, connected: await huawei.connected() },
      });
    }
    if (p === '/api/huawei/login') {
      if (!huawei.configured) return json(res, 400, { error: 'Set HUAWEI_CLIENT_ID and HUAWEI_CLIENT_SECRET first.' });
      return res.writeHead(302, { location: huawei.loginUrl() }).end();
    }
    if (p === '/api/huawei/callback') {
      const error = url.searchParams.get('error');
      if (error) return res.writeHead(302, { location: `/#today` }).end();
      await huawei.callback({ code: url.searchParams.get('code'), state: url.searchParams.get('state') });
      await huawei.sync();
      return res.writeHead(302, { location: '/#today' }).end();
    }
    if (p === '/api/huawei/data' && req.method === 'GET') return json(res, 200, await huawei.cached());
    if (p === '/api/huawei/sync' && req.method === 'POST') return json(res, 200, { ok: true, days: (await huawei.sync()).days.length });
    if (p === '/api/huawei/logout' && req.method === 'POST') { await huawei.logout(); return json(res, 200, { ok: true }); }
    // Developer aid: see Huawei's unprocessed response for one data type to verify the mapping.
    if (p === '/api/huawei/raw' && process.env.NODE_ENV !== 'production') return json(res, 200, await huawei.raw(url.searchParams.get('kind') ?? 'steps'));
    if (p === '/api/ask' && req.method === 'POST') {
      if (!askEnabled()) return json(res, 503, { error: 'Set ANTHROPIC_API_KEY to enable questions.' });
      return ask(req, res, await readBody(req));
    }
    if (p.startsWith('/api/')) return json(res, 404, { error: 'Unknown endpoint' });
    return serveStatic(req, res, decodeURIComponent(p));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) json(res, 500, { error: err.message });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Meridian running at ${BASE_URL}`);
  console.log(`  Huawei Health Kit: ${huawei.configured ? 'configured' : 'not configured (demo data)'}`);
  console.log(`  Ask about your data: ${askEnabled() ? 'on' : 'off (set ANTHROPIC_API_KEY)'}`);
});
