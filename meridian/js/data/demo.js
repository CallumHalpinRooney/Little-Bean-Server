// Demo dataset shaped like a Huawei Watch GT 6 Pro export, anchored to the real readings in
// the user's screenshots for 27 Sept 2026 (sleep 23:41→06:47, 6,894 steps, stress 18,
// SpO2 94–99 %, weight 88.9 kg, September workouts). Earlier days are synthetic but carry
// realistic cause-and-effect relationships so every analysis has something true to find.
//
// Everything the app renders goes through the normalised schema documented in schema.js,
// so swapping this for live Huawei Health Kit data needs no UI changes.

import { rng, clamp } from '../analysis/stats.js';

const DAYS = 120;
const ANCHOR = '2026-09-27';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (dateStr, hh, mm) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMinutes(hh * 60 + mm);
  return d;
};

// Real September sessions from the screenshots, plus the missing ones implied by the
// monthly totals (22.06 km running, 4.71 km walking, 5 golf sessions, 12 sessions).
const REAL_SEPT = [
  { date: '2026-09-23', hh: 17, mm: 7, type: 'walk', km: 3.03, sec: 52 * 60 + 46 },
  { date: '2026-09-22', hh: 18, mm: 0, type: 'trail_run', km: 4.01, sec: 25 * 60 + 24 },
  { date: '2026-09-20', hh: 10, mm: 30, type: 'golf', km: 0, sec: 38 * 60 },
  { date: '2026-09-17', hh: 19, mm: 40, type: 'strength', km: 0, sec: 35 * 60 },
  { date: '2026-09-14', hh: 18, mm: 0, type: 'trail_run', km: 6.01, sec: 43 * 60 + 35 },
  { date: '2026-09-13', hh: 11, mm: 0, type: 'golf', km: 0, sec: 32 * 60 },
  { date: '2026-09-12', hh: 15, mm: 5, type: 'walk', km: 1.68, sec: 28 * 60 + 4 },
  { date: '2026-09-11', hh: 12, mm: 28, type: 'trail_run', km: 5.02, sec: 33 * 60 + 10 },
  { date: '2026-09-07', hh: 10, mm: 15, type: 'golf', km: 0, sec: 30 * 60 },
  { date: '2026-09-05', hh: 19, mm: 30, type: 'run', km: 7.02, sec: 44 * 60 + 5 },
  { date: '2026-09-04', hh: 18, mm: 45, type: 'golf', km: 0, sec: 25 * 60 },
  { date: '2026-09-02', hh: 18, mm: 20, type: 'golf', km: 0, sec: 27 * 60 },
];

function hypnogram(r, totalMin, { deepBias = 0, awakeBias = 0 } = {}) {
  // Build ~90-minute cycles: deep sleep front-loaded, REM growing across the night.
  // Falling asleep takes a few minutes; it shows as awake time at the start of the night.
  const latency = Math.round(5 + r() * 12);
  const stages = [{ s: 'awake', min: latency }];
  let t = latency, cycle = 0;
  while (t < totalMin) {
    const lateness = t / totalMin;
    const seq = [
      ['light', 18 + r() * 14],
      ['deep', Math.max(4, (38 - lateness * 34) * (1 + deepBias) + r() * 8)],
      ['light', 10 + r() * 12],
      ['rem', 10 + lateness * 30 + r() * 8],
    ];
    if (cycle > 0 && r() < 0.35 + awakeBias) seq.unshift(['awake', 1 + r() * 4]);
    for (const [s, len] of seq) {
      const m = Math.round(Math.min(len, totalMin - t));
      if (m <= 0) break;
      stages.push({ s, min: m });
      t += m;
    }
    cycle++;
  }
  const sum = (k) => stages.filter((x) => x.s === k).reduce((a, b) => a + b.min, 0);
  return { stages, deepMin: sum('deep'), lightMin: sum('light'), remMin: sum('rem'), awakeMin: sum('awake') };
}

