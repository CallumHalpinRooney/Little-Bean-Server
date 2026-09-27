// Huawei Health Kit (cloud REST API) adapter.
//
// How the connection works:
//   watch → Huawei Health app (Bluetooth) → Huawei cloud → Health Kit REST API → this server.
// The watch has no public on-device API for third-party phone apps, so the cloud route is
// the supported way in. You need a Huawei developer account, an app in AppGallery Connect
// with Health Kit enabled, and the read scopes below approved (see README).
//
// Endpoint paths, scopes and data-type names follow Huawei's Health Kit REST documentation.
// Huawei changes these occasionally, so they live in one place (HK below). /api/huawei/raw
// returns the unprocessed responses so the mapping can be checked against real data.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const HK = {
  authorize: 'https://oauth-login.cloud.huawei.com/oauth2/v3/authorize',
  token: 'https://oauth-login.cloud.huawei.com/oauth2/v3/token',
  api: 'https://health-api.cloud.huawei.com/healthkit',
  scopes: [
    'openid',
    'https://www.huawei.com/healthkit/step.read',
    'https://www.huawei.com/healthkit/heartrate.read',
    'https://www.huawei.com/healthkit/sleep.read',
    'https://www.huawei.com/healthkit/stress.read',
    'https://www.huawei.com/healthkit/oxygensaturation.read',
    'https://www.huawei.com/healthkit/bodyweight.read',
    'https://www.huawei.com/healthkit/activity.read',
    'https://www.huawei.com/healthkit/activityrecord.read',
  ],
  types: {
    steps: 'com.huawei.continuous.steps.delta',
    restingHr: 'com.huawei.instantaneous.resting_heart_rate',
    heartRate: 'com.huawei.instantaneous.heart_rate',
    stress: 'com.huawei.instantaneous.stress',
    spo2: 'com.huawei.instantaneous.spo2',
    weight: 'com.huawei.instantaneous.body_weight',
    hrv: 'com.huawei.instantaneous.hrv',
    vo2max: 'com.huawei.instantaneous.vo2max',
    sleepRecord: 'com.huawei.health.record.sleep',
    sleepFragment: 'com.huawei.continuous.sleep.fragment',
  },
};

// Huawei sleep-fragment status codes → our stage names.
const SLEEP_STAGE = { 1: 'light', 2: 'rem', 3: 'deep', 4: 'awake', 5: 'light' };
// Huawei activity types → ours. Unknown types are kept as-is.
const ACTIVITY = { 'com.huawei.activity.running': 'run', 'com.huawei.activity.trail_running': 'trail_run', 'com.huawei.activity.walking': 'walk', 'com.huawei.activity.golf': 'golf', 'com.huawei.activity.strength_training': 'strength' };

