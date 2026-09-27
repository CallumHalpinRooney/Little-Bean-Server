// Run-level analysis: compare a run with your recent runs, see how form changes within the
// run, judge heart-rate recovery (and explain it), and gather everything that may have
// affected the run. Pure functions: take data in, return plain objects.

import { mean, median, clamp } from './stats.js';
import { RUN_TYPES } from './training.js';

const fmtPace = (s) => `${Math.floor(s / 60)}′${String(Math.round(s % 60)).padStart(2, '0')}″`;
export { fmtPace };

// Normal ranges from running-biomechanics literature, used to say whether a value is
// fine in absolute terms, not just versus your own history.
export const FORM_GUIDE = {
  cadence: { good: [165, 190], note: 'Most efficient runners sit around 165–185 steps/min at easy pace.' },
  voCm: { good: [6, 10], note: 'Under ~10 cm is typical for efficient runners; bouncing costs energy and loads the back.' },
  gctMs: { good: [200, 280], note: 'Shorter contact usually means a stiffer, more elastic stride.' },
  vertRatio: { good: [6, 10], note: 'Bounce per metre travelled. Lower is more economical.' },
  balanceL: { good: [49, 51], note: 'Within 49–51% is balanced. A drift of 1.5% or more often points to guarding an injury.' },
};

export function runsOf(data) {
  return data.workouts
    .filter((w) => RUN_TYPES.has(w.type) && w.distanceM > 0)
    .sort((a, b) => (a.start < b.start ? -1 : 1));
}

// Energy-equivalent flat pace: each metre climbed costs roughly as much as 7 m on the flat.
export const gradeAdjustedPace = (w) => w.durationS / ((w.distanceM + 7 * (w.elevationM ?? 0)) / 1000);

export function summary(w) {
  const d = w.dynamics ?? {};
  const rec = w.recovery;
  return {
    pace: w.durationS / (w.distanceM / 1000),
    gap: gradeAdjustedPace(w),
    avgHr: w.avgHr,
    efficiency: (w.distanceM / (w.durationS / 60)) / w.avgHr, // metres per minute per beat
    cadence: d.cadence, strideM: d.strideM, gctMs: d.gctMs, voCm: d.voCm, vertRatio: d.vertRatio, balanceL: d.balanceL,
    hrr60: rec ? rec.hrEnd - rec.hr60 : undefined,
    elevationM: w.elevationM ?? 0,
  };
}

const METRICS = [
  { key: 'gap', label: 'Effort-adjusted pace', fmt: fmtPace, lowerBetter: true, unit: '/km', diff: (d) => `${d > 0 ? '+' : '−'}${Math.round(Math.abs(d))} s` },
  { key: 'avgHr', label: 'Average heart rate', fmt: (v) => Math.round(v), unit: 'bpm', lowerBetter: true, neutral: true },
  { key: 'efficiency', label: 'Aerobic efficiency', fmt: (v) => v.toFixed(2), unit: 'm/beat', lowerBetter: false },
  { key: 'cadence', label: 'Cadence', fmt: (v) => Math.round(v), unit: 'spm', lowerBetter: false },
  { key: 'strideM', label: 'Stride length', fmt: (v) => v.toFixed(2), unit: 'm', neutral: true },
  { key: 'gctMs', label: 'Ground contact', fmt: (v) => Math.round(v), unit: 'ms', lowerBetter: true },
  { key: 'voCm', label: 'Vertical oscillation', fmt: (v) => v.toFixed(1), unit: 'cm', lowerBetter: true },
  { key: 'vertRatio', label: 'Vertical ratio', fmt: (v) => v.toFixed(1), unit: '%', lowerBetter: true },
  { key: 'balanceL', label: 'Left / right balance', fmt: (v) => `${v.toFixed(1)}L`, unit: '', balance: true },
  { key: 'hrr60', label: '1-min HR recovery', fmt: (v) => Math.round(v), unit: 'bpm', lowerBetter: false },
];

