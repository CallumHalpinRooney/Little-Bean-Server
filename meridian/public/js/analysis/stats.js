// Small, dependency-free statistics helpers shared by every analysis module.
// Everything here is pure so it runs identically in the browser and in Node tests.

export const mean = (xs) => {
  const v = xs.filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
};

export const sd = (xs) => {
  const v = xs.filter(Number.isFinite);
  if (v.length < 2) return NaN;
  const m = mean(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
};

export const median = (xs) => {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const last = (xs, n = 1) => xs.slice(Math.max(0, xs.length - n));

// Exponentially weighted moving average with a time constant in samples.
export function ewma(xs, days) {
  const k = 1 - Math.exp(-1 / days);
  const out = [];
  let acc = null;
  for (const x of xs) {
    const v = Number.isFinite(x) ? x : 0;
    acc = acc === null ? v : acc + k * (v - acc);
    out.push(acc);
  }
  return out;
}

// Standard normal CDF (Abramowitz–Stegun 7.1.26), accurate to ~1e-7.
export function normCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t *
    Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export function pearson(xs, ys) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) return { r: NaN, n: pairs.length };
  const mx = mean(pairs.map((p) => p[0]));
  const my = mean(pairs.map((p) => p[1]));
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return { r: sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN, n: pairs.length };
}

// Two-sided p-value for a Pearson r using the t distribution (normal approx for n > 30).
export function pearsonP(r, n) {
  if (!Number.isFinite(r) || n < 4) return 1;
  const t = r * Math.sqrt((n - 2) / Math.max(1e-9, 1 - r * r));
  return 2 * (1 - normCdf(Math.abs(t) * (n > 30 ? 1 : Math.sqrt((n - 2) / n))));
}

// Welch's t-test between two samples, returning the difference, Cohen's d and an approximate p.
export function welch(a, b) {
  const A = a.filter(Number.isFinite), B = b.filter(Number.isFinite);
  if (A.length < 3 || B.length < 3) return { diff: NaN, d: NaN, p: 1, nA: A.length, nB: B.length };
  const ma = mean(A), mb = mean(B), va = sd(A) ** 2, vb = sd(B) ** 2;
  const se = Math.sqrt(va / A.length + vb / B.length);
  const t = se ? (ma - mb) / se : 0;
  const pooled = Math.sqrt((va + vb) / 2);
  return { diff: ma - mb, d: pooled ? (ma - mb) / pooled : 0, p: 2 * (1 - normCdf(Math.abs(t))), nA: A.length, nB: B.length };
}

// Least-squares slope per sample; used for "trending up/down" statements.
export function slope(ys) {
  const pts = ys.map((y, x) => [x, y]).filter(([, y]) => Number.isFinite(y));
  if (pts.length < 3) return 0;
  const mx = mean(pts.map((p) => p[0])), my = mean(pts.map((p) => p[1]));
  let num = 0, den = 0;
  for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
  return den ? num / den : 0;
}

// Deterministic PRNG so demo data is identical on every load.
export function rng(seed = 1) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.normal = (m = 0, s2 = 1) => {
    const u = Math.max(1e-12, next()), v = next();
    return m + s2 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return next;
}
