// Strava connection. Huawei Health can sync every workout to Strava automatically
// (Huawei Health → Me → Data sharing and authorisation → Strava), and Strava's API is free
// and open to personal apps, so this is the quickest way to get real runs into Meridian.
//
// Flow: /api/strava/login → Strava consent → /api/strava/callback (token saved) → sync.
// A sync lists activities from the last 120 days and downloads per-second streams (heart
// rate, speed, altitude, cadence) for recent runs and walks, cached so each is fetched once.
// Everything is mapped to Meridian's workout schema (public/js/data/schema.js).
//
// Strava doesn't provide sleep, HRV or running-form metrics (oscillation, ground contact,
// balance); those still come from the demo data or Huawei Health Kit.

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const AUTH = 'https://www.strava.com/oauth/authorize';
const TOKEN = 'https://www.strava.com/oauth/token';
const DEAUTH = 'https://www.strava.com/oauth/deauthorize';
const API = 'https://www.strava.com/api/v3';
const DAYS = 120;
const MAX_STREAMS = 60;          // keeps a first sync well inside Strava's 100 requests / 15 min
const STALE_MS = 60 * 60 * 1000; // background re-sync when data is older than an hour

const TYPE = {
  Run: 'run', VirtualRun: 'run', TrailRun: 'trail_run', Walk: 'walk', Hike: 'walk',
  Golf: 'golf', WeightTraining: 'strength', Workout: 'strength', Crossfit: 'strength',
  Ride: 'ride', VirtualRide: 'ride', MountainBikeRide: 'ride', Swim: 'swim', Yoga: 'yoga',
};
const KCAL_PER_MIN = { run: 11.5, trail_run: 12, walk: 5, golf: 4.4, strength: 7, ride: 9, swim: 9, yoga: 3 };

// Per-second streams → 30-second buckets, the resolution Meridian's run analysis uses.
export function bucketStreams(streams, type) {
  const time = streams?.time?.data;
  if (!Array.isArray(time) || time.length < 2) return null;
  const pick = (k) => streams[k]?.data;
  const hr = pick('heartrate'), vel = pick('velocity_smooth'), alt = pick('altitude'), cad = pick('cadence');
  const out = [];
  const end = time.at(-1);
  // Strava reports running cadence per foot; Meridian (like the watch) uses steps per minute.
  const cadScale = type === 'run' || type === 'trail_run' || type === 'walk' ? 2 : 1;
  for (let t0 = 0, i = 0; t0 <= end; t0 += 30) {
    const acc = { hr: [], v: [], alt: [], cad: [] };
    while (i < time.length && time[i] < t0 + 30) {
      if (hr?.[i] > 0) acc.hr.push(hr[i]);
      if (vel?.[i] > 0.3) acc.v.push(vel[i]);
      if (Number.isFinite(alt?.[i])) acc.alt.push(alt[i]);
      if (cad?.[i] > 0) acc.cad.push(cad[i] * cadScale);
      i++;
    }
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const v = avg(acc.v);
    if (v === null && !acc.hr.length) continue; // paused
    out.push({
      t: t0,
      hr: acc.hr.length ? Math.round(avg(acc.hr)) : null,
      pace: v ? Math.round(1000 / v) : null,
      elev: acc.alt.length ? Math.round(avg(acc.alt) * 10) / 10 : null,
      cadence: acc.cad.length ? Math.round(avg(acc.cad)) : null,
      vo: null, gct: null, bal: null, // running form isn't available from Strava
    });
  }
  return out.length >= 3 ? out : null;
}

// One Strava activity (+ optional streams) → one Meridian workout.
export function mapActivity(a, streams) {
  const type = TYPE[a.sport_type] ?? TYPE[a.type] ?? String(a.sport_type ?? a.type ?? 'workout').toLowerCase();
  const durationS = Math.round(a.moving_time || a.elapsed_time || 0);
  const series = streams ? bucketStreams(streams, type) : null;
  const running = type === 'run' || type === 'trail_run';
  const cadence = running && a.average_cadence ? Math.round(a.average_cadence * 2) : null;
  const speedMpm = a.distance && durationS ? a.distance / (durationS / 60) : null;
  return {
    id: `strava-${a.id}`,
    name: a.name,
    type,
    start: new Date(a.start_date).toISOString(),
    durationS,
    distanceM: Math.round(a.distance || 0),
    avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
    kcal: a.calories ? Math.round(a.calories) : a.kilojoules ? Math.round(a.kilojoules / 4.184 / 0.24) : Math.round((durationS / 60) * (KCAL_PER_MIN[type] ?? 7)),
    elevationM: Math.round(a.total_elevation_gain || 0),
    zones: [0, 0, 0, 0, 0], // worked out from the heart-rate series by the analysis engine
    ...(series ? { series } : {}),
    ...(cadence ? { dynamics: { cadence, strideM: speedMpm ? +(speedMpm / cadence).toFixed(2) : null } } : {}),
    source: 'strava',
  };
}

