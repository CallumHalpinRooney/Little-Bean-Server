// Goals and training plans, built on Jack Daniels' VDOT model (Daniels & Gilbert, 1979):
// one number that links race performance, oxygen cost of running and training paces.
// The plan periodises (base → build → peak → taper), progresses gradually with a deload every
// fourth week, keeps ~80% of running easy, and adapts to today's readiness and any
// symptom you've reported.

import { mean, median, clamp } from './stats.js';
import { runsOf, gradeAdjustedPace } from './runs.js';

// Oxygen cost (ml/kg/min) of running at v metres/minute.
export const vo2AtSpeed = (v) => -4.6 + 0.182258 * v + 0.000104 * v * v;
// Fraction of VO2max sustainable for t minutes.
export const pctMax = (t) => 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
export const vdotFromRace = (m, sec) => vo2AtSpeed(m / (sec / 60)) / pctMax(sec / 60);

export function predictSeconds(vdot, m) {
  let lo = m / 450 * 60, hi = m / 60 * 60; // bracket: very fast … walking
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdotFromRace(m, mid) > vdot) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Pace (s/km) at which running costs `fraction` of VDOT.
export function paceAt(vdot, fraction) {
  const vo2 = vdot * fraction, a = 0.000104, b = 0.182258, c = -(4.6 + vo2);
  const v = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  return 60000 / v;
}

export const DISTANCES = { 5000: '5K', 10000: '10K', 21097: 'Half marathon', 42195: 'Marathon' };
const PEAK_KM = { 5000: 32, 10000: 38, 21097: 50, 42195: 65 };