// This run against the median of your previous (up to) 10 runs.
export function compareRun(run, runs) {
  const idx = runs.findIndex((r) => r.id === run.id);
  const prior = runs.slice(Math.max(0, idx - 10), idx).map(summary);
  const me = summary(run);
  return METRICS.filter((m) => Number.isFinite(me[m.key])).map((m) => {
    const hist = prior.map((p) => p[m.key]).filter(Number.isFinite);
    const typical = hist.length >= 3 ? median(hist) : NaN;
    const delta = me[m.key] - typical;
    let tone = 'flat';
    if (Number.isFinite(delta)) {
      const rel = Math.abs(delta) / (Math.abs(typical) || 1);
      if (m.balance) tone = Math.abs(me[m.key] - 50) > Math.abs(typical - 50) + 0.7 ? 'down' : Math.abs(me[m.key] - 50) < Math.abs(typical - 50) - 0.7 ? 'up' : 'flat';
      else if (!m.neutral && rel > 0.025) tone = (m.lowerBetter ? delta < 0 : delta > 0) ? 'up' : 'down';
    }
    return { ...m, value: me[m.key], typical, delta, tone, n: hist.length };
  });
}

// Split a run into thirds to see whether form holds or fades as you tire.
export function thirds(run) {
  const s = run.series;
  if (!s?.length) return null;
  const k = Math.floor(s.length / 3);
  const part = (a, b) => s.slice(a, b);
  const avg = (arr, key) => mean(arr.map((p) => p[key]));
  const parts = [part(0, k), part(k, 2 * k), part(2 * k, s.length)];
  const out = {};
  for (const key of ['cadence', 'vo', 'gct', 'bal', 'hr', 'pace']) out[key] = parts.map((p) => avg(p, key));
  // Cardiac drift: heart rate per unit of grade-adjusted speed, second half vs first half.
  // Skips the warm-up and the last 15% so a hilly finish isn't mistaken for drift.
  const step = (run.distanceM / s.length) || 1;
  const flatSpeed = s.map((p, i) => {
    const g = i ? (p.elev - s[i - 1].elev) / step : 0;
    return (1000 / p.pace) * (g > 0 ? 1 + 3.3 * g : 1 + 1.6 * g);
  });
  const lo = Math.floor(s.length * 0.1), hi = Math.floor(s.length * 0.85), mid = Math.floor((lo + hi) / 2);
  const ratio = (a, b) => mean(s.slice(a, b).map((p, i) => p.hr / flatSpeed[a + i]));
  out.drift = ratio(mid, hi) / ratio(lo, mid) - 1;
  out.voFade = out.vo[2] - out.vo[0];
  out.cadFade = out.cadence[2] - out.cadence[0];
  return out;
}

// Elevation change and effort over the final stretch of a run.
function finish(run) {
  const s = run.series;
  const n = Math.max(2, Math.round(s.length * 0.15));
  const tail = s.slice(-n);
  const climb = Math.max(0, tail.at(-1).elev - tail[0].elev); // net climb, not rolling bumps
  const tailPace = mean(tail.map((p) => p.pace));
  const allPace = mean(s.map((p) => p.pace));
  return { climb, fastFinish: tailPace < allPace * 0.95, tailMinutes: (n * 30) / 60 };
}