export function createHuawei({ dataDir, clientId, clientSecret, redirectUri }) {
  const tokenFile = path.join(dataDir, 'huawei-tokens.json');
  const cacheFile = path.join(dataDir, 'huawei-cache.json');
  const pendingStates = new Map();
  const configured = Boolean(clientId && clientSecret);

  const load = async (f) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; } };
  const save = async (f, v) => { await mkdir(dataDir, { recursive: true }); await writeFile(f, JSON.stringify(v), { mode: 0o600 }); };

  function loginUrl() {
    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, Date.now());
    const q = new URLSearchParams({
      response_type: 'code', access_type: 'offline', client_id: clientId,
      redirect_uri: redirectUri, scope: HK.scopes.join(' '), state,
    });
    return `${HK.authorize}?${q}`;
  }

  async function tokenRequest(params) {
    const res = await fetch(HK.token, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) throw new Error(`Huawei token error: ${body.error_description ?? body.error ?? res.status}`);
    return { access: body.access_token, refresh: body.refresh_token ?? params.refresh_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 - 60_000 };
  }

  async function callback({ code, state }) {
    const t = pendingStates.get(state);
    pendingStates.delete(state);
    if (!t || Date.now() - t > 10 * 60_000) throw new Error('Login expired or invalid state. Please try again.');
    await save(tokenFile, await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }));
  }

  async function accessToken() {
    const tok = await load(tokenFile);
    if (!tok) throw new Error('Not connected');
    if (Date.now() < tok.expiresAt) return tok.access;
    const fresh = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tok.refresh });
    await save(tokenFile, fresh);
    return fresh.access;
  }

  async function api(method, p, body) {
    const res = await fetch(`${HK.api}${p}`, {
      method,
      headers: {
        authorization: `Bearer ${await accessToken()}`,
        'content-type': 'application/json',
        'x-client-id': clientId,
        'x-version': '1',
        'x-caller-trace-id': randomBytes(8).toString('hex'),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Health Kit ${p} → ${res.status} ${json.message ?? json.error ?? ''}`.trim());
    return json;
  }

  // Daily aggregates for one instantaneous/continuous data type.
  async function daily(type, start, end, tz) {
    const json = await api('POST', '/v1/sampleSet:polymerize', {
      polymerizeWith: [{ dataTypeName: type }],
      startTime: start, endTime: end,
      groupByTime: { groupPeriod: { timeZone: tz, type: 'day', value: 1 } },
    });
    const out = new Map();
    for (const g of json.group ?? []) {
      const pts = (g.sampleSet ?? []).flatMap((s) => s.samplePoints ?? []);
      if (!pts.length) continue;
      const date = new Date(Number(g.startTime)).toISOString().slice(0, 10);
      const vals = pts.flatMap((p) => (p.value ?? []).map((v) => v.floatValue ?? v.integerValue)).filter(Number.isFinite);
      if (vals.length) out.set(date, vals);
    }
    return out;
  }

  async function sync({ days = 120, tz = '+0000' } = {}) {
    const end = Date.now();
    const start = end - days * 864e5;
    const pick = (m, d, f) => { const v = m.get(d); return v?.length ? f(v) : null; };
    const avg = (v) => v.reduce((a, b) => a + b, 0) / v.length;
    const settle = async (p) => { try { return await p; } catch (e) { console.warn(e.message); return new Map(); } };

    const [steps, rhr, stress, spo2, weight, hrv, vo2] = await Promise.all([
      HK.types.steps, HK.types.restingHr, HK.types.stress, HK.types.spo2, HK.types.weight, HK.types.hrv, HK.types.vo2max,
    ].map((t) => settle(daily(t, start, end, tz))));

    let sleepRecords = [], activity = [];
    try {
      const q = new URLSearchParams({ startTime: start, endTime: end, dataType: HK.types.sleepRecord, subDataType: HK.types.sleepFragment });
      sleepRecords = (await api('GET', `/v2/healthRecords?${q}`)).healthRecords ?? [];
    } catch (e) { console.warn(e.message); }
    try {
      activity = (await api('GET', `/v1/activityRecords?${new URLSearchParams({ startTime: start, endTime: end })}`)).activityRecord ?? [];
    } catch (e) { console.warn(e.message); }

    const sleepByWake = new Map();
    for (const r of sleepRecords) {
      const frags = (r.subData?.[HK.types.sleepFragment]?.samplePoints ?? [])
        .map((p) => ({ s: SLEEP_STAGE[p.value?.[0]?.integerValue] ?? 'light', min: Math.round((Number(p.endTime) - Number(p.startTime)) / 6e10) }))
        .filter((f) => f.min > 0);
      if (!frags.length) continue;
      const sum = (k) => frags.filter((f) => f.s === k).reduce((a, f) => a + f.min, 0);
      const wake = new Date(Number(r.endTime) / 1e6 > 1e12 ? Number(r.endTime) / 1e6 : Number(r.endTime));
      const bed = new Date(Number(r.startTime) / 1e6 > 1e12 ? Number(r.startTime) / 1e6 : Number(r.startTime));
      sleepByWake.set(wake.toISOString().slice(0, 10), {
        bed: bed.toISOString(), wake: wake.toISOString(), stages: frags,
        deepMin: sum('deep'), lightMin: sum('light'), remMin: sum('rem'), awakeMin: sum('awake'),
      });
    }

    const out = [];
    for (let t = start; t <= end; t += 864e5) {
      const date = new Date(t).toISOString().slice(0, 10);
      out.push({
        date,
        sleep: sleepByWake.get(date) ?? null,
        rhr: pick(rhr, date, (v) => Math.round(Math.min(...v))),
        hrv: pick(hrv, date, (v) => Math.round(avg(v))),
        steps: pick(steps, date, (v) => Math.round(v.reduce((a, b) => a + b, 0))) ?? 0,
        stress: pick(stress, date, (v) => Math.round(avg(v))),
        spo2: pick(spo2, date, (v) => Math.round(avg(v))),
        weight: pick(weight, date, (v) => +v.at(-1).toFixed(1)),
        skinTemp: null,
      });
    }

    const workouts = activity.map((a) => {
      const startMs = Number(a.startTime), endMs = Number(a.endTime);
      const sum = a.activitySummary ?? {};
      const val = (name) => (sum.dataSummary ?? []).find((d) => d.dataTypeName?.includes(name))?.value?.[0]?.floatValue;
      return {
        id: a.id ?? String(startMs),
        type: ACTIVITY[a.activityType] ?? a.activityType ?? 'workout',
        start: new Date(startMs).toISOString(),
        durationS: Math.round((endMs - startMs) / 1000),
        distanceM: Math.round(val('distance') ?? 0),
        avgHr: Math.round(val('heart_rate') ?? 0),
        maxHr: null,
        kcal: Math.round(val('calories') ?? 0),
        // Time-in-zone isn't in the activity summary; the engine estimates it from avgHr.
        zones: [0, 0, 0, 0, 0],
        source: 'huawei',
      };
    }).filter((w) => w.durationS > 0);

    const vo2max = [...vo2.entries()].map(([date, v]) => ({ date, value: +avg(v).toFixed(1) }));
    const data = {
      source: 'huawei',
      device: { model: 'HUAWEI WATCH GT 6 Pro', lastSync: new Date().toISOString() },
      profile: { name: '', age: 35, sex: 'male', sleepNeedH: 7.75, isDefault: true },
      today: out.at(-1).date,
      days: out.filter((d) => d.rhr !== null || d.sleep),
      workouts,
      vo2max,
      hrToday: [],
      checks: [],
    };
    await save(cacheFile, data);
    return data;
  }

  return {
    configured,
    loginUrl,
    callback,
    sync,
    async connected() { return configured && Boolean(await load(tokenFile)); },
    async cached() { return (await load(cacheFile)) ?? sync(); },
    async logout() { await save(tokenFile, null); await save(cacheFile, null); },
    async raw(kind) {
      const end = Date.now(), start = end - 7 * 864e5;
      if (kind === 'sleep') return api('GET', `/v2/healthRecords?${new URLSearchParams({ startTime: start, endTime: end, dataType: HK.types.sleepRecord, subDataType: HK.types.sleepFragment })}`);
      if (kind === 'activity') return api('GET', `/v1/activityRecords?${new URLSearchParams({ startTime: start, endTime: end })}`);
      const type = HK.types[kind];
      if (!type) throw new Error(`Unknown kind. Use one of: sleep, activity, ${Object.keys(HK.types).join(', ')}`);
      return api('POST', '/v1/sampleSet:polymerize', { polymerizeWith: [{ dataTypeName: type }], startTime: start, endTime: end, groupByTime: { groupPeriod: { timeZone: '+0000', type: 'day', value: 1 } } });
    },
  };
}
