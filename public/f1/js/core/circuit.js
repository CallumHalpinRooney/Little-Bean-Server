import {
  sampleSpline, resampleClosed, polylineLength, curvatureProfile,
  smoothCircular, clamp, wrapAngle,
} from './geometry.js';

const NODE_SPACING = 4.0;      // metres between centreline nodes
const PIT_SPEED_LIMIT = 80 / 3.6;

/**
 * A driveable circuit built from a hand-authored control polygon.
 *
 * Everything downstream (physics, AI, rendering, timing) addresses the track
 * through this object: nodes are evenly spaced along the centreline, so a node
 * index doubles as a lap-distance coordinate.
 */
export class Circuit {
  constructor(data) {
    this.data = data;
    this.name = data.name;
    this.width = data.width;
    this.half = data.width / 2;

    // --- Centreline -------------------------------------------------------
    // A Catmull-Rom spline straight through the authored outline rounds every
    // corner over the whole gap between control points, which turns a circuit
    // into one continuous curve taken flat out. Real circuits are straights
    // joined by corners of a definite radius, so each vertex is first split
    // into a turn-in and a track-out point a fixed distance either side of it.
    // The corner radius then falls out of how sharp the drawn angle is: a
    // hairpin ends up tight, a kink stays fast.
    const cornerMetres = data.cornerScale || 88;
    const probe = polylineLength(sampleSpline(data.pts, 20));
    const provisionalScale = data.length / probe;
    const shaped = Circuit.sharpenPolygon(data.pts, cornerMetres / provisionalScale);

    const dense = sampleSpline(shaped, 16);
    const rawLen = polylineLength(dense);
    const scale = data.length / rawLen;
    const scaled = dense.map((p) => [p[0] * scale, p[1] * scale]);

    // The hand-authored control polygons do not know where the pit straight is,
    // so the start/finish line is placed on the longest genuine straight. Every
    // node index downstream is relative to that, which keeps the grid, the pit
    // lane and the DRS zones sensible on all 24 layouts.
    // Very sharp authored angles can still produce corners no car could take;
    // open anything tighter than a real hairpin back out. Hand-drawn outlines
    // also tend to cross or graze themselves, which makes it impossible to say
    // which part of the circuit a car is on, so distant parts of the lap are
    // pushed apart until there is real estate between them.
    let shapedNodes = resampleClosed(scaled, NODE_SPACING);
    shapedNodes = Circuit.relaxCurvature(shapedNodes, data.minRadius || 26);
    // A mild push is enough to stop two stretches of asphalt overlapping;
    // anything stronger starts to distort the shape of the circuit, and
    // localisation handles genuine crossovers on its own.
    const relaxed = Circuit.separate(
      shapedNodes, data.width + 5, Math.round(140 / NODE_SPACING),
      data.minRadius || 26,
    );
    const relaxedLen = polylineLength(relaxed);
    const fix = data.length / relaxedLen;
    let cx = 0;
    let cy = 0;
    for (const p of relaxed) { cx += p[0]; cy += p[1]; }
    cx /= relaxed.length; cy /= relaxed.length;
    const corrected = relaxed.map((p) => [cx + (p[0] - cx) * fix, cy + (p[1] - cy) * fix]);

    const rawNodes = resampleClosed(corrected, NODE_SPACING);
    const rawCurv = smoothCircular(curvatureProfile(rawNodes, 3), 2, 2);
    const startIdx = Circuit.findStartLine(rawCurv, NODE_SPACING);
    const nodes = rawNodes.slice(startIdx).concat(rawNodes.slice(0, startIdx));
    const n = nodes.length;
    this.n = n;
    this.length = polylineLength(nodes);
    this.ds = this.length / n;

    this.x = new Float64Array(n);
    this.y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      this.x[i] = nodes[i][0];
      this.y[i] = nodes[i][1];
    }

