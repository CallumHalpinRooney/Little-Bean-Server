import { mean, ewma, last, slope, clamp } from './stats.js';
import { maxHr } from './norms.js';

export const RUN_TYPES = new Set(['run', 'trail_run']);
export const TYPE_LABEL = {
  run: 'Run', trail_run: 'Trail run', walk: 'Walk', golf: 'Golf', strength: 'Strength',
};

// Banister TRIMP: minutes × HR reserve fraction × sex-specific exponential weighting.
export function trimp(w, { restHr, maxHeart, sex }) {
  const hrr = clamp((w.avgHr - restHr) / (maxHeart - restHr), 0, 1);
  const [a, b] = sex === 'female' ? [0.86, 1.67] : [0.64, 1.92];
  return (w.durationS / 60) * hrr * a * Math.exp(b * hrr);
}

// Health Kit doesn't expose time-in-zone for every workout. When it's missing, place the
// session in the zone its average heart rate falls in, which is coarse but unbiased.
export function zonesOf(w, { restHr, maxHeart }) {
  const total = (w.zones ?? []).reduce((a, b) => a + b, 0);
  if (total > 0) return w.zones;
  const hrr = (w.avgHr - restHr) / (maxHeart - restHr);
  const z = hrr < 0.5 ? 0 : hrr < 0.7 ? 1 : hrr < 0.8 ? 2 : hrr < 0.9 ? 3 : 4;
  return [0, 1, 2, 3, 4].map((i) => (i === z ? w.durationS : 0));
}

export function analyseTraining(data) {
  const { profile, days } = data;
  const restHr = mean(last(days, 28).map((d) => d.rhr)) || 60;
  const maxHeart = maxHr(profile.age);
  const ctx = { restHr, maxHeart, sex: profile.sex };
  const workouts = data.workouts.map((w) => ({ ...w, zones: zonesOf(w, ctx) }));

  const byDate = new Map(days.map((d) => [d.date, 0]));
  for (const w of workouts) {
    const k = w.start.slice(0, 10);
    if (byDate.has(k)) byDate.set(k, byDate.get(k) + trimp(w, ctx));
  }
  const load = [...byDate.values()];
  const acute = ewma(load, 7);
  const chronic = ewma(load, 28);
  const acwr = chronic.at(-1) > 1 ? acute.at(-1) / chronic.at(-1) : 1;

  // Intensity distribution of running over the last 28 days.
  const since = new Date(new Date(days.at(-1).date).getTime() - 28 * 864e5);
  const recentRuns = workouts.filter((w) => RUN_TYPES.has(w.type) && new Date(w.start) >= since);
  const z = [0, 0, 0, 0, 0];
  recentRuns.forEach((w) => w.zones.forEach((s, i) => (z[i] += s)));
  const zTotal = z.reduce((a, b) => a + b, 0) || 1;
  const distribution = {
    easy: (z[0] + z[1]) / zTotal,
    moderate: z[2] / zTotal,
    hard: (z[3] + z[4]) / zTotal,
  };

  // Weekly running volume, oldest → newest, for the last 8 weeks.
  const end = new Date(`${days.at(-1).date}T23:59:59`);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const hi = new Date(end.getTime() - i * 7 * 864e5);
    const lo = new Date(hi.getTime() - 7 * 864e5);
    const ws = workouts.filter((w) => new Date(w.start) > lo && new Date(w.start) <= hi);
    return {
      km: ws.filter((w) => RUN_TYPES.has(w.type)).reduce((a, w) => a + w.distanceM / 1000, 0),
      sessions: ws.length,
      activeMin: ws.reduce((a, w) => a + (w.zones[1] + w.zones[2] + 2 * (w.zones[3] + w.zones[4])) / 60, 0),
    };
  }).reverse();

  // Aerobic efficiency: metres per minute per beat. Rising = the engine is improving.
  const runs = workouts.filter((w) => RUN_TYPES.has(w.type) && w.distanceM > 0);
  const efficiency = runs.map((w) => ({
    date: w.start.slice(0, 10),
    value: (w.distanceM / (w.durationS / 60)) / w.avgHr,
  }));
  const effTrend = slope(last(efficiency, 12).map((e) => e.value));

  // Easy-run heart-rate ceiling: top of zone 2 (≈ 70% of HR reserve, Karvonen).
  const z2Ceiling = Math.round(restHr + 0.7 * (maxHeart - restHr));

  return {
    load, acute, chronic,
    acwr,
    fitness: chronic.at(-1),
    fatigue: acute.at(-1),
    form: chronic.at(-1) - acute.at(-1),
    distribution,
    runCount28: recentRuns.length,
    weeks,
    efficiency,
    effTrend,
    z2Ceiling,
    maxHeart,
    restHr,
    activeMinThisWeek: Math.round(weeks.at(-1).activeMin),
    recent: [...workouts].sort((a, b) => (a.start < b.start ? 1 : -1)),
  };
}

export const paceStr = (w) => {
  if (!w.distanceM) return null;
  const s = w.durationS / (w.distanceM / 1000);
  return `${Math.floor(s / 60)}′${String(Math.round(s % 60)).padStart(2, '0')}″`;
};
export const durStr = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m} min`;
};
