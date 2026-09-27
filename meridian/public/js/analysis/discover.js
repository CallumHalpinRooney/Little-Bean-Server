// Personal cause-and-effect: which of your own habits measurably change your sleep and
// recovery. Every finding is tested against your data (Welch t-test), must reach p < 0.05
// with enough nights on both sides, and a meaningful effect size, before it is shown.

import { mean, welch } from './stats.js';
import { night } from './sleep.js';

const hourOf = (iso) => new Date(iso).getHours() + new Date(iso).getMinutes() / 60;

function nightlyTable(data) {
  const rows = [];
  for (let i = 1; i < data.days.length; i++) {
    const day = data.days[i], prev = data.days[i - 1];
    if (!day.sleep) continue;
    const n = night(day);
    const ws = data.workouts.filter((w) => w.start.slice(0, 10) === prev.date);
    const hard = ws.filter((w) => !['walk', 'golf'].includes(w.type));
    const lastEnd = Math.max(0, ...hard.map((w) => hourOf(w.start) + w.durationS / 3600));
    rows.push({
      date: day.date,
      bedIdx: n.bedIdx,
      // Drivers (things you did the day before / at bedtime)
      lateWorkout: hard.length ? lastEnd >= 19 : null,
      trained: hard.length > 0,
      lateBed: n.bedIdx > 6 * 60, // after midnight
      activeDay: prev.steps >= 9000,
      stressedDay: prev.stress >= 40,
      // Outcomes (what your body did that night / next morning)
      deepMin: day.sleep.deepMin,
      remMin: day.sleep.remMin,
      asleepMin: n.asleepMin,
      efficiency: n.efficiency * 100,
      hrv: day.hrv,
      rhr: day.rhr,
    });
  }
  return rows;
}

const DRIVERS = [
  { key: 'lateWorkout', yes: 'After workouts that finish after 19:00', no: 'earlier workouts', action: 'Move hard sessions before 18:30' },
  { key: 'lateBed', yes: 'When you go to bed after midnight', no: 'earlier nights', action: 'Keep lights-out before 23:45' },
  { key: 'activeDay', yes: 'On days with 9,000+ steps', no: 'less active days', action: 'Aim for 9,000 steps' },
  { key: 'stressedDay', yes: 'After high-stress days (avg ≥ 40)', no: 'calmer days', action: 'Add a 10-minute wind-down on stressful days' },
];

const OUTCOMES = [
  { key: 'deepMin', label: 'deep sleep', unit: 'min', higherIsBetter: true, fmt: (v) => `${Math.round(Math.abs(v))} min` },
  { key: 'hrv', label: 'overnight HRV', unit: 'ms', higherIsBetter: true, fmt: (v) => `${Math.round(Math.abs(v))} ms` },
  { key: 'rhr', label: 'resting heart rate', unit: 'bpm', higherIsBetter: false, fmt: (v) => `${Math.abs(v).toFixed(1)} bpm` },
  { key: 'efficiency', label: 'sleep efficiency', unit: '%', higherIsBetter: true, fmt: (v) => `${Math.abs(v).toFixed(1)} pts` },
  { key: 'asleepMin', label: 'total sleep', unit: 'min', higherIsBetter: true, fmt: (v) => `${Math.round(Math.abs(v))} min` },
];

export function discoverPatterns(data) {
  const rows = nightlyTable(data);
  const found = [];
  for (const d of DRIVERS) {
    for (const o of OUTCOMES) {
      const yes = rows.filter((r) => r[d.key] === true).map((r) => r[o.key]);
      const no = rows.filter((r) => r[d.key] === false).map((r) => r[o.key]);
      const t = welch(yes, no);
      if (t.nA < 6 || t.nB < 6 || t.p >= 0.05 || Math.abs(t.d) < 0.35) continue;
      const base = mean(no);
      const rel = t.diff / base;
      const better = o.higherIsBetter ? t.diff > 0 : t.diff < 0;
      found.push({
        id: `${d.key}:${o.key}`,
        driver: d.key,
        outcome: o.key,
        better,
        headline: `${d.yes}, your ${o.label} is ${o.fmt(t.diff)} ${t.diff > 0 ? 'higher' : 'lower'}`,
        rel,
        relText: `${rel > 0 ? '+' : '−'}${Math.round(Math.abs(rel) * 100)}%`,
        action: better ? null : d.action,
        evidence: `${t.nA} vs ${t.nB} nights · ${t.p < 0.01 ? 'strong' : 'moderate'} evidence`,
        strength: Math.abs(t.d),
        p: t.p,
        yesMean: mean(yes),
        noMean: base,
        unit: o.unit,
      });
    }
  }
  // Keep the strongest finding per driver so the list stays short and non-repetitive.
  const byDriver = new Map();
  for (const f of found.sort((a, b) => b.strength - a.strength)) {
    if (!byDriver.has(f.driver)) byDriver.set(f.driver, f);
  }
  return { top: [...byDriver.values()], all: found, nights: rows.length };
}

// ——— Experiments ———
// Each template is judged automatically from watch data, so there is nothing to log.

export const EXPERIMENTS = [
  { id: 'bed2330', title: 'Lights out by 23:30', why: 'Earlier, consistent sleep timing usually lifts HRV within two weeks.',
    metric: 'hrv', metricLabel: 'HRV', unit: 'ms', higherIsBetter: true,
    complied: (row) => row.bedIdx <= 5 * 60 + 30 },
  { id: 'noLateTraining', title: 'No hard training after 19:00', why: 'Late intensity keeps core temperature and heart rate up into the night.',
    metric: 'deepMin', metricLabel: 'Deep sleep', unit: 'min', higherIsBetter: true,
    complied: (row) => row.lateWorkout !== true },
  { id: 'steps9k', title: '9,000 steps every day', why: 'Daytime movement builds sleep pressure and lowers resting heart rate.',
    metric: 'rhr', metricLabel: 'Resting HR', unit: 'bpm', higherIsBetter: false,
    complied: (row) => row.activeDay },
];

export function evaluateExperiment(data, exp) {
  const tpl = EXPERIMENTS.find((e) => e.id === exp.templateId);
  const rows = nightlyTable(data);
  const during = rows.filter((r) => r.date >= exp.startDate);
  const before = rows.filter((r) => r.date < exp.startDate).slice(-28);
  const compliant = during.filter(tpl.complied);
  const t = welch(compliant.map((r) => r[tpl.metric]), before.map((r) => r[tpl.metric]));
  const elapsed = during.length;
  const length = exp.lengthDays ?? 14;
  const better = tpl.higherIsBetter ? t.diff > 0 : t.diff < 0;
  let verdict = 'Collecting data';
  if (compliant.length >= 5 && Number.isFinite(t.diff)) {
    verdict = t.p < 0.1 ? (better ? 'Working' : 'Not helping') : 'No clear effect yet';
  }
  return {
    ...tpl, ...exp,
    elapsed: Math.min(elapsed, length), length,
    adherence: during.length ? compliant.length / during.length : 0,
    change: t.diff, better, p: t.p, verdict,
    before: mean(before.map((r) => r[tpl.metric])),
    after: mean(compliant.map((r) => r[tpl.metric])),
  };
}
