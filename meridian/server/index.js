// Meridian server: serves the app and holds the secrets the browser must never see
// (Huawei OAuth client secret and tokens, Anthropic API key). No framework needed.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHuawei } from './huawei.js';
import { createStrava } from './strava.js';
import { timingSafeEqual } from 'node:crypto';
import { coach } from './coach.js';
import { buildDemo } from '../public/js/data/demo.js';

const coachEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
// Optional passcode so a public deployment can't spend your API credits.
const PASSCODE = process.env.MERIDIAN_PASSCODE || '';
const passOk = (given = '') => {
  if (!PASSCODE) return true;
  const a = Buffer.from(String(given)), b = Buffer.from(PASSCODE);
  return a.length === b.length && timingSafeEqual(a, b);
};
// Small in-memory rate limit per client address: 40 coach requests per 10 minutes.
const hits = new Map();
const rateOk = (ip) => {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length <= 40;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, '..', 'public');
const PORT = Number(process.env.PORT) || 5173;
// Render sets RENDER_EXTERNAL_URL; BASE_URL overrides it anywhere else.
const BASE_URL = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

const strava = createStrava({
  dataDir: path.join(here, '..', '.data'),
  clientId: process.env.STRAVA_CLIENT_ID,
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  redirectUri: `${BASE_URL}/api/strava/callback`,
});

// The coach sees the same data as the screens: Huawei (or demo) days, with Strava's
// workouts in place of the demo ones once Strava is connected.
async function loadCoachData() {
  const data = (await huawei.connected()) ? structuredClone(await huawei.cached()) : buildDemo();
  if ((await strava.status()).connected) {
    const s = await strava.workouts().catch(() => null);
    if (s?.workouts?.length) { data.workouts = s.workouts; data.workoutSource = 'strava'; }
  }
  return data;
}

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
        coach: coachEnabled(),
        locked: Boolean(PASSCODE),
        huawei: { configured: huawei.configured, connected: await huawei.connected() },
        strava: await strava.status(),
      });
    }
    if (p === '/api/strava/login') {
      if (!strava.configured) return json(res, 400, { error: 'Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET on the server first.' });
      return res.writeHead(302, { location: strava.loginUrl() }).end();
    }
    if (p === '/api/strava/callback') {
      const back = (msg) => res.writeHead(302, { location: `/?strava=${encodeURIComponent(msg || 'connected')}#fitness/runs` }).end();
      if (url.searchParams.get('error')) return back('cancelled');
      try {
        await strava.callback({ code: url.searchParams.get('code'), state: url.searchParams.get('state'), scope: url.searchParams.get('scope') });
        await strava.sync();
        return back();
      } catch (err) { return back(err.message); }
    }
    if (p === '/api/strava/workouts' && req.method === 'GET') return json(res, 200, await strava.workouts());
    if (p === '/api/strava/sync' && req.method === 'POST') { const r = await strava.sync(); return json(res, 200, { ok: true, workouts: r.workouts.length, lastSync: r.lastSync }); }
    if (p === '/api/strava/logout' && req.method === 'POST') { await strava.logout(); return json(res, 200, { ok: true }); }
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
    if (p === '/api/coach' && req.method === 'POST') {
      if (!coachEnabled()) return json(res, 503, { error: 'Set ANTHROPIC_API_KEY on the server to turn the coach on.' });
      if (!passOk(req.headers['x-meridian-passcode'])) return json(res, 401, { error: 'Wrong passcode. Check it under You → Coach access.' });
      if (!rateOk(req.socket.remoteAddress)) return json(res, 429, { error: 'That’s a lot of questions. Try again in a few minutes.' });
      return coach(req, res, await readBody(req), loadCoachData);
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
  console.log(`  Strava: ${strava.configured ? 'configured' : 'not configured (set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET)'}`);
  console.log(`  Coach: ${coachEnabled() ? `on${PASSCODE ? ' (passcode required)' : ''}` : 'off (set ANTHROPIC_API_KEY)'}`);
});
