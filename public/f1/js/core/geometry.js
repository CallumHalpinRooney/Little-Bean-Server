/** Small 2D maths helpers shared by the circuit builder, physics and renderer. */

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);

/** Wrap an angle into [-PI, PI]. */
export function wrapAngle(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Shortest signed difference from angle `a` to angle `b`. */
export const angleDelta = (a, b) => wrapAngle(b - a);

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}

/** Deterministic PRNG so a given seed always produces the same race. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller normal sample from a uniform generator. */
export function gaussian(rand, mean = 0, sd = 1) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

/**
 * Evaluate a closed centripetal-ish Catmull-Rom spline.
 * `pts` is an array of [x, y]; `i` is the segment index and `t` in [0,1).
 */
export function catmullRom(pts, i, t) {
  const n = pts.length;
  const p0 = pts[(i - 1 + n) % n];
  const p1 = pts[i % n];
  const p2 = pts[(i + 1) % n];
  const p3 = pts[(i + 2) % n];
  const t2 = t * t;
  const t3 = t2 * t;
  const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
    (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
    (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
  const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
    (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
    (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  return [x, y];
}

/** Densely sample a closed Catmull-Rom spline through `pts`. */
export function sampleSpline(pts, samplesPerSegment = 24) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    for (let s = 0; s < samplesPerSegment; s++) {
      out.push(catmullRom(pts, i, s / samplesPerSegment));
    }
  }
  return out;
}

/** Total length of a closed polyline. */
export function polylineLength(pts) {
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
}

/** Resample a closed polyline into points spaced approximately `spacing` apart. */
export function resampleClosed(pts, spacing) {
  const n = pts.length;
  const total = polylineLength(pts);
  const count = Math.max(16, Math.round(total / spacing));
  const step = total / count;
  const out = [];
  let seg = 0;
  let acc = 0;
  let a = pts[0];
  let b = pts[1 % n];
  let segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let k = 0; k < count; k++) {
    const target = k * step;
    while (acc + segLen < target && seg < n * 2) {
      acc += segLen;
      seg++;
      a = pts[seg % n];
      b = pts[(seg + 1) % n];
      segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    const t = segLen > 1e-9 ? (target - acc) / segLen : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/**
 * Curvature of a closed polyline at each index, using the circumscribed-circle
 * radius through the neighbouring points. Positive = turning left in screen
 * space, negative = right. `stride` widens the stencil to reject noise.
 */
export function curvatureProfile(pts, stride = 1) {
  const n = pts.length;
  const k = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = pts[(i - stride + n * 2) % n];
    const b = pts[i];
    const c = pts[(i + stride) % n];
    const ax = a[0] - b[0];
    const ay = a[1] - b[1];
    const cx = c[0] - b[0];
    const cy = c[1] - b[1];
    const la = Math.hypot(ax, ay);
    const lc = Math.hypot(cx, cy);
    const cross = ax * cy - ay * cx;
    const lb = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const denom = la * lc * lb;
    k[i] = denom < 1e-9 ? 0 : (2 * cross) / denom;
  }
  return k;
}

/** Cheap 1D circular blur, used to smooth curvature and speed profiles. */
export function smoothCircular(arr, radius, passes = 1) {
  let src = Float64Array.from(arr);
  const n = src.length;
  for (let p = 0; p < passes; p++) {
    const dst = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let count = 0;
      for (let d = -radius; d <= radius; d++) {
        sum += src[(i + d + n * 4) % n];
        count++;
      }
      dst[i] = sum / count;
    }
    src = dst;
  }
  return src;
}
