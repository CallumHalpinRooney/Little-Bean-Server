// Age- and sex-matched reference data, used to place a person inside their cohort.
//
// Sources (values are rounded; treat percentiles as estimates, not diagnoses):
//  - VO2max: FRIEND registry, Kaminsky et al., Mayo Clin Proc 2015 (treadmill CPET, ml/kg/min).
//  - Resting heart rate: large wearable cohort, Quer et al., PLoS ONE 2020 (daily wearable RHR).
//  - Nightly HRV (RMSSD): published wearable population summaries; strongly age-dependent and
//    log-normally distributed, so the spread is modelled on the log scale.
//  - Sleep duration and steps: wearable population studies (Althoff 2017; Jonasdottir 2021).
// Wrist-derived VO2max and HRV differ from lab measurements, so the app always labels
// percentiles as approximate.

import { normCdf, clamp } from './stats.js';

const AGE_BANDS = [20, 30, 40, 50, 60, 70]; // lower bounds, last band is 70–79

// Percentile points [p10, p25, p50, p75, p90] per age band.
const VO2 = {
  male: [
    [29.0, 40.1, 48.0, 55.2, 66.3],
    [27.2, 35.9, 42.4, 49.2, 59.8],
    [24.2, 31.9, 37.8, 45.0, 55.6],
    [20.9, 27.1, 32.6, 39.7, 50.7],
    [17.4, 23.7, 28.2, 34.5, 43.0],
    [16.3, 20.4, 24.4, 30.4, 39.7],
  ],
  female: [
    [21.7, 30.5, 37.6, 44.7, 56.0],
    [19.0, 25.3, 30.2, 36.9, 45.8],
    [17.0, 22.1, 26.7, 32.9, 41.7],
    [16.0, 19.9, 23.4, 28.9, 35.9],
    [13.4, 17.2, 20.0, 24.2, 29.4],
    [13.1, 15.6, 18.3, 20.9, 24.1],
  ],
};

// Normal approximations: [mean, sd] per age band.
const RHR = {
  male: [[62, 8], [62, 8], [62, 7.5], [62, 7.5], [61, 7.5], [61, 8]],
  female: [[66, 8], [65, 8], [64, 7.5], [63, 7.5], [63, 7.5], [63, 8]],
};
// Log-normal: median RMSSD (ms) per band, sd on the natural-log scale.
const HRV = {
  male: [[62, 0.45], [48, 0.45], [38, 0.45], [31, 0.45], [27, 0.45], [24, 0.45]],
  female: [[60, 0.45], [46, 0.45], [36, 0.45], [30, 0.45], [26, 0.45], [23, 0.45]],
};
const SLEEP_H = { male: [6.8, 0.9], female: [7.0, 0.9] };
const STEPS = [[7900, 3300], [7700, 3200], [7500, 3200], [7200, 3100], [6600, 3000], [5600, 2800]];

const band = (age) => {
  let i = 0;
  for (let k = 0; k < AGE_BANDS.length; k++) if (age >= AGE_BANDS[k]) i = k;
  return i;
};
const sexKey = (sex) => (sex === 'female' ? 'female' : 'male');
const P = [10, 25, 50, 75, 90];

// Piecewise-linear interpolation across the tabulated percentile points, with the tails
// extrapolated from the 10–25 and 75–90 segments and clamped to 1–99.
function pctFromTable(value, pts) {
  if (value <= pts[0]) return clamp(10 - ((pts[0] - value) / (pts[1] - pts[0])) * 15, 1, 10);
  if (value >= pts[4]) return clamp(90 + ((value - pts[4]) / (pts[4] - pts[3])) * 15, 90, 99);
  for (let i = 0; i < 4; i++) {
    if (value <= pts[i + 1]) return P[i] + ((value - pts[i]) / (pts[i + 1] - pts[i])) * (P[i + 1] - P[i]);
  }
  return 50;
}

const pctNormal = (value, m, s, higherIsBetter = true) => {
  const p = normCdf((value - m) / s) * 100;
  return clamp(Math.round(higherIsBetter ? p : 100 - p), 1, 99);
};

export function vo2Percentile(vo2, { age, sex }) {
  return Math.round(pctFromTable(vo2, VO2[sexKey(sex)][band(age)]));
}

// "Fitness age": the age at which this VO2max would be the cohort median. Uses the
// band midpoints and interpolates, which follows the approach of Nes et al. (HUNT, 2013).
export function fitnessAge(vo2, { sex }) {
  const medians = VO2[sexKey(sex)].map((row) => row[2]);
  const ages = AGE_BANDS.map((a) => a + 5);
  if (vo2 >= medians[0]) return Math.max(18, Math.round(ages[0] - ((vo2 - medians[0]) / (medians[0] - medians[1])) * 10));
  for (let i = 0; i < medians.length - 1; i++) {
    if (vo2 <= medians[i] && vo2 >= medians[i + 1]) {
      return Math.round(ages[i] + ((medians[i] - vo2) / (medians[i] - medians[i + 1])) * 10);
    }
  }
  return Math.min(90, Math.round(ages.at(-1) + ((medians.at(-1) - vo2) / (medians.at(-2) - medians.at(-1))) * 10));
}

export function rhrPercentile(rhr, { age, sex }) {
  const [m, s] = RHR[sexKey(sex)][band(age)];
  return pctNormal(rhr, m, s, false); // lower is better → percentile of people you beat
}

export function hrvPercentile(rmssd, { age, sex }) {
  const [med, s] = HRV[sexKey(sex)][band(age)];
  return pctNormal(Math.log(rmssd), Math.log(med), s, true);
}

export function sleepPercentile(hours, { sex }) {
  const [m, s] = SLEEP_H[sexKey(sex)];
  // Beyond 9h more sleep is not "better", so cap the comparison at the healthy upper bound.
  return pctNormal(Math.min(hours, 9), m, s, true);
}

export function stepsPercentile(steps, { age }) {
  const [m, s] = STEPS[band(age)];
  return pctNormal(steps, m, s, true);
}

export function cohortMedians({ age, sex }) {
  const k = sexKey(sex), b = band(age);
  return {
    vo2: VO2[k][b][2],
    rhr: RHR[k][b][0],
    hrv: HRV[k][b][0],
    sleep: SLEEP_H[k][0],
    steps: STEPS[b][0],
  };
}

export const cohortLabel = ({ age, sex }) => {
  const lo = AGE_BANDS[band(age)];
  return `${sex === 'female' ? 'Women' : 'Men'} ${lo}–${lo + 9}`;
};

// Tanaka et al. 2001: HRmax = 208 − 0.7 × age. Better than 220 − age across adult ages.
export const maxHr = (age) => Math.round(208 - 0.7 * age);