export function createStrava({ dataDir, clientId, clientSecret, redirectUri, fetchImpl = fetch }) {
  const tokenFile = path.join(dataDir, 'strava-tokens.json');
  const cacheFile = path.join(dataDir, 'strava-workouts.json');
  const streamDir = path.join(dataDir, 'strava-streams');
  const pendingStates = new Map();
  const configured = Boolean(clientId && clientSecret);
  let syncing = null;

  const load = async (f) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; } };
  const save = async (f, v) => { await mkdir(path.dirname(f), { recursive: true }); await writeFile(f, JSON.stringify(v), { mode: 0o600 }); };

  function loginUrl() {
    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, Date.now());
    return `${AUTH}?${new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
      approval_prompt: 'auto', scope: 'read,activity:read_all', state,
    })}`;
  }

  async function tokenRequest(params) {
    const res = await fetchImpl(TOKEN, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) throw new Error(`Strava sign-in failed: ${body.message ?? res.status}`);
    return body;
  }

  async function callback({ code, state, scope }) {
    const t = pendingStates.get(state);
    pendingStates.delete(state);
    if (!t || Date.now() - t > 10 * 60_000) throw new Error('Strava sign-in expired. Please try again.');
    if (!String(scope ?? '').includes('activity:read')) throw new Error('Meridian needs permission to read your activities. Please connect again and leave that box ticked.');
    const body = await tokenRequest({ code, grant_type: 'authorization_code' });
    await save(tokenFile, {
      access: body.access_token, refresh: body.refresh_token, expiresAt: body.expires_at * 1000,
      athlete: body.athlete ? `${body.athlete.firstname ?? ''} ${body.athlete.lastname ?? ''}`.trim() : null,
    });
  }

  async function accessToken() {
    const tok = await load(tokenFile);
    if (!tok) throw new Error('Strava is not connected');
    if (Date.now() < tok.expiresAt - 60_000) return tok.access;
    const body = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tok.refresh });
    const fresh = { ...tok, access: body.access_token, refresh: body.refresh_token ?? tok.refresh, expiresAt: body.expires_at * 1000 };
    await save(tokenFile, fresh);
    return fresh.access;
  }

  async function api(p) {
    const res = await fetchImpl(`${API}${p}`, { headers: { authorization: `Bearer ${await accessToken()}` } });
    if (res.status === 429) throw new Error('Strava’s rate limit was reached. Try syncing again in 15 minutes.');
    if (!res.ok) throw new Error(`Strava ${p.split('?')[0]} → ${res.status}`);
    return res.json();
  }

  async function streamsFor(id) {
    const file = path.join(streamDir, `${id}.json`);
    const cached = await load(file);
    if (cached) return cached;
    const s = await api(`/activities/${id}/streams?keys=time,heartrate,velocity_smooth,altitude,cadence&key_by_type=true`);
    await save(file, s);
    return s;
  }

  async function doSync() {
    const after = Math.floor((Date.now() - DAYS * 864e5) / 1000);
    const activities = [];
    for (let page = 1; page <= 5; page++) {
      const batch = await api(`/athlete/activities?after=${after}&per_page=100&page=${page}`);
      activities.push(...batch);
      if (batch.length < 100) break;
    }
    activities.sort((a, b) => (a.start_date < b.start_date ? 1 : -1)); // newest first
    let streamed = 0;
    const workouts = [];
    for (const a of activities) {
      const type = TYPE[a.sport_type] ?? TYPE[a.type];
      let streams = null;
      if (['run', 'trail_run', 'walk'].includes(type) && streamed < MAX_STREAMS) {
        try { streams = await streamsFor(a.id); streamed++; } catch (e) { if (/rate limit/.test(e.message)) break; }
      }
      workouts.push(mapActivity(a, streams));
    }
    const tok = await load(tokenFile);
    const result = { lastSync: new Date().toISOString(), athlete: tok?.athlete ?? null, workouts: workouts.reverse() };
    await save(cacheFile, result);
    return result;
  }

  const sync = () => (syncing ??= doSync().finally(() => { syncing = null; }));

  return {
    configured,
    loginUrl,
    callback,
    sync,
    async status() {
      const [tok, cache] = await Promise.all([load(tokenFile), load(cacheFile)]);
      return { configured, connected: configured && Boolean(tok), athlete: tok?.athlete ?? null, lastSync: cache?.lastSync ?? null, workouts: cache?.workouts?.length ?? 0 };
    },
    async workouts() {
      const cache = await load(cacheFile);
      if (!cache) return sync();
      if (Date.now() - new Date(cache.lastSync).getTime() > STALE_MS) sync().catch((e) => console.warn(e.message));
      return cache;
    },
    async logout() {
      const tok = await load(tokenFile);
      if (tok) await fetchImpl(DEAUTH, { method: 'POST', headers: { authorization: `Bearer ${tok.access}` } }).catch(() => {});
      await Promise.all([rm(tokenFile, { force: true }), rm(cacheFile, { force: true }), rm(streamDir, { recursive: true, force: true })]);
    },
  };
}