export const fmtTime = (secs) => {
  const s = Math.round(secs); // round first so 59.6 s never prints as ":60"
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
const fmtPace = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Current running fitness, blending the watch's VO2max with what your runs actually show.
// Each run gives an estimate from pace (effort-adjusted for hills) and heart-rate reserve,
// using the near-linear link between %HR reserve and %VO2 reserve (Swain 1997).
export function currentVdot(data, training) {
  const runs = runsOf(data).slice(-8);
  const { restHr, maxHeart } = training;
  const fromRuns = runs.map((w) => {
    const v = 60000 / gradeAdjustedPace(w);
    const hrr = (w.avgHr - restHr) / (maxHeart - restHr);
    return hrr > 0.45 ? 3.5 + (vo2AtSpeed(v) - 3.5) / hrr : NaN;
  }).filter(Number.isFinite);
  const watch = data.vo2max.at(-1)?.value;
  const runEst = fromRuns.length >= 3 ? median(fromRuns) : NaN;
  const blended = Number.isFinite(runEst) && watch ? (runEst + watch) / 2 : (runEst || watch || 40);
  // Race performance usually trails aerobic capacity for recreational runners (economy and
  // pacing), so VDOT sits a little below VO2max.
  return { vdot: +(blended * 0.92).toFixed(1), watch, runEst: Number.isFinite(runEst) ? +runEst.toFixed(1) : null };
}

export function paces(vdot, maxHeart, restHr) {
  const hr = (f) => Math.round(restHr + f * (maxHeart - restHr));
  return [
    { key: 'E', label: 'Easy', use: 'Most of your running', slow: paceAt(vdot, 0.62), fast: paceAt(vdot, 0.72), hr: `< ${hr(0.7)} bpm` },
    { key: 'T', label: 'Threshold', use: 'Comfortably hard, 20–30 min total', slow: paceAt(vdot, 0.86), fast: paceAt(vdot, 0.89), hr: `${hr(0.83)}–${hr(0.89)} bpm` },
    { key: 'I', label: 'Interval', use: '3–5 min reps', slow: paceAt(vdot, 0.96), fast: paceAt(vdot, 1.0), hr: `${hr(0.95)}+ bpm` },
    { key: 'R', label: 'Repetition', use: '200–400 m, full recovery', slow: paceAt(vdot, 1.05), fast: paceAt(vdot, 1.1), hr: 'by pace, not HR' },
  ].map((p) => ({ ...p, range: `${fmtPace(p.fast)}–${fmtPace(p.slow)}/km` }));
}

export function assessGoal(goal, vdotNow, today) {
  const need = vdotFromRace(goal.distance, goal.targetS);
  const weeks = Math.max(1, (new Date(`${goal.date}T12:00:00`) - new Date(`${today}T12:00:00`)) / (7 * 864e5));
  const gap = need - vdotNow;
  const perWeek = gap / weeks;
  const label = gap <= 0 ? 'Already in reach' : perWeek <= 0.2 ? 'Realistic' : perWeek <= 0.35 ? 'Ambitious' : 'Stretch';
  const predicted = predictSeconds(vdotNow, goal.distance);
  // What's achievable by the date at a sustainable ~0.25 VDOT/week.
  const reachable = predictSeconds(vdotNow + Math.min(Math.max(gap, 0), 0.25 * weeks), goal.distance);
  return { need: +need.toFixed(1), weeks: Math.round(weeks), gap: +gap.toFixed(1), perWeek, label, predicted, reachable };
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// This week's sessions, starting tomorrow.
export function weekPlan({ data, training, readiness, goal, vdot, symptoms, form }) {
  const weeksTotal = Math.max(2, Math.round((new Date(`${goal.date}T12:00:00`) - new Date(`${data.today}T12:00:00`)) / (7 * 864e5)));
  const phase = weeksTotal <= 1.5 ? 'Taper' : weeksTotal <= 3 ? 'Peak' : 'Base';
  const phaseOf = (wk) => {
    const left = weeksTotal - wk;
    if (left <= 1.5) return 'Taper';
    if (left <= Math.max(2, weeksTotal * 0.25)) return 'Peak';
    if (wk < weeksTotal * 0.35) return 'Base';
    return 'Build';
  };
  const recentKm = mean(training.weeks.slice(-4).map((w) => w.km));
  const startKm = Math.max(12, recentKm);
  const peakKm = Math.max(startKm, Math.min(PEAK_KM[goal.distance] ?? 40, startKm * 1.8));
  // Volume by week: +8% a week, every 4th week a 20% deload, taper to 60%.
  const volume = [];
  let km = startKm;
  for (let wk = 0; wk < weeksTotal; wk++) {
    const ph = phaseOf(wk);
    if (ph === 'Taper') volume.push(km * 0.6);
    else if ((wk + 1) % 4 === 0) volume.push(km * 0.8);
    else { km = Math.min(peakKm, wk === 0 ? km : km * 1.08); volume.push(km); }
  }
  const P = Object.fromEntries(paces(vdot, training.maxHeart, training.restHr).map((p) => [p.key, p]));
  const back = symptoms.some((s) => s.areas.includes('back'));
  const lowerLeg = symptoms.some((s) => s.areas.some((a) => ['calf', 'shin', 'foot', 'hamstring'].includes(a)));
  const knee = symptoms.some((s) => s.areas.includes('knee'));
  const ill = symptoms.some((s) => s.areas.includes('ill'));
  const tired = symptoms.some((s) => s.areas.includes('fatigue')) || readiness.score < 42;
  const severe = symptoms.some((s) => s.severity === 'severe');
  const noQuality = back || lowerLeg || knee || ill || tired;
  const thisPhase = phaseOf(0);
  const weekKm = volume[0] * (noQuality ? 0.8 : 1);
  const runsPerWeek = weekKm >= 22 ? 4 : 3;

  const easyMin = (k) => Math.max(25, Math.round((k * P.E.slow) / 60 / 5) * 5);
  const longKm = clamp(weekKm * 0.32, 6, goal.distance >= 21097 ? 30 : 16);
  const qualityKm = weekKm * 0.22;
  const easyKm = (weekKm - longKm - qualityKm) / (runsPerWeek - 2);
  const quality = {
    Base: { title: 'Easy + strides', detail: `${easyMin(qualityKm)} min at ${P.E.range}, then 6 × 20 s relaxed-fast with full walk-back` },
    Build: { title: 'Threshold 3 × 8 min', detail: `15 min easy, 3 × 8 min at ${P.T.range} (${P.T.hr}), 2 min jog between, 10 min easy` },
    Peak: { title: 'Intervals 5 × 3 min', detail: `15 min easy, 5 × 3 min at ${P.I.range}, 2 min jog between, 10 min easy` },
    Taper: { title: 'Sharpener 2 × 6 min', detail: `15 min easy, 2 × 6 min at ${P.T.range}, 10 min easy` },
  }[thisPhase];
  const formDrill = form ? ' Add 4 × 20 s at 170+ steps/min (metronome) to reset your stride.' : '';

  // Template: quality Tue, easy Thu, long Sun (+ easy Fri at 4 runs); strength Mon & Fri/Sat.
  const start = new Date(`${data.today}T12:00:00`);
  const days = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(start.getTime() + i * 864e5);
    const dow = d.getDay();
    let s = { kind: 'rest', title: 'Rest', detail: 'Walk, stretch, sleep well.' };
    if (dow === 2) s = { kind: 'run', title: quality.title, detail: quality.detail + formDrill, key: true };
    if (dow === 4) s = { kind: 'run', title: `Easy ${easyMin(easyKm)} min`, detail: `${P.E.range}, heart rate ${P.E.hr}.${formDrill}` };
    if (dow === 5 && runsPerWeek === 4) s = { kind: 'run', title: `Easy ${easyMin(easyKm)} min`, detail: `${P.E.range}, flat route.` };
    if (dow === 0) s = { kind: 'run', title: `Long run ${longKm.toFixed(0)} km`, detail: `${P.E.range}, heart rate ${P.E.hr}. Last 10 min can drift to steady if you feel good.` };
    if (dow === 1 || (dow === 6 && runsPerWeek === 3)) s = { kind: 'strength', title: 'Strength 30 min', detail: 'Single-leg RDLs, split squats, heel raises, side planks, 3 × 8–12.' };

    // Adaptations, most serious first.
    if (s.kind === 'run') {
      if (ill || severe) s = { kind: 'rest', title: 'Rest', detail: ill ? 'Follow the neck check. Restart with easy running 24 h after symptoms clear.' : 'Get your pain assessed before running again.', adjusted: ill ? 'Unwell' : 'Severe pain' };
      else if (s.key && noQuality) s = { kind: 'run', title: `Easy ${easyMin(qualityKm)} min, flat`, detail: `${P.E.range}. Replaces the hard session this week.`, adjusted: back ? 'Sore back' : knee ? 'Knee' : lowerLeg ? 'Lower leg' : 'Low readiness' };
      else if (s.title.startsWith('Long') && (back || knee || lowerLeg)) s = { ...s, title: `Long run ${Math.min(longKm, 7).toFixed(0)} km, flat`, detail: `${P.E.range}. Shortened and flat while it settles; stop if pain goes above 3/10.`, adjusted: back ? 'Sore back' : knee ? 'Knee' : 'Lower leg' };
      if (i === 1 && readiness.score < 42 && s.kind === 'run') s = { kind: 'rest', title: 'Rest', detail: 'Readiness is low today. Tomorrow’s plan still stands.', adjusted: 'Low readiness' };
    }
    if (s.kind === 'strength' && back) s = { ...s, title: 'Back care 20 min', detail: 'Curl-ups, side planks, bird-dogs (3 rounds), then glute bridges and single-leg RDLs.', adjusted: 'Sore back' };
    days.push({ date: d.toISOString().slice(0, 10), dow: DOW[dow], ...s });
  }

  return {
    phase: thisPhase, weekKm, runsPerWeek,
    phases: ['Base', 'Build', 'Peak', 'Taper'].map((p) => ({ p, weeks: volume.filter((_, wk) => phaseOf(wk) === p).length })).filter((x) => x.weeks),
    volume, days,
  };
}
