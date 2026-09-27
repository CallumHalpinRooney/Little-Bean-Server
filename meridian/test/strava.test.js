import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createStrava, mapActivity, bucketStreams } from '../server/strava.js';
import { buildDemo } from '../public/js/data/demo.js';
import { analyse } from '../public/js/analysis/engine.js';
import { runsOf, compareRun, thirds, formTrend } from '../public/js/analysis/runs.js';

// Shapes follow Strava's API v3 (SummaryActivity and StreamSet with key_by_type=true).
const RUN = {
  id: 9001, name: 'Morning Run', sport_type: 'Run', type: 'Run', start_date: '2026-09-25T06:10:00Z',
  moving_time: 1800, elapsed_time: 1850, distance: 5020, total_elevation_gain: 34,
  average_heartrate: 151.4, max_heartrate: 172, average_cadence: 83.5, has_heartrate: true,
};
const GOLF = { id: 9002, name: 'Golf', sport_type: 'Golf', start_date: '2026-09-26T10:00:00Z', moving_time: 2400, distance: 0, total_elevation_gain: 0 };
function streamsFor(seconds) {
  const time = Array.from({ length: seconds }, (_, i) => i);
  return {
    time: { data: time },
    heartrate: { data: time.map((t) => 130 + Math.round(t / 60)) },
    velocity_smooth: { data: time.map((t) => (t >= 600 && t < 660 ? 0 : 2.8)) }, // a one-minute pause
    altitude: { data: time.map((t) => 20 + t / 100) },
    cadence: { data: time.map(() => 84) },
  };
}

test('Strava activities map to Meridian workouts', () => {
  const w = mapActivity(RUN, streamsFor(1800));
  assert.equal(w.id, 'strava-9001');
  assert.equal(w.type, 'run');
  assert.equal(w.distanceM, 5020);
  assert.equal(w.avgHr, 151);
  assert.equal(w.dynamics.cadence, 167, 'Strava cadence is per foot; Meridian counts both feet');
  assert.equal(w.series.length, 60, '30-second buckets');
  assert.equal(w.series.find((p) => p.t === 600).pace, null, 'a pause keeps heart rate but has no pace');
  assert.equal(w.series[0].cadence, 168);
  assert.equal(w.series[0].pace, Math.round(1000 / 2.8));
  assert.equal(w.series[0].vo, null, 'no running-form data from Strava');
  const g = mapActivity(GOLF, null);
  assert.equal(g.type, 'golf');
  assert.equal(g.avgHr, null);
  assert.ok(g.kcal > 0);
  assert.equal(bucketStreams({ time: { data: [0] } }, 'run'), null);
});

test('the app analyses Strava runs, including ones with partial data', () => {
  const data = buildDemo();
  const ids = [];
  data.workouts = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 8, 12 + i * 2, 7));
    const a = { ...RUN, id: 100 + i, start_date: d.toISOString(), average_cadence: 83 + (i % 3) };
    ids.push(`strava-${a.id}`);
    return mapActivity(a, i === 3 ? null : streamsFor(1800)); // one run has no streams
  });
  data.workouts.push(mapActivity({ ...GOLF, start_date: '2026-09-20T10:00:00Z' }, null));
  const a = analyse(data);
  assert.ok(Number.isFinite(a.training.acwr));
  assert.ok(a.training.distribution.easy + a.training.distribution.moderate + a.training.distribution.hard > 0.99, 'zones come from the heart-rate series');
  const runs = runsOf(data);
  assert.equal(runs.length, 8);
  const cmp = compareRun(runs.at(-1), runs);
  assert.ok(cmp.some((m) => m.key === 'cadence') && !cmp.some((m) => m.key === 'voCm'));
  const th = thirds(runs.at(-1));
  assert.ok(Number.isFinite(th.cadence[0]) && Number.isNaN(th.vo[0]));
  const ft = formTrend(runs);
  assert.deepEqual(Object.keys(ft), ['cadence'], 'only metrics Strava measured are trended');
});

test('connect, sync, refresh and disconnect against a Strava stand-in', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'strava-'));
  const calls = [];
  let now = 1_000_000;
  const fakeFetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method ?? 'GET', auth: opts.headers?.authorization });
    const ok = (body) => ({ ok: true, status: 200, json: async () => body });
    if (url === 'https://www.strava.com/oauth/token') {
      const p = new URLSearchParams(opts.body);
      if (p.get('grant_type') === 'authorization_code') return ok({ access_token: 'A1', refresh_token: 'R1', expires_at: now + 21600, athlete: { firstname: 'Callum', lastname: 'R' } });
      if (p.get('grant_type') === 'refresh_token') return ok({ access_token: 'A2', refresh_token: 'R2', expires_at: now + 43200 });
    }
    if (String(url).includes('/athlete/activities')) return ok([RUN, GOLF]);
    if (String(url).includes('/streams')) return ok(streamsFor(1800));
    if (url === 'https://www.strava.com/oauth/deauthorize') return ok({});
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const realNow = Date.now;
  Date.now = () => now * 1000;
  try {
    const s = createStrava({ dataDir: dir, clientId: '123', clientSecret: 'shh', redirectUri: 'https://x/api/strava/callback', fetchImpl: fakeFetch });
    const login = new URL(s.loginUrl());
    assert.equal(login.searchParams.get('scope'), 'read,activity:read_all');
    const state = login.searchParams.get('state');
    await assert.rejects(s.callback({ code: 'c', state: 'forged', scope: 'read,activity:read_all' }), /expired/);
    await s.callback({ code: 'c', state, scope: 'read,activity:read_all' });
    let st = await s.status();
    assert.equal(st.connected, true);
    assert.equal(st.athlete, 'Callum R');

    const r = await s.sync();
    assert.equal(r.workouts.length, 2);
    assert.equal(r.workouts[0].id, 'strava-9001', 'oldest first');
    assert.ok(calls.some((c) => c.url.includes('/activities/9001/streams') && c.auth === 'Bearer A1'));
    assert.ok(!calls.some((c) => c.url.includes('/activities/9002/streams')), 'no streams for golf');

    // Second sync reuses cached streams; an expired token is refreshed first.
    now += 50_000;
    const before = calls.length;
    await s.sync();
    const fresh = calls.slice(before);
    assert.ok(fresh.some((c) => c.url.includes('/oauth/token')));
    assert.ok(fresh.some((c) => c.url.includes('/athlete/activities') && c.auth === 'Bearer A2'));
    assert.ok(!fresh.some((c) => c.url.includes('/streams')), 'streams are cached');

    await s.logout();
    assert.ok(calls.some((c) => c.url.includes('/oauth/deauthorize')));
    st = await s.status();
    assert.equal(st.connected, false);
  } finally {
    Date.now = realNow;
    await rm(dir, { recursive: true, force: true });
  }
});
