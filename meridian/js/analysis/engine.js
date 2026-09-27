// The engine turns raw watch data into a small number of decisions. The UI never computes
// anything itself; it renders what analyse() returns.

import { mean, last, slope, clamp } from './stats.js';
import { analyseSleep, fromBedIndex } from './sleep.js';
import { analyseTraining, RUN_TYPES } from './training.js';
import { analyseReadiness } from './readiness.js';
import { discoverPatterns, evaluateExperiment } from './discover.js';
import * as norms from './norms.js';

export const hhmm = (mins) => {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
export const hm = (mins) => `${Math.floor(mins / 60)}h ${String(Math.round(mins % 60)).padStart(2, '0')}m`;

function weightTrend(days) {
  // Exponentially smoothed scale weight (the "trend weight" idea from The Hacker's Diet):
  // day-to-day water swings of ±1 kg disappear, the real direction remains.
  const pts = days.filter((d) => Number.isFinite(d.weight)).map((d) => ({ date: d.date, kg: d.weight }));
  if (pts.length < 4) return null;
  let t = pts[0].kg;
  const trend = pts.map((p) => (t = t + 0.25 * (p.kg - t)));
  const recent = pts.filter((p) => new Date(p.date) >= new Date(new Date(days.at(-1).date) - 28 * 864e5));
  const idx = pts.length - recent.length;
  const perWeek = recent.length > 2 ? ((trend.at(-1) - trend[idx]) / Math.max(1, (new Date(pts.at(-1).date) - new Date(recent[0].date)) / 864e5)) * 7 : 0;
  return { latest: pts.at(-1).kg, trend: trend.at(-1), perWeek, series: trend, points: pts };
}

function compare(data, sleep, training) {
  const p = data.profile;
  const vo2 = data.vo2max.at(-1)?.value;
  const rhr = mean(last(data.days, 7).map((d) => d.rhr));
  const hrv = Math.exp(mean(last(data.days, 7).map((d) => Math.log(d.hrv))));
  const steps = mean(last(data.days, 28).map((d) => d.steps));
  const med = norms.cohortMedians(p);
  const rows = [
    vo2 && { key: 'vo2', label: 'VO₂ max', value: vo2.toFixed(1), unit: 'ml/kg/min', median: med.vo2, pct: norms.vo2Percentile(vo2, p) },
    { key: 'rhr', label: 'Resting heart rate', value: Math.round(rhr), unit: 'bpm', median: med.rhr, pct: norms.rhrPercentile(rhr, p), lowerBetter: true },
    { key: 'hrv', label: 'Heart rate variability', value: Math.round(hrv), unit: 'ms', median: med.hrv, pct: norms.hrvPercentile(hrv, p) },
    { key: 'sleep', label: 'Sleep duration', value: (sleep.avg28 / 60).toFixed(1), unit: 'h', median: med.sleep, pct: norms.sleepPercentile(sleep.avg28 / 60, p) },
    { key: 'steps', label: 'Daily steps', value: Math.round(steps).toLocaleString('en-GB'), unit: '', median: med.steps.toLocaleString('en-GB'), pct: norms.stepsPercentile(steps, p) },
  ].filter(Boolean);
  return {
    cohort: norms.cohortLabel(p),
    rows,
    fitnessAge: vo2 ? norms.fitnessAge(vo2, p) : null,
    vo2Trend: slope(last(data.vo2max, 20).map((v) => v.value)) * 20,
    isDefaultProfile: !!p.isDefault,
  };
}

// One clear instruction for today, built from readiness and training state.
function todaysFocus(readiness, training, sleep) {
  const r = readiness.score;
  const z2 = training.z2Ceiling;
  if (readiness.strainAlert) {
    return { kind: 'rest', title: 'Take a rest day', body: 'HRV is down and resting heart rate is up for two mornings running. That often comes before a cold or overreaching. Skip training and get to bed early tonight.' };
  }
  if (r >= 78 && training.acwr < 1.3) {
    return { kind: 'quality', title: 'Quality session: 5 × 4 min hard', body: `You’re recovered and your load has room to grow. Warm up 15 min, then 5 × 4 min at ${training.maxHeart - 18}–${training.maxHeart - 8} bpm with 3 min easy between.` };
  }
  if (r >= 60) {
    return { kind: 'easy', title: `Easy 40 min run under ${z2} bpm`, body: `Most of your running is too hard to be easy (${Math.round(training.distribution.easy * 100)}% in zones 1–2). Today, keep heart rate under ${z2} bpm even if it means walking the hills.` };
  }
  if (r >= 42) {
    return { kind: 'move', title: '30–45 min walk or mobility', body: `Recovery is lagging, so skip intensity today. Aim for lights-out by ${hhmm(sleep.bedtimeTarget)}.` };
  }
  return { kind: 'rest', title: 'Recovery day', body: `Rest, eat well, hydrate. Lights-out by ${hhmm(sleep.bedtimeTarget - 20)} gives you room to repay ${Math.round(sleep.debtMin)} min of sleep debt.` };
}

// The critical weekly review: specific, honest, ranked by what would help most.
function weeklyReview(data, sleep, training, readiness, weight, cmp) {
  const deficit = data.reportedDeficitKcal;
  const out = [];
  const d = training.distribution;
  if (training.runCount28 >= 3 && d.easy < 0.6) {
    out.push({ tone: 'warn', area: 'Training', title: 'Your easy runs aren’t easy',
      body: `Only ${Math.round(d.easy * 100)}% of your running time over 4 weeks was in zones 1–2. ${Math.round(d.moderate * 100)}% was in zone 3, the “grey zone”: too hard to recover from quickly, too easy to drive big gains. Endurance athletes improve fastest on about 80% easy. Slow most runs to under ${training.z2Ceiling} bpm and keep one hard session a week.` });
  }
  const w = training.weeks;
  const km4 = mean(w.slice(-4).map((x) => x.km)), kmPrev = mean(w.slice(0, 4).map((x) => x.km));
  if (kmPrev > 3 && Math.abs(km4 - kmPrev) / kmPrev > 0.2) {
    out.push({ tone: km4 < kmPrev ? 'warn' : 'good', area: 'Training',
      title: km4 < kmPrev ? `Running volume is down ${Math.round((1 - km4 / kmPrev) * 100)}%` : `Running volume is up ${Math.round((km4 / kmPrev - 1) * 100)}%`,
      body: `${km4.toFixed(1)} km/week over the last 4 weeks vs ${kmPrev.toFixed(1)} km/week before. ${km4 < kmPrev ? 'Fitness fades after 2–3 weeks of reduced load. Add one easy 30-minute run a week to hold your VO₂ max.' : 'Keep weekly increases under about 10% to limit injury risk.'}` });
  }
  if (training.acwr > 1.4) {
    out.push({ tone: 'bad', area: 'Training', title: 'Load spike',
      body: `Your last 7 days are ${training.acwr.toFixed(1)}× your 4-week average. Injury risk rises sharply above 1.5. Keep the next 3 days easy.` });
  }
  if (Math.abs(sleep.regularity.socialJetLag) > 45) {
    out.push({ tone: 'warn', area: 'Sleep', title: `${Math.round(sleep.regularity.socialJetLag)} min of social jet lag`,
      body: `Your mid-sleep point shifts ${Math.round(sleep.regularity.socialJetLag)} min later at weekends, like flying a time zone every Friday. Monday HRV and mood usually pay for it. Keep weekend wake-up within 45 min of weekdays.` });
  }
  if (sleep.debtMin > 60) {
    out.push({ tone: 'warn', area: 'Sleep', title: `${hm(sleep.debtMin)} sleep debt`,
      body: `Across 14 nights you’ve slept ${hm(sleep.debtMin)} less than your ${hm(sleep.needMin)} need. Repay it gradually: lights-out at ${hhmm(sleep.bedtimeTarget)} for the next week.` });
  }
  if (weight) {
    const pct = (weight.perWeek / weight.trend) * 100;
    // 7,700 kcal ≈ 1 kg of body fat; compare the watch's claimed deficit with the scale.
    const implied = deficit ? (deficit * 7) / 7700 : null;
    const overstated = implied && implied > Math.abs(weight.perWeek) * 2;
    out.push({ tone: weight.perWeek < 0 ? 'good' : 'info', area: 'Body',
      title: `Trend weight ${weight.trend.toFixed(1)} kg, ${weight.perWeek <= 0 ? '−' : '+'}${Math.abs(weight.perWeek).toFixed(2)} kg/week`,
      body: `A sustainable rate is 0.5–1% of body weight per week; you’re at ${Math.abs(pct).toFixed(1)}%.${overstated ? ` Your watch reports a ${deficit.toLocaleString('en-GB')} kcal/day deficit, which would mean about ${implied.toFixed(1)} kg/week. Your scale shows much less, so the calorie estimate is overstated. Trust the trend line, not the deficit number.` : ''}` });
  }
  if (cmp.fitnessAge && cmp.fitnessAge < data.profile.age) {
    out.push({ tone: 'good', area: 'Fitness', title: `Fitness age ${cmp.fitnessAge}`,
      body: `Your VO₂ max matches the average ${cmp.fitnessAge}-year-old ${data.profile.sex === 'female' ? 'woman' : 'man'}${cmp.vo2Trend > 0.3 ? ` and has risen ${cmp.vo2Trend.toFixed(1)} points recently` : ''}. VO₂ max is one of the strongest single predictors of long-term health.` });
  }
  const stressSlope = slope(last(data.days, 90).map((x) => x.stress)) * 90;
  if (stressSlope > 4) {
    out.push({ tone: 'warn', area: 'Stress', title: 'Stress is creeping up',
      body: `Average daytime stress has risen by ${Math.round(stressSlope)} points over 3 months. Stress mostly shows in your data through lower HRV the following night.` });
  }
  const order = { bad: 0, warn: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

export function analyse(data, { experiments = [] } = {}) {
  const sleep = analyseSleep(data);
  const training = analyseTraining(data);
  const readiness = analyseReadiness(data, sleep, training);
  const weight = weightTrend(data.days);
  const cmp = compare(data, sleep, training);
  const patterns = discoverPatterns(data);
  const today = data.days.at(-1);
  return {
    data,
    today,
    sleep,
    training,
    readiness,
    weight,
    compare: cmp,
    patterns,
    focus: todaysFocus(readiness, training, sleep),
    review: weeklyReview(data, sleep, training, readiness, weight, cmp),
    experiments: experiments.map((e) => evaluateExperiment(data, e)),
    fmt: { hhmm, hm, fromBedIndex, clamp, RUN_TYPES },
  };
}
