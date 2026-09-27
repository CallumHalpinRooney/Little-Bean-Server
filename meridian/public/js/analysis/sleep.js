import { mean, sd, median, clamp, last } from './stats.js';

const minsOfDay = (iso) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
// Bedtimes straddle midnight, so express them as minutes after 18:00 to keep them linear.
const bedIndex = (iso) => (minsOfDay(iso) + 24 * 60 - 18 * 60) % (24 * 60);
export const fromBedIndex = (i) => (i + 18 * 60) % (24 * 60);

export function night(day) {
  const s = day.sleep;
  const inBedMin = (new Date(s.wake) - new Date(s.bed)) / 60000;
  const asleepMin = s.deepMin + s.lightMin + s.remMin;
  return {
    date: day.date,
    inBedMin,
    asleepMin,
    efficiency: asleepMin / inBedMin,
    deepPct: s.deepMin / asleepMin,
    remPct: s.remMin / asleepMin,
    bedIdx: bedIndex(s.bed),
    wakeMin: minsOfDay(s.wake),
    midSleep: (bedIndex(s.bed) + (bedIndex(s.bed) + inBedMin)) / 2,
    weekendNight: [5, 6].includes(new Date(s.bed).getDay()),
  };
}

// 14-night sleep debt, weighting recent nights more, never negative. Oversleeping repays
// debt at half rate: you cannot bank sleep in advance.
export function sleepDebt(nights, needMin) {
  let debt = 0;
  last(nights, 14).forEach((n, i, arr) => {
    const w = 0.6 + 0.4 * (i / (arr.length - 1 || 1));
    const gap = needMin - n.asleepMin;
    debt = Math.max(0, debt + (gap > 0 ? gap : gap * 0.5) * w);
  });
  return debt;
}

// Regularity: how consistent bed and wake times are over two weeks, plus "social jet lag"
// (the shift in mid-sleep between weekends and weekdays, Wittmann et al. 2006).
export function regularity(nights) {
  const recent = last(nights, 14);
  const sdBed = sd(recent.map((n) => n.bedIdx));
  const sdWake = sd(recent.map((n) => n.wakeMin));
  const wk = recent.filter((n) => !n.weekendNight).map((n) => n.midSleep);
  const we = recent.filter((n) => n.weekendNight).map((n) => n.midSleep);
  const socialJetLag = wk.length && we.length ? mean(we) - mean(wk) : 0;
  const score = Math.round(clamp(100 - ((sdBed + sdWake) / 2 - 15) * 1.2, 0, 100));
  return { sdBed, sdWake, socialJetLag, score };
}

// A transparent sleep score: duration 40, efficiency 20, restorative stages 20, timing 20.
export function sleepScore(n, needMin, reg) {
  const dur = Math.min(1, n.asleepMin / needMin) * 40;
  const eff = clamp((n.efficiency - 0.75) / 0.2, 0, 1) * 20;
  const restorative = clamp((n.deepPct + n.remPct - 0.25) / 0.2, 0, 1) * 20;
  const timing = (reg?.score ?? 70) / 100 * 20;
  return Math.round(dur + eff + restorative + timing);
}

export function analyseSleep(data) {
  const needMin = (data.profile.sleepNeedH ?? 7.75) * 60;
  const nights = data.days.filter((d) => d.sleep).map(night);
  const tonight = nights.at(-1);
  const reg = regularity(nights);
  const debt = sleepDebt(nights, needMin);
  const weekdayWake = median(last(nights, 21).filter((n) => !n.weekendNight).map((n) => n.wakeMin));
  // Suggested lights-out: target wake − need − 15 min to fall asleep − up to 20 min of debt repayment.
  const bedTarget = weekdayWake - needMin - 15 - Math.min(20, debt / 4);
  const scores = nights.map((n) => sleepScore(n, needMin, reg));
  return {
    nights,
    last: tonight,
    lastDay: data.days.filter((d) => d.sleep).at(-1),
    score: scores.at(-1),
    scores,
    scoreByDate: Object.fromEntries(nights.map((n, i) => [n.date, scores[i]])),
    needMin,
    debtMin: Math.round(debt),
    regularity: reg,
    avg7: mean(last(nights, 7).map((n) => n.asleepMin)),
    avg28: mean(last(nights, 28).map((n) => n.asleepMin)),
    bedtimeTarget: ((Math.round(bedTarget / 5) * 5) + 24 * 60) % (24 * 60),
    wakeTarget: weekdayWake,
  };
}