    // Tangents / normals. Normal points to the driver's left in screen space.
    this.tx = new Float64Array(n);
    this.ty = new Float64Array(n);
    this.nx = new Float64Array(n);
    this.ny = new Float64Array(n);
    this.heading = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = (i - 1 + n) % n;
      const b = (i + 1) % n;
      let dx = this.x[b] - this.x[a];
      let dy = this.y[b] - this.y[a];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      this.tx[i] = dx; this.ty[i] = dy;
      this.nx[i] = dy; this.ny[i] = -dx;
      this.heading[i] = Math.atan2(dy, dx);
    }

    this.curv = smoothCircular(curvatureProfile(nodes, 3), 2, 2);

    // --- Racing line ------------------------------------------------------
    this.line = this.buildRacingLine();

    // --- Spatial index for fast localisation ------------------------------
    this.buildGrid();

    // --- Sectors, DRS, pit lane ------------------------------------------
    this.sectorIdx = [Math.floor(n / 3), Math.floor((n * 2) / 3)];
    this.straights = this.findStraights(220);
    this.drsZones = this.buildDrsZones();

    this.buildPitLane();
    this.buildBounds();
    this.kerbs = this.buildKerbs();
  }

  // ---------------------------------------------------------------------
  // Racing line
  // ---------------------------------------------------------------------

  /**
   * Iteratively relaxes a lateral offset per node towards the local
   * minimum-curvature path, clamped inside the track edges. Running the
   * relaxation at several strides (coarse to fine) lets the line find the
   * geometric apex of long corners as well as tidy up short chicanes.
   */
  buildRacingLine() {
    const n = this.n;
    const margin = Math.min(2.2, this.half * 0.22);
    const limit = this.half - margin;
    let off = new Float64Array(n);

    const px = (i, o) => this.x[i] + this.nx[i] * o;
    const py = (i, o) => this.y[i] + this.ny[i] * o;

    // How much this part of the circuit behaves like a corner. Smoothing it
    // over a wide window lets the influence reach back up the straight, which
    // is what keeps the turn-in and exit points hard against the edge.
    const cornerRaw = new Float64Array(n);
    for (let i = 0; i < n; i++) cornerRaw[i] = Math.min(1, Math.abs(this.curv[i]) / 0.0025);
    const corner = smoothCircular(cornerRaw, Math.max(6, Math.round(70 / this.ds)), 2);

    const strides = [24, 16, 12, 8, 5, 3, 2, 1];
    for (const stride of strides) {
      const iterations = stride > 8 ? 120 : 90;
      for (let it = 0; it < iterations; it++) {
        const next = new Float64Array(n);
        for (let i = 0; i < n; i++) {
          const a = (i - stride + n * 2) % n;
          const b = (i + stride) % n;
          const ax = px(a, off[a]);
          const ay = py(a, off[a]);
          const bx = px(b, off[b]);
          const by = py(b, off[b]);
          const mx = (ax + bx) * 0.5;
          const my = (ay + by) * 0.5;
          // Project the chord midpoint onto this node's normal.
          const d = (mx - this.x[i]) * this.nx[i] + (my - this.y[i]) * this.ny[i];
          let v = off[i] + (d - off[i]) * 0.35;
          // A straight held at the edge has zero curvature, so pure curvature
          // minimisation leaves the line glued to the wall. Gently recentre
          // wherever the circuit is not doing anything interesting.
          v -= v * 0.030 * (1 - Math.min(1, corner[i]));
          next[i] = clamp(v, -limit, limit);
        }
        off = next;
      }
    }

    off = smoothCircular(off, 2, 2);
    for (let i = 0; i < n; i++) off[i] = clamp(off[i], -limit, limit);

    const pts = [];
    for (let i = 0; i < n; i++) pts.push([px(i, off[i]), py(i, off[i])]);

    const curv = smoothCircular(curvatureProfile(pts, 4), 3, 2);
    return { offset: off, pts, curv };
  }

  /**
   * Forward/backward pass over the racing line producing the maximum speed a
   * reference car can carry through every node. `grip` is the surface grip
   * multiplier — it scales everything that is friction-limited, but not the
   * straight-line top speed, which is set by power against drag.
   */
  speedProfile(grip = 1) {
    const n = this.n;
    const ds = this.ds;
    const v = new Float64Array(n);

    // These constants are measured from the vehicle model itself (a steering
    // sweep at a range of speeds, then peak braking and traction), scaled by a
    // margin so a car tracking the profile is never asking for everything it
    // has. Lateral grip saturates at high speed because holding a big corner
    // also means fighting a lot of drag.
    const MARGIN = 0.88;
    const latLimit = (speed) => grip * MARGIN
      * Math.min(11.4 + 0.0042 * speed * speed, 29.5);
    const brakeLimit = (speed) => grip * MARGIN * (18.4 + 0.0075 * speed * speed);
    const tractionLimit = (speed) => grip * MARGIN * (13.0 + 0.0036 * speed * speed);
    const vTop = 95;

    // Corner speed: solve k * v^2 = latLimit(v) by bisection, since the limit
    // is no longer a simple quadratic.
    for (let i = 0; i < n; i++) {
      const k = Math.abs(this.line.curv[i]);
      if (k < 1e-5) { v[i] = vTop; continue; }
      let lo = 5;
      let hi = vTop;
      for (let it = 0; it < 24; it++) {
        const mid = (lo + hi) * 0.5;
        if (k * mid * mid > latLimit(mid)) hi = mid; else lo = mid;
      }
      v[i] = Math.min(vTop, (lo + hi) * 0.5);
    }

    const power = 700000;
    const mass = 860;
    for (let pass = 0; pass < 3; pass++) {
      // Backward: what can we be doing here and still stop for what is next.
      for (let i = n - 1; i >= 0; i--) {
        const j = (i + 1) % n;
        const vj = v[j];
        const vi = Math.sqrt(vj * vj + 2 * brakeLimit(vj) * ds);
        if (vi < v[i]) v[i] = vi;
      }
      // Forward: what can we actually accelerate to from here.
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const vi = v[i];
        const aPower = power / (mass * Math.max(10, vi));
        const drag = (0.855 * vi * vi) / mass;
        const aNet = Math.max(0.4, Math.min(aPower, tractionLimit(vi)) - drag);
        const vj = Math.sqrt(vi * vi + 2 * aNet * ds);
        if (vj < v[j]) v[j] = vj;
      }
    }
    return v;
  }

  // ---------------------------------------------------------------------
  // Localisation
  // ---------------------------------------------------------------------

  buildGrid() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < this.n; i++) {
      if (this.x[i] < minX) minX = this.x[i];
      if (this.y[i] < minY) minY = this.y[i];
      if (this.x[i] > maxX) maxX = this.x[i];
      if (this.y[i] > maxY) maxY = this.y[i];
    }
    const pad = 120;
    this.bbox = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    this.cell = 40;
    this.gw = Math.ceil((this.bbox.maxX - this.bbox.minX) / this.cell) + 1;
    this.gh = Math.ceil((this.bbox.maxY - this.bbox.minY) / this.cell) + 1;
    this.grid = new Array(this.gw * this.gh);
    for (let i = 0; i < this.n; i++) {
      const gx = Math.floor((this.x[i] - this.bbox.minX) / this.cell);
      const gy = Math.floor((this.y[i] - this.bbox.minY) / this.cell);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cx = gx + dx;
          const cy = gy + dy;
          if (cx < 0 || cy < 0 || cx >= this.gw || cy >= this.gh) continue;
          const key = cy * this.gw + cx;
          (this.grid[key] || (this.grid[key] = [])).push(i);
        }
      }
    }
  }

  /**
   * Nearest centreline node to a world point, searching the spatial grid.
   * Where a circuit doubles back on itself two nodes can be equally close, so
   * an optional heading is used to pick the branch the car is actually on.
   */
  nearestIndex(x, y, heading = null) {
    const gx = clamp(Math.floor((x - this.bbox.minX) / this.cell), 0, this.gw - 1);
    const gy = clamp(Math.floor((y - this.bbox.minY) / this.cell), 0, this.gh - 1);
    let best = -1;
    let bestD = Infinity;
    for (let r = 0; r < 6 && best < 0; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (r > 0 && Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const cx = gx + dx;
          const cy = gy + dy;
          if (cx < 0 || cy < 0 || cx >= this.gw || cy >= this.gh) continue;
          const bucket = this.grid[cy * this.gw + cx];
          if (!bucket) continue;
          for (const i of bucket) {
            let d = (this.x[i] - x) ** 2 + (this.y[i] - y) ** 2;
            if (heading !== null) {
              // Penalise nodes pointing the wrong way — cheaper than trying to
              // untangle the geometry itself.
              const align = Math.cos(heading) * this.tx[i] + Math.sin(heading) * this.ty[i];
              d *= align > 0.2 ? 1 : 4.5;
            }
            if (d < bestD) { bestD = d; best = i; }
          }
        }
      }
    }
    if (best < 0) {
      for (let i = 0; i < this.n; i++) {
        let d = (this.x[i] - x) ** 2 + (this.y[i] - y) ** 2;
        if (heading !== null) {
          const align = Math.cos(heading) * this.tx[i] + Math.sin(heading) * this.ty[i];
          d *= align > 0.2 ? 1 : 4.5;
        }
        if (d < bestD) { bestD = d; best = i; }
      }
    }
    return best;
  }

  /**
   * Localise a world point relative to the track: which node it is closest to,
   * how far along the lap it is, and its signed lateral offset.
   * `hint` restricts the search to a window around a previous result.
   */
  locate(x, y, hint = -1, heading = null) {
    let best = -1;
    let bestD = Infinity;
    if (hint >= 0) {
      // A car covers at most a couple of metres per physics tick, so tracking
      // from the previous node is both cheap and immune to the ambiguity of a
      // circuit that runs back alongside itself.
      const span = 34;
      for (let d = -span; d <= span; d++) {
        const i = (hint + d + this.n * 2) % this.n;
        const dd = (this.x[i] - x) ** 2 + (this.y[i] - y) ** 2;
        if (dd < bestD) { bestD = dd; best = i; }
      }
      // Genuinely lost (respawned, or shoved a long way off) — rescan.
      if (bestD > 120 * 120) best = -1;
    }
    if (best < 0) best = this.nearestIndex(x, y, heading);

    const dx = x - this.x[best];
    const dy = y - this.y[best];
    const along = dx * this.tx[best] + dy * this.ty[best];
    const lateral = dx * this.nx[best] + dy * this.ny[best];
    let s = best * this.ds + along;
    s = ((s % this.length) + this.length) % this.length;
    return { index: best, s, lateral, along };
  }

  posAt(index, lateral = 0) {
    const i = ((index % this.n) + this.n) % this.n;
    return [this.x[i] + this.nx[i] * lateral, this.y[i] + this.ny[i] * lateral];
  }

  /** Signed forward gap in metres from node index `a` to `b` around the lap. */
  forwardGap(sa, sb) {
    let d = sb - sa;
    while (d < -this.length / 2) d += this.length;
    while (d > this.length / 2) d -= this.length;
    return d;
  }

  indexFromS(s) {
    const i = Math.round((((s % this.length) + this.length) % this.length) / this.ds);
    return i % this.n;
  }

  // ---------------------------------------------------------------------
  // Track furniture
  // ---------------------------------------------------------------------

  /**
   * Pushes apart any two stretches of circuit that are more than `sepNodes`
   * apart along the lap but closer than `minDist` in space. Without this a
   * layout that crosses or grazes itself makes the question "where on the lap
   * is this car?" ambiguous, and cars snap onto the wrong piece of track.
   */
  static separate(points, minDist, sepNodes, minRadius) {
    const pts = points.map((p) => p.slice());
    const n = pts.length;
    const cell = minDist;
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    const maxCurv = 1 / minRadius;
    for (let pass = 0; pass < 400; pass++) {
      const grid = new Map();
      for (let i = 0; i < n; i++) {
        const key = `${Math.floor(pts[i][0] / cell)},${Math.floor(pts[i][1] / cell)}`;
        const bucket = grid.get(key);
        if (bucket) bucket.push(i); else grid.set(key, [i]);
      }
      dx.fill(0); dy.fill(0);
      let collisions = 0;
      for (let i = 0; i < n; i++) {
        const gx = Math.floor(pts[i][0] / cell);
        const gy = Math.floor(pts[i][1] / cell);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const bucket = grid.get(`${gx + ox},${gy + oy}`);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j <= i) continue;
              const along = Math.abs(i - j);
              if (Math.min(along, n - along) < sepNodes) continue;
              let vx = pts[j][0] - pts[i][0];
              let vy = pts[j][1] - pts[i][1];
              const d = Math.hypot(vx, vy);
              if (d >= minDist || d < 1e-6) continue;
              const push = (minDist - d) * 0.30;
              vx /= d; vy /= d;
              dx[i] -= vx * push; dy[i] -= vy * push;
              dx[j] += vx * push; dy[j] += vy * push;
              collisions++;
            }
          }
        }
      }
      if (collisions === 0) break;
      for (let i = 0; i < n; i++) { pts[i][0] += dx[i]; pts[i][1] += dy[i]; }
      // Only relieve the kinks the pushes create — smoothing the whole curve
      // every pass would simply undo the separation.
      const curv = curvatureProfile(pts, 2);
      const smoothed = pts.map((p, i) => {
        if (Math.abs(curv[i]) < maxCurv) return p;
        const a = pts[(i - 1 + n) % n];
        const b = pts[(i + 1) % n];
        const w = Math.min(0.3, (Math.abs(curv[i]) / maxCurv - 1) * 0.3);
        return [p[0] + ((a[0] + b[0]) * 0.5 - p[0]) * w,
          p[1] + ((a[1] + b[1]) * 0.5 - p[1]) * w];
      });
      for (let i = 0; i < n; i++) pts[i] = smoothed[i];
    }
    return pts;
  }

  /**
   * Opens out any corner tighter than `minRadius` metres by nudging the
   * offending nodes towards the midpoint of their neighbours. Straights and
   * ordinary corners are untouched.
   */
  static relaxCurvature(points, minRadius) {
    const pts = points.map((p) => p.slice());
    const n = pts.length;
    const maxCurv = 1 / minRadius;
    for (let pass = 0; pass < 240; pass++) {
      const curv = curvatureProfile(pts, 2);
      let worst = 0;
      for (let i = 0; i < n; i++) {
        const excess = Math.abs(curv[i]) - maxCurv;
        if (excess <= 0) continue;
        worst = Math.max(worst, excess);
        const a = pts[(i - 2 + n) % n];
        const b = pts[(i + 2) % n];
        const mx = (a[0] + b[0]) * 0.5;
        const my = (a[1] + b[1]) * 0.5;
        const w = Math.min(0.35, excess / maxCurv * 0.35);
        pts[i][0] += (mx - pts[i][0]) * w;
        pts[i][1] += (my - pts[i][1]) * w;
      }
      if (worst === 0) break;
    }
    return pts;
  }

  /**
   * Replaces each significant vertex of the authored outline with a pair of
   * points `t` either side of it, so the spline runs straight into the corner,
   * turns, and runs straight out again. Shallow kinks are left alone so long
   * sweeping curves stay smooth.
   */
  static sharpenPolygon(pts, t) {
    const n = pts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n];
      const cur = pts[i];
      const next = pts[(i + 1) % n];
      const inX = cur[0] - prev[0];
      const inY = cur[1] - prev[1];
      const outX = next[0] - cur[0];
      const outY = next[1] - cur[1];
      const lenIn = Math.hypot(inX, inY) || 1e-6;
      const lenOut = Math.hypot(outX, outY) || 1e-6;
      const ux = inX / lenIn;
      const uy = inY / lenIn;
      const vx = outX / lenOut;
      const vy = outY / lenOut;
      const turn = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
      if (turn < 0.16) { out.push(cur); continue; }
      const back = Math.min(t, lenIn * 0.42);
      const fwd = Math.min(t, lenOut * 0.42);
      out.push([cur[0] - ux * back, cur[1] - uy * back]);
      out.push([cur[0] + vx * fwd, cur[1] + vy * fwd]);
    }
    return out;
  }

  /**
   * Longest low-curvature run on the circuit, taken about three-quarters of the
   * way along it: that leaves room behind for a twenty-car grid and puts a
   * corner a sensible distance after the line.
   */
  static findStartLine(curv, ds) {
    const n = curv.length;
    const threshold = 0.0022;              // radius of roughly 450 m
    let best = { start: 0, len: 0 };
    let runStart = -1;
    // Walk twice around so a run spanning the array seam is still found whole.
    for (let k = 0; k < n * 2; k++) {
      const i = k % n;
      if (Math.abs(curv[i]) < threshold) {
        if (runStart < 0) runStart = k;
        const len = k - runStart + 1;
        if (len > best.len && len <= n) best = { start: runStart, len };
      } else {
        runStart = -1;
      }
    }
    if (best.len * ds < 120) {
      // Nowhere is truly straight (a tight street circuit): use the flattest point.
      let flattest = 0;
      for (let i = 1; i < n; i++) {
        if (Math.abs(curv[i]) < Math.abs(curv[flattest])) flattest = i;
      }
      return flattest;
    }
    return (best.start + Math.floor(best.len * 0.72)) % n;
  }

  /** Contiguous runs of straight-enough track, longest first. */
  findStraights(minMetres) {
    const n = this.n;
    const threshold = 0.0026;
    const runs = [];
    let runStart = -1;
    for (let k = 0; k < n * 2; k++) {
      const i = k % n;
      const straight = Math.abs(this.curv[i]) < threshold;
      if (straight && runStart < 0) runStart = k;
      if ((!straight || k === n * 2 - 1) && runStart >= 0) {
        const len = k - runStart;
        if (len * this.ds >= minMetres && len <= n) {
          runs.push({ start: runStart % n, len, metres: len * this.ds });
        }
        runStart = -1;
      }
    }
    // Drop duplicates produced by walking round twice.
    const seen = new Set();
    const unique = runs.filter((r) => {
      const key = `${r.start}:${r.len}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    unique.sort((a, b) => b.metres - a.metres);
    return unique;
  }

  /**
   * DRS zones sit on the longest straights, with the detection point placed
   * just before the corner that leads onto each one.
   */
  buildDrsZones() {
    const n = this.n;
    const wanted = Math.min(3, Math.max(1, this.straights.length));
    const zones = [];
    const used = [];
    for (const run of this.straights) {
      if (zones.length >= wanted) break;
      // Keep zones apart so they do not merge into one another.
      if (used.some((u) => Math.abs(this.forwardGap(u * this.ds, run.start * this.ds)) < 400)) continue;
      const pad = Math.round(28 / this.ds);
      const start = (run.start + pad) % n;
      const end = (run.start + run.len - Math.round(35 / this.ds) + n) % n;
      if (((end - start + n) % n) * this.ds < 120) continue;
      zones.push({
        start,
        end,
        detect: (run.start - Math.round(95 / this.ds) + n * 2) % n,
        metres: run.metres,
      });
      used.push(run.start);
    }
    return zones;
  }

  buildBounds() {
    this.leftEdge = [];
    this.rightEdge = [];
    for (let i = 0; i < this.n; i++) {
      this.leftEdge.push([this.x[i] + this.nx[i] * this.half, this.y[i] + this.ny[i] * this.half]);
      this.rightEdge.push([this.x[i] - this.nx[i] * this.half, this.y[i] - this.ny[i] * this.half]);
    }
  }

  /** Contiguous runs of high curvature become kerbs on the inside of the bend. */
  buildKerbs() {
    const runs = [];
    const threshold = 0.006;
    let current = null;
    for (let i = 0; i < this.n; i++) {
      const k = this.curv[i];
      const side = Math.abs(k) > threshold ? Math.sign(k) : 0;
      if (side !== 0) {
        if (current && current.side === side) {
          current.end = i;
        } else {
          if (current) runs.push(current);
          current = { side, start: i, end: i };
        }
      } else if (current) {
        if (current.end - current.start > 3) runs.push(current);
        current = null;
      }
    }
    if (current && current.end - current.start > 3) runs.push(current);
    return runs;
  }

  /**
   * The pit lane is generated as a lateral offset ramp running alongside the
   * main straight: in before the last corner sequence, out after turn one.
   */
  buildPitLane() {
    const n = this.n;
    const side = this.data.pitSide || -1;
    const laneOffset = (this.half + 9) * side;
    const entryLen = Math.min(0.16 * n, 420 / this.ds);
    const exitLen = Math.min(0.16 * n, 460 / this.ds);
    const entryIdx = Math.round((n - entryLen + n) % n);
    const exitIdx = Math.round(exitLen % n);

    const path = [];
    const total = Math.round(entryLen + exitLen);
    for (let k = 0; k <= total; k++) {
      const i = (entryIdx + k) % n;
      let t;
      if (k < entryLen * 0.55) t = k / (entryLen * 0.55);
      else if (k > total - exitLen * 0.55) t = (total - k) / (exitLen * 0.55);
      else t = 1;
      t = clamp(t, 0, 1);
      const smooth = t * t * (3 - 2 * t);
      const off = laneOffset * smooth;
      path.push({ i, off, x: this.x[i] + this.nx[i] * off, y: this.y[i] + this.ny[i] * off });
    }

    this.pit = {
      side,
      entryIdx,
      exitIdx,
      path,
      laneOffset,
      speedLimit: PIT_SPEED_LIMIT,
      boxStart: Math.round(total * 0.34),
      boxSpacing: Math.max(2, Math.round(13 / this.ds)),
      total,
    };
  }

  /** Position and heading of a pit box for a given grid slot (0-based). */
  pitBox(slot) {
    const p = this.pit;
    const idx = clamp(p.boxStart + slot * p.boxSpacing, 0, p.path.length - 1);
    const node = p.path[idx];
    return { x: node.x, y: node.y, heading: this.heading[node.i], pathIndex: idx };
  }

  /** Staggered starting-grid slots behind the start/finish line. */
  gridSlots(count) {
    const slots = [];
    const rowGap = 8.6 / this.ds;
    for (let k = 0; k < count; k++) {
      const idx = ((-6 - k * rowGap) + this.n * 2) % this.n;
      const i = Math.round(idx) % this.n;
      const lat = (k % 2 === 0 ? 1 : -1) * this.half * 0.42;
      const [x, y] = this.posAt(i, lat);
      slots.push({ x, y, heading: this.heading[i], index: i });
    }
    return slots;
  }

  /** True when the given lap distance sits inside an active DRS zone. */
  drsZoneAt(index) {
    for (const z of this.drsZones) {
      if (z.start <= z.end) {
        if (index >= z.start && index <= z.end) return z;
      } else if (index >= z.start || index <= z.end) return z;
    }
    return null;
  }

  detectionPointFor(zone) {
    return zone.detect;
  }

  headingDiff(index, heading) {
    return wrapAngle(heading - this.heading[index % this.n]);
  }
}