// Heart-rate recovery: how much of the gap between finishing and resting heart rate you
// shed in 60 s. Normalising by that gap makes hard and easy finishes comparable.
export function recovery(run, runs, data) {
  if (!run.recovery) return null;
  const rest = mean(data.days.slice(-28).map((d) => d.rhr)) || 60;
  const fracOf = (w) => (w.recovery.hrEnd - w.recovery.hr60) / Math.max(20, w.recovery.hrEnd - rest);
  const withRec = runs.filter((w) => w.recovery);
  const fracs = withRec.map((w) => ({ id: w.id, f: fracOf(w), drop: w.recovery.hrEnd - w.recovery.hr60, end: w.recovery.hrEnd }));
  const mine = fracs.find((x) => x.id === run.id);
  const others = fracs.filter((x) => x.id !== run.id);
  const typicalF = median(others.map((x) => x.f));
  const typicalEnd = median(others.map((x) => x.end));
  const typicalDrop = median(others.map((x) => x.drop));
  const rank = [...fracs].sort((a, b) => b.f - a.f).findIndex((x) => x.id === run.id) + 1;
  const ratio = mine.f / typicalF;
  const verdict = ratio > 1.07 ? 'Faster than usual' : ratio < 0.9 ? 'Slower than usual' : 'Normal';

  // Why: every plausible contributor that the data can actually show.
  const reasons = [];
  if (run.series) {
    const f = finish(run);
    if (f.climb >= 25) reasons.push({ weight: 3, text: `You finished on a climb: +${Math.round(f.climb)} m in the last ${Math.round(f.tailMinutes)} min. Your heart rate was ${Math.round(run.recovery.hrEnd - typicalEnd)} bpm above your usual finish, so there was more to recover from. Some of the slower recovery is the hill, not your fitness.` });
    else if (f.fastFinish) reasons.push({ weight: 2, text: 'You finished faster than your average pace, so you stopped at a higher effort than usual.' });
    const t = thirds(run);
    // Drift is only trustworthy on runnable terrain; steep trails swamp it with hill effects.
    const hilly = (run.elevationM ?? 0) / (run.distanceM / 1000) > 20;
    if (t && !hilly && t.drift > 0.06) reasons.push({ weight: 2, text: `Heart rate drifted ${Math.round(t.drift * 100)}% relative to pace in the second half. That usually means heat, dehydration or low glycogen, and it slows recovery.` });
  }
  const bal = run.dynamics?.balanceL;
  if (Number.isFinite(bal) && Math.abs(bal - 50) >= 1.5) {
    reasons.push({ weight: 2, text: `Your stride was lopsided (${bal.toFixed(1)}% of ground contact on the ${bal > 50 ? 'left' : 'right'}). Protecting one side costs extra energy and keeps heart rate up.` });
  }
  const day = data.days.find((d) => d.date === run.start.slice(0, 10));
  const idx = data.days.indexOf(day);
  const base = data.days.slice(Math.max(0, idx - 60), idx);
  if (day && Number.isFinite(day.hrv)) {
    const usual = Math.exp(mean(base.map((d) => Math.log(d.hrv)).filter(Number.isFinite)));
    const pct = day.hrv / usual - 1;
    if (pct < -0.1) reasons.push({ weight: 2, text: `That morning your HRV was ${Math.round(-pct * 100)}% below normal (${day.hrv} vs ${Math.round(usual)} ms). You started the run less recovered.` });
    if (pct > 0.08 && verdict !== 'Slower than usual') reasons.push({ weight: 1, text: `You started well recovered: HRV ${Math.round(pct * 100)}% above normal that morning.` });
  }
  if (day?.sleep) {
    const asleep = day.sleep.deepMin + day.sleep.lightMin + day.sleep.remMin;
    if (asleep < 6.5 * 60) reasons.push({ weight: 1, text: `Short sleep the night before (${Math.floor(asleep / 60)}h ${asleep % 60}m).` });
  }
  if (run.durationS > 1.3 * median(runs.map((w) => w.durationS))) reasons.push({ weight: 1, text: 'This was one of your longer runs, so fatigue had more time to build.' });
  if (!reasons.length) reasons.push({ weight: 0, text: 'Nothing unusual in the finish, your pre-run recovery or the conditions. This is simply how you recover right now.' });

  // Like-for-like: if this run ended on a climb, compare it with your other climb finishes.
  let likeForLike = null;
  if (run.series && finish(run).climb >= 25) {
    const hillIds = new Set(withRec.filter((w) => w.id !== run.id && w.series && finish(w).climb >= 25).map((w) => w.id));
    const hills = fracs.filter((x) => hillIds.has(x.id));
    if (hills.length) {
      const hf = median(hills.map((x) => x.f));
      likeForLike = { n: hills.length, ratio: mine.f / hf, text: mine.f / hf > 0.93
        ? `Compared with your ${hills.length} other climb finish${hills.length > 1 ? 'es' : ''}, this recovery is normal.`
        : `Even against your ${hills.length} other climb finish${hills.length > 1 ? 'es' : ''}, recovery was slower, so something beyond the hill played a part.` };
    }
  }

  // Next morning: did the run cost more than usual?
  const next = data.days[idx + 1];
  let nextMorning = null;
  if (next && Number.isFinite(next.hrv)) {
    const usual = Math.exp(mean(base.map((d) => Math.log(d.hrv)).filter(Number.isFinite)));
    nextMorning = { hrv: next.hrv, pct: next.hrv / usual - 1, rhr: next.rhr };
  }

  return {
    drop: mine.drop, hrEnd: run.recovery.hrEnd, hr60: run.recovery.hr60, hr120: run.recovery.hr120,
    frac: mine.f, typicalF, typicalDrop, rank, of: fracs.length, verdict,
    reasons: reasons.sort((a, b) => b.weight - a.weight), likeForLike, nextMorning,
  };
}

