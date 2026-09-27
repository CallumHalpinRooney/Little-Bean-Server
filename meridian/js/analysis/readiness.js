import { mean, sd, clamp, last } from './stats.js';

// Personal baselines: the previous 60 days, excluding today, so today is judged against you.
export function baseline(days, key, { log = false, window = 60 } = {}) {
  const vals = last(days.slice(0, -1), window).map((d) => d[key]).filter(Number.isFinite);
  const t = log ? vals.map(Math.log) : vals;
  return { mean: mean(t), sd: sd(t) || 1, n: vals.length, log, typical: log ? Math.exp(mean(t)) : mean(t) };
}

const z = (v, b) => ((b.log ? Math.log(v) : v) - b.mean) / b.sd;

export function analyseReadiness(data, sleep, training) {
  const today = data.days.at(-1);
  const hrvB = baseline(data.days, 'hrv', { log: true });
  const rhrB = baseline(data.days, 'rhr');
  const zHrv = Number.isFinite(today.hrv) && hrvB.n >= 7 ? z(today.hrv, hrvB) : NaN;
  const zRhr = Number.isFinite(today.rhr) && rhrB.n >= 7 ? -z(today.rhr, rhrB) : NaN;
  const zSleep = sleep.lastDay?.date === today.date ? (sleep.score - 75) / 12 : NaN;
  const zDebt = -Math.min(3, sleep.debtMin / 60 / 1.5);
  const zLoad = training.acwr > 1.3 ? -(training.acwr - 1.3) * 5 : training.acwr < 0.8 ? 0.2 : 0.4;

  const parts = [
    { key: 'hrv', label: 'Heart rate variability', weight: 0.32, z: zHrv,
      detail: `${today.hrv} ms vs your usual ${Math.round(hrvB.typical)} ms` },
    { key: 'rhr', label: 'Resting heart rate', weight: 0.22, z: zRhr,
      detail: `${today.rhr} bpm vs your usual ${Math.round(rhrB.typical)} bpm` },
    { key: 'sleep', label: 'Last night’s sleep', weight: 0.24, z: zSleep, detail: `Sleep score ${sleep.score}` },
    { key: 'debt', label: 'Sleep debt', weight: 0.1, z: zDebt,
      detail: sleep.debtMin < 20 ? 'Fully repaid' : `${Math.floor(sleep.debtMin / 60)}h ${Math.round(sleep.debtMin % 60)}m owed over 14 nights` },
    { key: 'load', label: 'Training load', weight: 0.12, z: zLoad,
      detail: `Load ratio ${training.acwr.toFixed(2)} (0.8–1.3 is the sweet spot)` },
  ];
  const usable = parts.filter((p) => Number.isFinite(p.z));
  const wsum = usable.reduce((a, p) => a + p.weight, 0) || 1;
  const combined = usable.reduce((a, p) => a + (p.weight / wsum) * clamp(p.z, -3, 3), 0);
  const score = Math.round(clamp(62 + combined * 22, 1, 99));
  usable.forEach((p) => (p.impact = (p.weight / wsum) * clamp(p.z, -3, 3)));

  const state =
    score >= 78 ? { label: 'Primed', tone: 'good', line: 'Your body has absorbed recent training. A hard session will pay off today.' }
    : score >= 60 ? { label: 'Steady', tone: 'good', line: 'Normal capacity. Train as planned, keep the intensity honest.' }
    : score >= 42 ? { label: 'Hold back', tone: 'warn', line: 'Recovery is lagging. Choose volume over intensity today.' }
    : { label: 'Recover', tone: 'bad', line: 'Several signals are off baseline. Rest is the productive choice today.' };

  // Early-warning signal: HRV suppressed and RHR elevated together for 2+ mornings is a
  // classic precursor of illness or overreaching (Radin et al., Lancet Digit Health 2020).
  const strained = last(data.days, 3).filter((d) => z(d.hrv, hrvB) < -1.3 && (d.rhr - rhrB.mean) / rhrB.sd > 1.3).length;

  return {
    score, state, parts: usable.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    hrvBaseline: hrvB, rhrBaseline: rhrB,
    strainAlert: strained >= 2,
    history: data.days.map((d, i) => {
      if (i < 14) return null;
      const s = data.days.slice(0, i + 1);
      const hb = baseline(s, 'hrv', { log: true }), rb = baseline(s, 'rhr');
      const zh = Number.isFinite(d.hrv) ? clamp(z(d.hrv, hb), -3, 3) : 0, zr = Number.isFinite(d.rhr) ? clamp(-z(d.rhr, rb), -3, 3) : 0;
      return Math.round(clamp(62 + (0.45 * zh + 0.3 * zr + 0.25 * (((sleep.scoreByDate[d.date] ?? 75) - 75) / 12)) * 22, 1, 99));
    }),
  };
}
