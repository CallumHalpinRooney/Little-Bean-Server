// Second-by-second detail for demo runs: heart rate, pace, elevation and running form
// (cadence, stride, ground contact time, vertical oscillation, left/right balance) every
// 30 s, plus heart rate for two minutes after stopping.
//
// Uses its own random stream so adding detail never changes the daily demo data.
// Built-in story the analysis should find: from 11 Sept the runner starts guarding one
// side (balance drifts left, oscillation up, cadence down, more late-run form fade), and
// the 22 Sept trail run finishes on a 40 m climb, which slows heart-rate recovery.

import { rng, clamp } from '../analysis/stats.js';

const ONSET = '2026-09-11';
const HILL_FINISH = new Set(['2026-09-22']);

export function addRunDetail(workouts, restHr = 58) {
  const r = rng(70411);
  for (const w of workouts) {
    if (!['run', 'trail_run'].includes(w.type) || !w.distanceM) continue;
    const date = w.start.slice(0, 10);
    const guarded = date >= ONSET;
    const trail = w.type === 'trail_run';
    const hillFinish = HILL_FINISH.has(date) || (trail && !guarded && r() < 0.12);
    const n = Math.max(8, Math.round(w.durationS / 30));

    // Elevation: rolling hills sized to the recorded gain, optional climb at the end.
    const gain = w.elevationM ?? 0;
    const ph = r() * 6;
    const elev = [];
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      let e = (gain / 3.2) * (Math.sin(x * 9 + ph) + 0.5 * Math.sin(x * 23 + ph * 2)) + 40;
      if (hillFinish && x > 0.86) e += ((x - 0.86) / 0.14) * 40;
      elev.push(e);
    }
    // Rescale the rolling part so total ascent matches the watch's recorded gain.
    const climbEnd = hillFinish ? 40 : 0;
    const ascent = elev.reduce((a, e, i) => a + (i ? Math.max(0, e - elev[i - 1]) : 0), 0) - climbEnd;
    const scale = ascent > 0 ? Math.max(0, gain - climbEnd) / ascent : 1;
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      const end = hillFinish && x > 0.86 ? ((x - 0.86) / 0.14) * 40 : 0;
      elev[i] = 40 + (elev[i] - 40 - end) * scale + end;
    }

    // Speed follows the terrain; then scale so the distance matches the recorded total.
    const grade = elev.map((e, i) => (i ? (e - elev[i - 1]) / Math.max(1, (w.distanceM / n)) : 0));
    const rawSpeed = grade.map((g) => 1 / (1 + (g > 0 ? 3.3 * g : 1.6 * g)) * (1 + (r() - 0.5) * 0.05));
    const k = w.distanceM / rawSpeed.reduce((a, b) => a + b * 30, 0);
    const speed = rawSpeed.map((s) => s * k); // m/s

    // Heart rate: warm-up, cardiac drift, lagged response to hills, noise.
    let lag = 0;
    const hrRaw = speed.map((s, i) => {
      lag += (grade[i] * 320 - lag) * 0.35;
      return w.avgHr - 16 * Math.exp(-(i * 30) / 200) + (i / n) * 7 + lag + r.normal(0, 1.8);
    });
    const shift = w.avgHr - hrRaw.reduce((a, b) => a + b, 0) / n;
    const hr = hrRaw.map((h) => Math.round(clamp(h + shift, 90, 188)));

    // Form: per-run baselines, which change once guarding starts.
    const base = {
      cad: (guarded ? 164.5 : 169.5) - (trail ? 2 : 0) + r.normal(0, 1.2),
      vo: (guarded ? 9.5 : 8.6) + r.normal(0, 0.15),
      gct: (guarded ? 266 : 251) + (trail ? 8 : 0) + r.normal(0, 4),
      bal: (guarded ? 51.9 : 50.2) + r.normal(0, 0.25),
      fadeVo: guarded ? 1.1 : 0.4,
      fadeCad: guarded ? 4.5 : 2,
    };
    const series = speed.map((s, i) => {
      const f = i / (n - 1);
      const cadence = Math.round(base.cad - base.fadeCad * f * f + (grade[i] > 0.03 ? 3 : 0) + r.normal(0, 1.2));
      return {
        t: i * 30,
        hr: hr[i],
        pace: Math.round(1000 / s),
        elev: Math.round(elev[i] * 10) / 10,
        cadence,
        vo: +(base.vo + base.fadeVo * f * f + r.normal(0, 0.12)).toFixed(1),
        gct: Math.round(base.gct + 12 * f * f + r.normal(0, 4)),
        bal: +(base.bal + (guarded ? 0.5 * f : 0) + r.normal(0, 0.25)).toFixed(1),
      };
    });

    // Recovery: fraction of (finishing HR − resting HR) shed in the first minute.
    const hrEnd = Math.min(186, hr.at(-1) + (hillFinish ? 8 : 0));
    series.at(-1).hr = hrEnd;
    const frac = 0.31 - (hillFinish ? 0.07 : 0) - (guarded ? 0.015 : 0) + r.normal(0, 0.015);
    const hr60 = Math.round(hrEnd - (hrEnd - restHr) * frac);
    const hr120 = Math.round(hr60 - (hr60 - restHr) * 0.22);

    const avg = (key) => series.reduce((a, p) => a + p[key], 0) / series.length;
    const cadence = avg('cadence');
    const strideM = w.distanceM / (w.durationS / 60) / cadence;
    w.series = series;
    w.dynamics = {
      cadence: Math.round(cadence),
      strideM: +strideM.toFixed(2),
      gctMs: Math.round(avg('gct')),
      voCm: +avg('vo').toFixed(1),
      vertRatio: +((avg('vo') / (strideM * 100)) * 100).toFixed(1),
      balanceL: +avg('bal').toFixed(1),
    };
    w.recovery = { hrEnd, hr60, hr120 };
  }
  return workouts;
}