// Everything that may have influenced the run: automatic context plus your own notes.
export function context(run, data, notes = {}) {
  const date = run.start.slice(0, 10);
  const day = data.days.find((d) => d.date === date);
  const idx = data.days.indexOf(day);
  const base = data.days.slice(Math.max(0, idx - 60), idx);
  const items = [];
  if (day?.sleep) {
    const asleep = day.sleep.deepMin + day.sleep.lightMin + day.sleep.remMin;
    items.push({ label: 'Sleep before', value: `${Math.floor(asleep / 60)}h ${asleep % 60}m`, tone: asleep < 390 ? 'warn' : 'good' });
  }
  if (day && Number.isFinite(day.hrv)) {
    const usual = Math.exp(mean(base.map((d) => Math.log(d.hrv)).filter(Number.isFinite)));
    const pct = day.hrv / usual - 1;
    items.push({ label: 'Morning HRV', value: `${day.hrv} ms (${pct >= 0 ? '+' : '−'}${Math.round(Math.abs(pct) * 100)}%)`, tone: pct < -0.1 ? 'warn' : 'good' });
  }
  if (day && Number.isFinite(day.stress)) items.push({ label: 'Day’s stress', value: `${day.stress}`, tone: day.stress >= 40 ? 'warn' : 'good' });
  const runs = runsOf(data);
  const i = runs.findIndex((r) => r.id === run.id);
  if (i > 0) {
    const gap = (new Date(run.start) - new Date(runs[i - 1].start)) / 864e5;
    items.push({ label: 'Since last run', value: `${Math.round(gap)} day${Math.round(gap) === 1 ? '' : 's'}`, tone: gap < 1.5 ? 'warn' : 'good' });
  }
  const hour = new Date(run.start).getHours();
  items.push({ label: 'Time of day', value: `${String(hour).padStart(2, '0')}:${String(new Date(run.start).getMinutes()).padStart(2, '0')}`, tone: hour >= 19 ? 'warn' : 'good', hint: hour >= 19 ? 'Late runs cost you deep sleep' : null });
  if (run.elevationM) items.push({ label: 'Climbing', value: `${run.elevationM} m`, tone: run.elevationM > 150 ? 'warn' : 'good' });
  const n = notes[run.id];
  return { items, tags: n?.tags ?? [], note: n?.text ?? '' };
}

export const RUN_TAGS = ['Sore back', 'Tired legs', 'New shoes', 'Hot', 'Windy', 'After alcohol', 'Felt ill', 'Ate late', 'Felt great', 'Race'];

// Form over time: latest three runs vs the six before, per metric.
export function formTrend(runs) {
  const withDyn = runs.filter((r) => r.dynamics);
  if (withDyn.length < 5) return null;
  const recent = withDyn.slice(-3), before = withDyn.slice(-9, -3);
  const rows = ['balanceL', 'voCm', 'cadence', 'gctMs', 'vertRatio'].map((key) => {
    const a = mean(before.map((r) => r.dynamics[key])), b = mean(recent.map((r) => r.dynamics[key]));
    return { key, before: a, now: b, delta: b - a, series: withDyn.slice(-12).map((r) => r.dynamics[key]), since: recent[0].start.slice(0, 10) };
  });
  return Object.fromEntries(rows.map((r) => [r.key, r]));
}

export const clampPct = (v) => clamp(v, 0, 100);