function zonesFor(type, sec, r) {
  // Seconds in HR zones 1–5. Runs are deliberately "grey-zone heavy" (Z3/Z4) — the
  // pattern the training analysis is designed to catch.
  const mix = {
    run: [0.04, 0.14, 0.42, 0.34, 0.06],
    trail_run: [0.05, 0.16, 0.40, 0.33, 0.06],
    walk: [0.55, 0.40, 0.05, 0, 0],
    golf: [0.7, 0.28, 0.02, 0, 0],
    strength: [0.3, 0.35, 0.25, 0.1, 0],
  }[type];
  const z = mix.map((p) => Math.max(0, p + (r() - 0.5) * 0.06));
  const s = z.reduce((a, b) => a + b, 0);
  return z.map((p) => Math.round((p / s) * sec));
}

const HR_BY_TYPE = { run: 158, trail_run: 156, walk: 104, golf: 96, strength: 122 };
const KCAL_PER_MIN = { run: 12.5, trail_run: 12.8, walk: 5.2, golf: 4.4, strength: 7.5 };

export function buildDemo() {
  const r = rng(27092026);
  const anchor = new Date(`${ANCHOR}T12:00:00`);
  const days = [];
  const workouts = [];
  const vo2max = [];
  const planned = REAL_SEPT.map((w) => ({ ...w }));
  let weight = 91.6;
  let vo2 = 41.2;

  // Workouts first, because they shape each night's sleep.
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    const date = isoDate(d);
    if (date >= '2026-09-01') continue;
    const dow = d.getDay();
    const plan = [];
    if ((dow === 2 || dow === 4) && r() < 0.8) plan.push(r() < 0.6 ? 'run' : 'trail_run');
    if (dow === 0 && r() < 0.75) plan.push(r() < 0.5 ? 'trail_run' : 'run');
    if (dow === 6 && r() < 0.55) plan.push('golf');
    if (dow === 3 && r() < 0.35) plan.push('strength');
    if (r() < 0.12) plan.push('walk');
    for (const type of plan) {
      const late = r() < 0.45;
      const hh = type === 'golf' ? 10 + Math.floor(r() * 4) : late ? 19 + Math.floor(r() * 2) : 7 + Math.floor(r() * 11);
      const km = type === 'run' || type === 'trail_run' ? 4 + r() * 6 : type === 'walk' ? 1.5 + r() * 3 : 0;
      const pace = type === 'run' ? 6.2 + r() * 0.9 : type === 'trail_run' ? 6.8 + r() * 1.2 : 15 + r() * 3;
      const sec = km ? Math.round(km * pace * 60) : Math.round((25 + r() * 25) * 60);
      planned.push({ date, hh, mm: Math.floor(r() * 50), type, km: +km.toFixed(2), sec });
    }
  }

  for (const w of planned.sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const start = at(w.date, w.hh, w.mm);
    const avgHr = Math.round(HR_BY_TYPE[w.type] + (r() - 0.5) * 10);
    workouts.push({
      id: `w-${w.date}-${w.hh}${pad(w.mm)}`,
      type: w.type,
      start: start.toISOString(),
      durationS: w.sec,
      distanceM: Math.round(w.km * 1000),
      avgHr,
      maxHr: Math.min(190, avgHr + Math.round(12 + r() * 16)),
      kcal: Math.round((w.sec / 60) * KCAL_PER_MIN[w.type] * (0.9 + r() * 0.2)),
      elevationM: w.type === 'trail_run' ? Math.round(60 + r() * 140) : Math.round(r() * 20),
      zones: zonesFor(w.type, w.sec, r),
      source: 'demo',
    });
  }

  let prevStress = 35;
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    const date = isoDate(d);
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    const prevDate = isoDate(prev);
    const isToday = date === ANCHOR;

    // Did yesterday end with a late workout? That night is this morning's sleep.
    const yWorkouts = workouts.filter((w) => w.start.slice(0, 10) === prevDate);
    const lateWorkout = yWorkouts.some((w) => {
      const end = new Date(new Date(w.start).getTime() + w.durationS * 1000);
      return end.getHours() >= 19 && w.type !== 'walk' && w.type !== 'golf';
    });
    const weekend = [5, 6].includes(prev.getDay());

    // Bedtime drifts later on weekends — the "social jet lag" pattern.
    const bedMin = isToday ? 23 * 60 + 41 : Math.round(23 * 60 + 25 + (weekend ? 55 : 0) + r.normal(0, 28));
    const wakeMin = isToday ? 6 * 60 + 47 : Math.round(6 * 60 + 50 + (weekend ? 70 : 0) + r.normal(0, 18));
    const inBed = wakeMin + 24 * 60 - bedMin;
    const bed = at(prevDate, 0, bedMin);
    const wake = at(date, 0, wakeMin);
    const hyp = hypnogram(r, inBed, { deepBias: lateWorkout ? -0.35 : 0, awakeBias: lateWorkout ? 0.2 : 0 });

    const stress = isToday ? 18 : Math.round(clamp(prevStress * 0.5 + 19 + r.normal(0, 9) + (d.getDay() === 1 ? 8 : 0), 10, 75));
    prevStress = stress;

    // RHR improves over the period (8 bpm lower than last year); HRV responds to late
    // training, late bedtimes and stress — the relationships the insights engine finds.
    const progress = (DAYS - i) / DAYS;
    const lateBed = bedMin > 24 * 60;
    let hrv = 44 + progress * 5 + r.normal(0, 5);
    hrv *= lateWorkout ? 0.86 : 1;
    hrv *= lateBed ? 0.9 : 1;
    hrv -= (stress - 35) * 0.12;
    let rhr = 60.5 - progress * 2.5 + r.normal(0, 1.4) + (lateWorkout ? 2 : 0) + (lateBed ? 1 : 0);
    if (isToday) { hrv = 49; rhr = 57; }

    const baseSteps = [0, 6].includes(d.getDay()) ? 9800 : 7200;
    const steps = isToday ? 6894 : Math.round(clamp(baseSteps + r.normal(0, 2600), 1800, 21000));

    weight += -0.022 + r.normal(0, 0.12);
    const weighIn = isToday ? 88.9 : r() < 0.3 ? +(weight + r.normal(0, 0.35)).toFixed(1) : null;
    if (isToday) weight = 88.9;

    vo2 = clamp(vo2 + 0.025 + r.normal(0, 0.05), 38, 50);
    if (i % 3 === 0 || isToday) vo2max.push({ date, value: +(isToday ? 44 : vo2).toFixed(1) });

    days.push({
      date,
      sleep: {
        bed: bed.toISOString(),
        wake: wake.toISOString(),
        ...hyp,
        spo2Min: isToday ? 94 : Math.round(clamp(r.normal(93.5, 1.2), 89, 97)),
        breathingRate: +(14.2 + r.normal(0, 0.5)).toFixed(1),
      },
      rhr: Math.round(rhr),
      hrv: Math.round(hrv),
      steps,
      stress,
      spo2: isToday ? 95 : Math.round(clamp(r.normal(96.5, 1), 93, 99)),
      skinTemp: i % 11 === 0 || date === '2026-09-13' ? +(31.6 + r.normal(0, 0.3)).toFixed(1) : null,
      weight: weighIn,
      activeKcal: Math.round(steps * 0.042 + r.normal(0, 40)),
      intakeKcal: null,
    });
  }

  // Today's intraday heart rate in 10-minute buckets up to ~15:00, as on the watch.
  const hrToday = [];
  for (let m = 0; m <= 15 * 60; m += 10) {
    const asleep = m < 6 * 60 + 47;
    const base = asleep ? 58 + Math.sin(m / 90) * 3 : m > 11 * 60 && m < 12 * 60 ? 96 : 76;
    hrToday.push({ t: m, bpm: Math.round(base + r.normal(0, asleep ? 2 : 7) + (m === 11 * 60 + 30 ? 38 : 0)) });
  }

  return {
    source: 'demo',
    device: { model: 'HUAWEI WATCH GT 6 Pro', battery: 51, lastSync: `${ANCHOR}T15:47:00` },
    profile: { name: '', age: 35, sex: 'male', heightCm: 182, weightKg: 88.9, sleepNeedH: 7.5, isDefault: true },
    today: ANCHOR,
    reportedDeficitKcal: 1783,
    days,
    workouts,
    vo2max,
    hrToday,
    checks: [
      { kind: 'ecg', at: `${ANCHOR}T11:15:00`, result: 'Sinus rhythm', detail: 'No signs of atrial fibrillation.' },
      { kind: 'pwa', at: `${ANCHOR}T12:00:00`, result: 'No abnormalities', detail: 'No signs of atrial fibrillation this time.' },
      { kind: 'arterial', at: '2026-09-22T11:40:00', result: 'Slightly stiff', level: 0.45, detail: 'Elasticity has decreased slightly.' },
    ],
  };
}
